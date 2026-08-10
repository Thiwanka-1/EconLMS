import Enrollment from "../models/Enrollment.js";
import LiveClass from "../models/LiveClass.js";
import User from "../models/User.js";
import ZoomRegistration from "../models/ZoomRegistration.js";

import {
  addZoomMeetingRegistrant,
  approveZoomMeetingRegistrant,
  deleteZoomMeetingRegistrant,
  findZoomRegistrantByEmail,
  getZoomMeeting,
  getZoomMeetingRegistrant,
} from "../utils/zoom.js";

import {
  getZoomMeetingSecurityIssues,
} from "../utils/zoomMeetingSecurity.js";

import {
  decryptText,
  encryptText,
} from "../utils/encryption.js";

import HttpError from "../utils/HttpError.js";
import { getStudentCourseAccess } from "../utils/courseAccess.js";

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

const verifySecureZoomMeeting = async (
  meetingId
) => {
  const zoomMeeting =
    await getZoomMeeting(meetingId);

  const securityIssues =
    getZoomMeetingSecurityIssues(
      zoomMeeting
    );

  if (securityIssues.length > 0) {
    throw new HttpError(
      400,
      `The Zoom meeting is not secure enough for EconLMS. ${securityIssues.join(
        " "
      )}`
    );
  }

  return zoomMeeting;
};

export const checkStudentLiveClassAccess =
  async ({
    studentId,
    liveClass,
    now = null,
  }) => {
    const courseId =
      getDocumentId(liveClass.course);

    return getStudentCourseAccess({
      studentId,
      course: {
        _id: courseId,
        paymentPlan: liveClass.paymentPlan,
      },
      billingPeriod: liveClass.billingPeriod,
      now,
    });
  };

