import PaymentSubmission from "../models/PaymentSubmission.js";

import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";
import {registerStudentForEligibleLiveClasses} from "../services/zoomRegistrationService.js";

import {getDriveFileStream} from "../utils/googleDrive.js";

import {processPaymentDecisionSideEffects} from "../services/decisionNotificationService.js";
import {
  approvePaymentAtomically,
  rejectPaymentAtomically,
} from "../services/paymentDecisionService.js";
import {
  enforceSingleMonthlyEnrollmentAccess,
} from "../services/monthlyAccessEnforcementService.js";

export const getMyPaymentSubmissions =
  asyncHandler(async (req, res) => {
    const filter = {
      student: req.user._id,
    };

    if (req.query.courseId) {
      filter.course =
        req.query.courseId;
    }

    const payments =
      await PaymentSubmission.find(
        filter
      )
        .populate(
          "course",
          "title code slug"
        )
        .populate(
          "billingPeriod",
          "label year month"
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      success: true,
      paymentSubmissions: payments,
    });
  });

export const getAllPaymentsAdmin =
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

    if (
      [
        "pending",
        "approved",
        "rejected",
      ].includes(req.query.status)
    ) {
      filter.status =
        req.query.status;
    }

    if (req.query.courseId) {
      filter.course =
        req.query.courseId;
    }

    if (
      req.query.billingPeriodId
    ) {
      filter.billingPeriod =
        req.query.billingPeriodId;
    }

    if (req.query.studentId) {
      filter.student =
        req.query.studentId;
    }

    const [payments, total] =
      await Promise.all([
        PaymentSubmission.find(
          filter
        )
          .populate(
            "student",
            "firstName lastName email mobileNumber nicNumber school"
          )
          .populate(
            "course",
            "title code paymentPlan"
          )
          .populate(
            "billingPeriod",
            "label year month amount currency"
          )
          .populate(
            "reviewedBy",
            "firstName lastName email"
          )
          .sort({
            createdAt: -1,
          })
          .skip(
            (page - 1) * limit
          )
          .limit(limit),

        PaymentSubmission.countDocuments(
          filter
        ),
      ]);

    res.status(200).json({
      success: true,
      paymentSubmissions: payments,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalPayments: total,
        totalPages: Math.ceil(
          total / limit
        ),
      },
    });
  });

export const getPaymentAdmin =
  asyncHandler(async (req, res) => {
    const payment = await PaymentSubmission.findById(req.params.id)
        .populate(
          "student",
          "firstName lastName email mobileNumber nicNumber school"
        )
        .populate("course")
        .populate("billingPeriod")
        .populate(
          "reviewedBy",
          "firstName lastName email"
        );

    if (!payment) {
      throw new HttpError(
        404,
        "Payment submission not found."
      );
    }

    res.status(200).json({
      success: true,
      paymentSubmission: payment,
    });
  });

export const viewPaymentSlip =
  asyncHandler(async (req, res) => {
    const payment =
      await PaymentSubmission.findById(
        req.params.id
      ).select("+driveFileId");

    if (!payment) {
      throw new HttpError(
        404,
        "Payment submission not found."
      );
    }

    const { metadata, stream } =
      await getDriveFileStream(
        payment.driveFileId
      );

    const safeName = String(
      metadata.name ||
        payment.originalFileName ||
        "payment-slip"
    ).replace(/["\r\n]/g, "_");

    res.setHeader(
      "Content-Type",
      metadata.mimeType ||
        payment.mimeType
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeName}"`
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store"
    );

    if (metadata.size) {
      res.setHeader(
        "Content-Length",
        metadata.size
      );
    }

    stream.on("error", (error) => {
      console.error(
        "Drive stream failed:",
        error.message
      );

      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          message:
            "Payment slip could not be loaded.",
        });
      } else {
        res.destroy(error);
      }
    });

    stream.pipe(res);
  });

