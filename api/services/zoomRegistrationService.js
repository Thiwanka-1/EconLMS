import Enrollment from "../models/Enrollment.js";
import LiveClass from "../models/LiveClass.js";
import User from "../models/User.js";
import ZoomRegistration from "../models/ZoomRegistration.js";

import {
  addZoomMeetingRegistrant,
  findZoomRegistrantByEmail,
} from "../utils/zoom.js";

import {
  decryptText,
  encryptText,
} from "../utils/encryption.js";

import HttpError from "../utils/HttpError.js";

const getDocumentId = (value) => {
  return value?._id?.toString() || value?.toString() || null;
};

const getLiveClassWithMeetingId = async (liveClassValue) => {
  const liveClassId = getDocumentId(liveClassValue);

  if (!liveClassId) {
    return null;
  }

  return LiveClass.findById(liveClassId).select("+zoomMeetingId");
};

export const checkStudentLiveClassAccess =
  async ({
    studentId,
    liveClass,
  }) => {
    const courseId =
      getDocumentId(liveClass.course);

    const enrollment =
      await Enrollment.findOne({
        student: studentId,
        course: courseId,
      });

    if (!enrollment) {
      return {
        hasAccess: false,
        reason:
          "You are not enrolled in this course.",
        enrollment: null,
      };
    }

    if (enrollment.status !== "active") {
      return {
        hasAccess: false,
        reason: `Your enrolment is ${enrollment.status}.`,
        enrollment,
      };
    }

    if (
      liveClass.paymentPlan ===
      "one_time"
    ) {
      const hasAccess = Boolean(
        enrollment.oneTimeAccessGrantedAt
      );

      return {
        hasAccess,
        reason: hasAccess
          ? "Course access is active."
          : "The course payment has not been approved.",
        enrollment,
      };
    }

    const billingPeriodId = getDocumentId(liveClass.billingPeriod);

    if (!billingPeriodId) {
      return {
        hasAccess: false,
        reason: "This monthly live class does not have a billing period.",
        enrollment,
      };
    }

    const approved =
      enrollment.approvedBillingPeriods.some(
        (period) =>
          getDocumentId(period) ===
          billingPeriodId
      );

    return {
      hasAccess: approved,

      reason: approved
        ? "Payment access is approved for this live class."
        : "Payment approval is required for this live class.",

      enrollment,
    };
  };