export const ensureStudentZoomRegistration =
  async ({
    student: studentValue,
    liveClass: liveClassValue,
    securityVerified = false,
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

    if (!securityVerified) {
      await verifySecureZoomMeeting(
        liveClass.zoomMeetingId
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
        zoomRegistrant &&
        !zoomRegistrant.join_url
      ) {
        const registrantId =
          zoomRegistrant.registrant_id ||
          zoomRegistrant.id;

        if (registrantId) {
          if (
            zoomRegistrant.status ===
            "pending"
          ) {
            await approveZoomMeetingRegistrant({
              meetingId:
                liveClass.zoomMeetingId,
              registrantId,
              email: student.zoomEmail,
            });
          }

          zoomRegistrant =
            await getZoomMeetingRegistrant({
              meetingId:
                liveClass.zoomMeetingId,
              registrantId,
            });
        }
      }

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
      registration.revocationRequired = false;

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
  async (
    liveClassValue,
    { securityVerified = false } = {}
  ) => {
    const liveClass = await getLiveClassWithMeetingId(liveClassValue);

    if (!liveClass) {
      throw new HttpError(404, "Live class not found.");
    }

    if (!liveClass.zoomMeetingId) {
      throw new HttpError(500, "The live class does not have a Zoom meeting ID.");
    }

    if (!securityVerified) {
      await verifySecureZoomMeeting(
        liveClass.zoomMeetingId
      );
    }

    const enrollmentFilter = {
      course: liveClass.course,
      status: "active",
    };

    if (
      liveClass.paymentPlan !==
      "monthly"
    ) {
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
            securityVerified: true,
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

const revokeZoomRegistration = async (
  registration
) => {
  let registrantId =
    registration.zoomRegistrantId;

  if (!registrantId) {
    let zoomRegistrant = null;

    try {
      zoomRegistrant =
        await findZoomRegistrantByEmail({
          meetingId:
            registration.zoomMeetingId,
          email: registration.zoomEmail,
        });
    } catch (error) {
      if (error?.status !== 404) {
        throw error;
      }
    }

    registrantId =
      zoomRegistrant?.registrant_id ||
      zoomRegistrant?.id ||
      null;
  }

  if (registrantId) {
    try {
      await deleteZoomMeetingRegistrant({
        meetingId:
          registration.zoomMeetingId,
        registrantId,
      });
    } catch (error) {
      if (error?.status !== 404) {
        throw error;
      }
    }
  }

  registration.status = "cancelled";
  registration.encryptedJoinUrl = null;
  registration.lastError = "";
  registration.revocationRequired = false;

  await registration.save();
};

export const revokeZoomRegistrations =
  async ({
    studentId,
    courseId,
    liveClassId,
  }) => {
    if (
      !studentId &&
      !courseId &&
      !liveClassId
    ) {
      throw new Error(
        "A student, course or live class is required to revoke Zoom registrations."
      );
    }

    const filter = {
      status: {
        $ne: "cancelled",
      },
    };

    if (studentId) {
      filter.student = studentId;
    }

    if (courseId) {
      filter.course = courseId;
    }

    if (liveClassId) {
      filter.liveClass = liveClassId;
    }

    const registrations =
      await ZoomRegistration.find(
        filter
      ).select(
        "+zoomMeetingId +encryptedJoinUrl"
      );

    let successCount = 0;
    let failureCount = 0;

    const failures = [];

    for (const registration of registrations) {
      try {
        await revokeZoomRegistration(
          registration
        );

        successCount += 1;
      } catch (error) {
        failureCount += 1;

        registration.lastError = String(
          error.message ||
            "Zoom access revocation failed."
        ).slice(0, 1000);
        registration.revocationRequired = true;

        await registration
          .save()
          .catch(() => {});

        failures.push({
          registrationId:
            registration._id,
          studentId:
            registration.student,
          error: error.message,
        });
      }
    }

    return {
      success: failureCount === 0,
      successCount,
      failureCount,
      failures,
    };
  };

export const retryPendingZoomRegistrations = async ({ limit = 20 } = {}) => {
  const retryBefore = new Date(Date.now() - 10 * 60 * 1000);
  const maxAttempts = Math.max(
    Number.parseInt(process.env.ZOOM_REGISTRATION_MAX_ATTEMPTS || "10", 10) || 10,
    1
  );

  const registrations = await ZoomRegistration.find({
    status: { $in: ["pending", "failed"] },
    revocationRequired: { $ne: true },
    attempts: { $lt: maxAttempts },
    $or: [
      { lastAttemptAt: null },
      { lastAttemptAt: { $lte: retryBefore } },
    ],
  })
    .sort({ lastAttemptAt: 1 })
    .limit(limit);

  const summary = { attempted: 0, succeeded: 0, failed: 0, skipped: 0 };

  for (const registration of registrations) {
    const [student, liveClass] = await Promise.all([
      User.findById(registration.student),
      LiveClass.findById(registration.liveClass),
    ]);

    if (
      !student?.isActive ||
      !liveClass ||
      !liveClass.isPublished ||
      liveClass.status !== "scheduled"
    ) {
      registration.status = "cancelled";
      registration.encryptedJoinUrl = null;
      registration.lastError = "Registration is no longer eligible for retry.";
      await registration.save();
      summary.skipped += 1;
      continue;
    }

    summary.attempted += 1;

    try {
      await ensureStudentZoomRegistration({ student, liveClass });
      summary.succeeded += 1;
    } catch {
      summary.failed += 1;
    }
  }

  return summary;
};

export const retryPendingZoomRevocations = async ({ limit = 20 } = {}) => {
  const registrations = await ZoomRegistration.find({
    revocationRequired: true,
  })
    .select("+zoomMeetingId +encryptedJoinUrl")
    .sort({ updatedAt: 1 })
    .limit(limit);
  const summary = { attempted: 0, succeeded: 0, failed: 0 };

  for (const registration of registrations) {
    summary.attempted += 1;

    try {
      await revokeZoomRegistration(registration);
      summary.succeeded += 1;
    } catch (error) {
      registration.lastError = String(
        error.message || "Zoom access revocation failed."
      ).slice(0, 1000);
      registration.revocationRequired = true;
      await registration.save().catch(() => {});
      summary.failed += 1;
    }
  }

  return summary;
};