export const approvePayment =
  asyncHandler(async (req, res) => {
    const decision = await approvePaymentAtomically({
      paymentId: req.params.id,
      administratorId: req.user._id,
      reviewNote:
        typeof req.body.reviewNote === "string"
          ? req.body.reviewNote.trim()
          : "",
    });
    const { payment, enrollment } = decision;

    if (decision.alreadyApproved) {
      return res.status(200).json({
        success: true,
        message:
          "Payment was already approved.",
        paymentSubmission: payment,
      });
    }

    let monthlyAccessEnforcement = null;

    if (payment.paymentPlan === "monthly") {
      try {
        monthlyAccessEnforcement = await enforceSingleMonthlyEnrollmentAccess({
          enrollmentId: payment.enrollment,
          source: "payment-approval",
        });
      } catch (error) {
        console.error(
          "Monthly access enforcement failed after payment approval:",
          error.message
        );
      }
    }

    const zoomRegistrationSync = monthlyAccessEnforcement?.suspended
      ? {
          queued: false,
          message: "Zoom registration was not queued because a newer monthly payment is required.",
        }
      : {
          queued: true,
          message: "Eligible Zoom registrations are being synchronized in the background.",
        };

    if (zoomRegistrationSync.queued) {
      setImmediate(() => {
        void registerStudentForEligibleLiveClasses({
          studentId: payment.student,
          courseId: payment.course,
          billingPeriodId:
            payment.paymentPlan === "monthly" ? payment.billingPeriod : null,
        }).catch((error) => {
          console.error(
            "Zoom registration sync failed after payment approval:",
            error.message
          );
        });
      });
    }

let notificationResult = { success: false };

  try {
    notificationResult = await processPaymentDecisionSideEffects({
      req,
      paymentId: payment._id,
      decision: "approved",
    });
  } catch (error) {
    console.error(
      "Payment approval notification processing failed:",
      error.message
    );
  }

  res.status(200).json({
      success: true,

      message:
        monthlyAccessEnforcement?.suspended
          ? "Payment approved, but a newer monthly payment is required to restore course access."
          : "Payment approved and course access granted.",

      paymentSubmission: payment,
      enrollment,

      zoomRegistrationSync,
      monthlyAccessEnforcement,
      notifications: {
        processed: Boolean(notificationResult?.success),
      },
    });
  });

export const rejectPayment =
  asyncHandler(async (req, res) => {
    const reviewNote =
      typeof req.body.reviewNote === "string"
        ? req.body.reviewNote.trim()
        : "";

    if (!reviewNote) {
      throw new HttpError(400, "A rejection reason is required.");
    }

    const decision = await rejectPaymentAtomically({
      paymentId: req.params.id,
      administratorId: req.user._id,
      reviewNote,
    });
    const { payment } = decision;

    if (decision.alreadyRejected) {
      return res.status(200).json({
        success: true,
        message:
          "Payment was already rejected.",
        paymentSubmission: payment,
      });
    }

    const rejectionReason = payment.reviewNote;
    let notificationResult = { success: false };
    let monthlyAccessEnforcement = null;

    if (payment.paymentPlan === "monthly") {
      try {
        monthlyAccessEnforcement = await enforceSingleMonthlyEnrollmentAccess({
          enrollmentId: payment.enrollment,
          source: "payment-rejection",
        });
      } catch (error) {
        console.error(
          "Monthly access enforcement failed after payment rejection:",
          error.message
        );
      }
    }

    try {
      notificationResult = await processPaymentDecisionSideEffects({
        req,
        paymentId: payment._id,
        decision: "rejected",
        reason: rejectionReason,
      });
    } catch (error) {
      console.error(
        "Payment rejection notification processing failed:",
        error.message
      );
    }

    res.status(200).json({
      success: true,
      message:
        "Payment rejected. The student may upload another slip.",
      paymentSubmission: payment,

      notifications: {
        processed: Boolean(notificationResult?.success),
      },
      monthlyAccessEnforcement,
    });
  });
