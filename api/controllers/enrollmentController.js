import Course from "../models/Course.js";
import BillingPeriod from "../models/BillingPeriod.js";
import Enrollment from "../models/Enrollment.js";
import PaymentSubmission from "../models/PaymentSubmission.js";

import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";
import {
  getOrCreateCurrentBillingPeriod,
} from "../utils/billingPeriod.js";

import {
  deleteDriveFile,
  uploadPaymentSlipToDrive,
} from "../utils/googleDrive.js";

const getOrCreateEnrollment = async ({
  student,
  course,
}) => {
  let enrollment =
    await Enrollment.findOne({
      student,
      course: course._id,
    });

  if (enrollment) {
    return enrollment;
  }

  try {
    enrollment =
      await Enrollment.create({
        student,
        course: course._id,
        paymentPlan:
          course.paymentPlan,
        status: "pending",
      });

    return enrollment;
  } catch (error) {
    if (error.code === 11000) {
      return Enrollment.findOne({
        student,
        course: course._id,
      });
    }

    throw error;
  }
};

const hasBillingPeriodAccess = (
  enrollment,
  billingPeriodId
) => {
  return enrollment.approvedBillingPeriods.some(
    (periodId) =>
      periodId.toString() ===
      billingPeriodId.toString()
  );
};

export const submitPaymentSlip =
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new HttpError(
        400,
        "Payment slip file is required."
      );
    }

    const course =
      await Course.findById(
        req.params.courseId
      );

    if (
      !course ||
      course.isArchived ||
      !course.isPublished
    ) {
      throw new HttpError(
        404,
        "Course is not available."
      );
    }

    if (!course.isEnrollmentOpen) {
      throw new HttpError(
        400,
        "Course enrolment is currently closed."
      );
    }

    let billingPeriod = null;

    if (course.paymentPlan === "monthly") {
  billingPeriod =
    await getOrCreateCurrentBillingPeriod(
      course
    );

  if (
    !billingPeriod.isPublished ||
    !billingPeriod.isPaymentOpen ||
    billingPeriod.isArchived
  ) {
    throw new HttpError(
      400,
      "Payments are currently closed for this month."
    );
  }

  const now = new Date();

  if (
    billingPeriod.paymentDeadline &&
    now > billingPeriod.paymentDeadline
  ) {
    throw new HttpError(
      400,
      "The payment deadline for this month has passed."
    );
  }
} else if (req.body.billingPeriodId) {
  throw new HttpError(
    400,
    "A billing period must not be supplied for a one-time course."
  );
}

    const enrollment =
      await getOrCreateEnrollment({
        student: req.user._id,
        course,
      });

    if (
      enrollment.status ===
        "suspended" ||
      enrollment.status ===
        "cancelled"
    ) {
      throw new HttpError(
        403,
        "This course enrolment cannot accept payments."
      );
    }

    if (
      course.paymentPlan ===
        "one_time" &&
      enrollment.oneTimeAccessGrantedAt
    ) {
      throw new HttpError(
        409,
        "You already have access to this course."
      );
    }

    if (
      billingPeriod &&
      hasBillingPeriodAccess(
        enrollment,
        billingPeriod._id
      )
    ) {
      throw new HttpError(
        409,
        "You already have access to this billing period."
      );
    }

    const targetQuery = {
      student: req.user._id,
      course: course._id,
      billingPeriod:
        billingPeriod?._id || null,
    };

    const pendingSubmission =
      await PaymentSubmission.findOne({
        ...targetQuery,
        status: "pending",
      });

    if (pendingSubmission) {
      throw new HttpError(
        409,
        "A payment submission is already pending for this course period."
      );
    }

    const previousAttempts =
      await PaymentSubmission.countDocuments(
        targetQuery
      );

    let uploadedDriveFile;

    try {
      uploadedDriveFile =
        await uploadPaymentSlipToDrive({
          file: req.file,
          student: req.user,
          course,
          billingPeriod,
        });

      const paymentSubmission =
        await PaymentSubmission.create({
          student: req.user._id,
          course: course._id,
          enrollment:
            enrollment._id,

          billingPeriod:
            billingPeriod?._id || null,

          paymentPlan:
            course.paymentPlan,

          expectedAmount:
            billingPeriod
              ? billingPeriod.amount
              : course.price,

          currency:
            billingPeriod
              ? billingPeriod.currency
              : course.currency,

          attemptNumber:
            previousAttempts + 1,

          driveFileId:
            uploadedDriveFile.id,

          driveParentFolderId:
            uploadedDriveFile.parentFolderId,

          storedFileName:
            uploadedDriveFile.name,

          originalFileName:
            req.file.originalname,

          mimeType:
            uploadedDriveFile.mimeType ||
            req.file.mimetype,

          sizeBytes: Number(
            uploadedDriveFile.size ||
              req.file.size
          ),

          status: "pending",
        });

      res.status(201).json({
        success: true,
        message:
          "Payment slip uploaded. Administrator approval is pending.",
        enrollment,
        paymentSubmission,
      });
    } catch (error) {
      if (uploadedDriveFile?.id) {
        try {
          await deleteDriveFile(
            uploadedDriveFile.id
          );
        } catch (cleanupError) {
          console.error(
            "Failed to remove orphaned Drive file:",
            cleanupError.message
          );
        }
      }

      if (error.code === 11000) {
        throw new HttpError(
          409,
          "A payment submission is already pending."
        );
      }

      throw error;
    }
  });