export const ensureStudentZoomRegistration =
  async ({
    student: studentValue,
    liveClass: liveClassValue,
  }) => {
    const student =
      typeof studentValue === "object" &&
      studentValue._id
        ? studentValue
        : await User.findById(
            studentValue
          );

    const liveClass = await getLiveClassWithMeetingId(liveClassValue);

    if (!student || !student.isActive) {
      throw new HttpError(
        404,
        "Active student account not found."
      );
    }

    if (!liveClass) {
      throw new HttpError(404, "Live class not found.");
    }

    if (!liveClass.zoomMeetingId) {
      throw new HttpError(500, "The live class does not have a Zoom meeting ID.");
    }

    if (!student.zoomEmail) {
      throw new HttpError(
        400,
        "The student does not have a Zoom email address."
      );
    }

    const access =
      await checkStudentLiveClassAccess({
        studentId: student._id,
        liveClass,
      });

    if (!access.hasAccess) {
      throw new HttpError(
        403,
        access.reason
      );
    }

    let registration =
      await ZoomRegistration.findOne({
        liveClass: liveClass._id,
        student: student._id,
      }).select("+encryptedJoinUrl");

    if (
      registration?.status ===
        "registered" &&
      registration.encryptedJoinUrl
    ) {
      return registration;
    }

    if (!registration) {
      registration = await ZoomRegistration.findOneAndUpdate(
        {
          liveClass: liveClass._id,
          student: student._id,
        },
        {
          $setOnInsert: {
            liveClass: liveClass._id,
            course: liveClass.course,
            billingPeriod: liveClass.billingPeriod || null,
            student: student._id,
            zoomMeetingId: liveClass.zoomMeetingId,
            zoomEmail: student.zoomEmail,
            status: "pending",
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      ).select("+encryptedJoinUrl");
    }

    registration.attempts += 1;
    registration.lastAttemptAt =
      new Date();
    registration.lastError = "";
    registration.status = "pending";

    await registration.save();

    try {
      /*
       * This handles cases where Zoom registration
       * succeeded but saving to MongoDB previously
       * failed.
       */
      let zoomRegistrant =
        await findZoomRegistrantByEmail({
          meetingId:
            liveClass.zoomMeetingId,

          email: student.zoomEmail,
        });

      if (
        !zoomRegistrant?.join_url
      ) {
        zoomRegistrant =
          await addZoomMeetingRegistrant({
            meetingId:
              liveClass.zoomMeetingId,

            email:
              student.zoomEmail,

            firstName:
              student.firstName,

            lastName:
              student.lastName,

            phone:
              student.mobileNumber,
          });
      }

      if (
        !zoomRegistrant?.join_url
      ) {
        throw new Error(
          "Zoom did not return a unique join URL."
        );
      }

      registration.zoomRegistrantId =
        zoomRegistrant.registrant_id ||
        zoomRegistrant.id ||
        null;

      registration.encryptedJoinUrl =
        encryptText(
          zoomRegistrant.join_url
        );

      registration.zoomEmail =
        student.zoomEmail;

      registration.status =
        "registered";

      registration.registeredAt =
        new Date();

      registration.lastError = "";

      await registration.save();

      return registration;
    } catch (error) {
      registration.status = "failed";

      registration.lastError =
        String(
          error.message ||
            "Zoom registration failed."
        ).slice(0, 1000);

      await registration.save();

      throw error;
    }
  };

export const getDecryptedJoinUrl = (
  registration
) => {
  if (
    !registration?.encryptedJoinUrl
  ) {
    return null;
  }

  return decryptText(
    registration.encryptedJoinUrl
  );
};

export const syncLiveClassRegistrations =
  async (liveClassValue) => {
    const liveClass = await getLiveClassWithMeetingId(liveClassValue);

    if (!liveClass) {
      throw new HttpError(404, "Live class not found.");
    }

    if (!liveClass.zoomMeetingId) {
      throw new HttpError(500, "The live class does not have a Zoom meeting ID.");
    }

    const enrollmentFilter = {
      course: liveClass.course,
      status: "active",
    };

    if (
      liveClass.paymentPlan ===
      "monthly"
    ) {
      enrollmentFilter
        .approvedBillingPeriods =
        liveClass.billingPeriod;
    } else {
      enrollmentFilter
        .oneTimeAccessGrantedAt = {
        $ne: null,
      };
    }

    const enrollments =
      await Enrollment.find(
        enrollmentFilter
      ).populate(
        "student",
        "firstName lastName zoomEmail mobileNumber isActive role"
      );

    let successCount = 0;
    let failureCount = 0;

    const failures = [];

    for (const enrollment of enrollments) {
      const student =
        enrollment.student;

      if (
        !student ||
        !student.isActive ||
        student.role !== "student"
      ) {
        continue;
      }

      try {
        await ensureStudentZoomRegistration(
          {
            student,
            liveClass,
          }
        );

        successCount += 1;
      } catch (error) {
        failureCount += 1;

        failures.push({
          studentId: student._id,
          email: student.zoomEmail,
          error: error.message,
        });
      }
    }

    return {
      success:
        failureCount === 0,

      successCount,
      failureCount,
      failures,
    };
  };

export const registerStudentForEligibleLiveClasses =
  async ({
    studentId,
    courseId,
    billingPeriodId = null,
  }) => {
    const filter = {
      course: courseId,
      status: "scheduled",
      isPublished: true,

      startTime: {
        $gte: new Date(
          Date.now() -
            24 * 60 * 60 * 1000
        ),
      },
    };

    if (billingPeriodId) {
      filter.billingPeriod =
        billingPeriodId;
    } else {
      filter.paymentPlan =
        "one_time";
    }

    const liveClasses =
      await LiveClass.find(
        filter
      ).select("+zoomMeetingId");

    const student =
      await User.findById(studentId);

    let successCount = 0;
    let failureCount = 0;

    const failures = [];

    for (const liveClass of liveClasses) {
      try {
        await ensureStudentZoomRegistration(
          {
            student,
            liveClass,
          }
        );

        successCount += 1;
      } catch (error) {
        failureCount += 1;

        failures.push({
          liveClassId: liveClass._id,
          error: error.message,
        });
      }
    }

    return {
      success:
        failureCount === 0,

      successCount,
      failureCount,
      failures,
    };
  };