export const getMyEnrollments =
  asyncHandler(async (req, res) => {
    const [enrollments, payments] =
      await Promise.all([
        Enrollment.find({
          student: req.user._id,
        })
          .populate(
            "course",
            [
              "title",
              "slug",
              "code",
              "subject",
              "academicLevel",
              "paymentPlan",
              "price",
              "currency",
              "thumbnailUrl",
              "weeklySchedule",
              "isPublished",
              "isArchived",
            ].join(" ")
          )
          .populate(
            "approvedBillingPeriods",
            "label year month accessStartsAt accessEndsAt"
          )
          .sort({
            createdAt: -1,
          }),

        PaymentSubmission.find({
          student: req.user._id,
        })
          .populate(
            "course",
            "title slug code"
          )
          .populate(
            "billingPeriod",
            "label year month"
          )
          .sort({
            createdAt: -1,
          }),
      ]);

    res.status(200).json({
      success: true,
      enrollments,
      paymentSubmissions: payments,
    });
  });

export const getMyCourseEnrollment =
  asyncHandler(async (req, res) => {
    const enrollment =
      await Enrollment.findOne({
        student: req.user._id,
        course: req.params.courseId,
      })
        .populate("course")
        .populate(
          "approvedBillingPeriods"
        );

    if (!enrollment) {
      throw new HttpError(
        404,
        "Course enrolment not found."
      );
    }

    const payments =
      await PaymentSubmission.find({
        student: req.user._id,
        course: req.params.courseId,
      })
        .populate(
          "billingPeriod",
          "label year month"
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      success: true,
      enrollment,
      paymentSubmissions: payments,
    });
  });

export const getAllEnrollmentsAdmin =
  asyncHandler(async (req, res) => {
    const page = Math.max(
      Number.parseInt(
        req.query.page,
        10
      ) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(
          req.query.limit,
          10
        ) || 20,
        1
      ),
      100
    );

    const filter = {};

    if (req.query.courseId) {
      filter.course =
        req.query.courseId;
    }

    if (
      [
        "pending",
        "active",
        "suspended",
        "cancelled",
      ].includes(req.query.status)
    ) {
      filter.status =
        req.query.status;
    }

    const [enrollments, total] =
      await Promise.all([
        Enrollment.find(filter)
          .populate(
            "student",
            "firstName lastName email mobileNumber nicNumber school"
          )
          .populate(
            "course",
            "title code paymentPlan"
          )
          .populate(
            "approvedBillingPeriods",
            "label year month"
          )
          .sort({
            createdAt: -1,
          })
          .skip(
            (page - 1) * limit
          )
          .limit(limit),

        Enrollment.countDocuments(
          filter
        ),
      ]);

    res.status(200).json({
      success: true,
      enrollments,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalEnrollments: total,
        totalPages: Math.ceil(
          total / limit
        ),
      },
    });
  });

export const setEnrollmentStatus =
  asyncHandler(async (req, res) => {
    const allowedStatuses = [
      "active",
      "suspended",
      "cancelled",
    ];

    const { status, reason } =
      req.body;

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      throw new HttpError(
        400,
        "Status must be active, suspended or cancelled."
      );
    }

    const enrollment =
      await Enrollment.findById(
        req.params.id
      );

    if (!enrollment) {
      throw new HttpError(
        404,
        "Enrolment not found."
      );
    }

    const hasAnyAccess =
      Boolean(
        enrollment
          .oneTimeAccessGrantedAt
      ) ||
      enrollment
        .approvedBillingPeriods
        .length > 0;

    if (
      status === "active" &&
      !hasAnyAccess
    ) {
      throw new HttpError(
        400,
        "An enrolment without approved payment access cannot be activated."
      );
    }

    enrollment.status = status;
    enrollment.statusReason =
      reason || "";
    enrollment.managedBy =
      req.user._id;

    await enrollment.save();

    res.status(200).json({
      success: true,
      message:
        "Enrolment status updated.",
      enrollment,
    });
  });

  export const getMyCourseAccess =
  asyncHandler(async (req, res) => {
    const course = await Course.findById(
      req.params.courseId
    );

    if (
      !course ||
      !course.isPublished ||
      course.isArchived
    ) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    const enrollment =
      await Enrollment.findOne({
        student: req.user._id,
        course: course._id,
      });

    if (!enrollment) {
      return res.status(200).json({
        success: true,
        hasAccess: false,
        reason:
          "You are not enrolled in this course.",
        enrollmentStatus: "not_enrolled",
        requiredBillingPeriod: null,
      });
    }

    if (enrollment.status !== "active") {
      return res.status(200).json({
        success: true,
        hasAccess: false,
        reason: `Enrollment status is ${enrollment.status}.`,
        enrollmentStatus:
          enrollment.status,
        requiredBillingPeriod: null,
      });
    }

    if (
      course.paymentPlan === "one_time"
    ) {
      const hasAccess = Boolean(
        enrollment.oneTimeAccessGrantedAt
      );

      return res.status(200).json({
        success: true,
        hasAccess,
        reason: hasAccess
          ? "One-time course access is active."
          : "One-time payment has not been approved.",
        enrollmentStatus:
          enrollment.status,
        requiredBillingPeriod: null,
      });
    }

    const currentBillingPeriod =
      await getOrCreateCurrentBillingPeriod(
        course
      );

    const hasCurrentMonthApproval =
      enrollment.approvedBillingPeriods.some(
        (periodId) =>
          periodId.toString() ===
          currentBillingPeriod._id.toString()
      );

    res.status(200).json({
      success: true,
      hasAccess:
        hasCurrentMonthApproval,

      reason: hasCurrentMonthApproval
        ? `Access approved for ${currentBillingPeriod.label}.`
        : `Payment approval is required for ${currentBillingPeriod.label}.`,

      enrollmentStatus:
        enrollment.status,

      requiredBillingPeriod:
        currentBillingPeriod,
    });
  });