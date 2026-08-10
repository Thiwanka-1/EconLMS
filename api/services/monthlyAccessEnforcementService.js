import BillingPeriod from "../models/BillingPeriod.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import PaymentSubmission from "../models/PaymentSubmission.js";

import {
  getBillingReferenceDate,
  getCurrentMonthCycle,
  getOrCreateCurrentBillingPeriod,
  getPreviousMonthCycle,
} from "../utils/billingPeriod.js";
import { createCourseAccessSuspendedEmail } from "../utils/emailTemplates.js";
import {
  evaluateMonthlyAccessEvidence,
  getMonthlyEnrollmentAccess,
  hasApprovedBillingPeriod,
} from "./monthlyAccessPolicyService.js";
import { createUserNotification } from "./notificationService.js";
import { revokeZoomRegistrations } from "./zoomRegistrationService.js";

const queueZoomRevocation = ({ studentId, courseId }) => {
  setImmediate(() => {
    void revokeZoomRegistrations({ studentId, courseId }).catch((error) => {
      console.error(
        "[MONTHLY_ACCESS] Zoom revocation failed after suspension:",
        error.message
      );
    });
  });
};

const suspendEnrollment = async ({
  enrollment,
  course,
  currentBillingPeriod,
  source,
}) => {
  const reason = `Payment for ${currentBillingPeriod.label} was not approved by the end of the monthly grace period.`;

  const updated = await Enrollment.findOneAndUpdate(
    { _id: enrollment._id, status: "active" },
    {
      $set: {
        status: "suspended",
        statusReason: reason,
        managedBy: null,
      },
    },
    { returnDocument: "after", runValidators: true }
  );

  if (!updated) {
    return false;
  }

  queueZoomRevocation({
    studentId: updated.student,
    courseId: updated.course,
  });

  if (enrollment.student?._id && enrollment.student.isActive) {
    try {
      const actionUrl = "/student/payments";

      await createUserNotification({
        recipient: enrollment.student,
        type: "course_access_suspended",
        title: "Course access suspended",
        message: `${course.title} access was suspended because payment for ${currentBillingPeriod.label} was not approved by the grace deadline.`,
        actionUrl,
        data: {
          courseId: course._id,
          billingPeriodId: currentBillingPeriod._id,
          source,
        },
        deduplicationKey: `monthly-access-suspended/${updated._id}/${currentBillingPeriod._id}`,
        emailTemplate: createCourseAccessSuspendedEmail({
          student: enrollment.student,
          courseTitle: course.title,
          periodLabel: currentBillingPeriod.label,
          actionUrl,
        }),
      });
    } catch (error) {
      console.error(
        "[MONTHLY_ACCESS] Suspension notification failed:",
        error.message
      );
    }
  }

  return true;
};

export const enforceSingleMonthlyEnrollmentAccess = async ({
  enrollmentId,
  now = null,
  source = "payment-review",
}) => {
  const enrollment = await Enrollment.findById(enrollmentId)
    .populate("student", "firstName lastName email isActive")
    .populate("course", "title paymentPlan price currency createdBy updatedBy");

  if (
    !enrollment ||
    enrollment.status !== "active" ||
    enrollment.paymentPlan !== "monthly" ||
    !enrollment.course
  ) {
    return { checked: Boolean(enrollment), suspended: false };
  }

  const access = await getMonthlyEnrollmentAccess({
    enrollment,
    course: enrollment.course,
    now,
  });

  if (access.hasCurrentStanding) {
    return { checked: true, suspended: false, source: access.source };
  }

  const suspended = await suspendEnrollment({
    enrollment,
    course: enrollment.course,
    currentBillingPeriod: access.currentBillingPeriod,
    source,
  });

  return { checked: true, suspended, source: access.source };
};

export const enforceMonthlyEnrollmentAccess = async ({
  now = null,
  source = "scheduled",
} = {}) => {
  const referenceDate = getBillingReferenceDate(now);
  const currentCycle = getCurrentMonthCycle(referenceDate);
  const previousCycle = getPreviousMonthCycle(referenceDate);
  const courses = await Course.find({
    paymentPlan: "monthly",
    isPublished: true,
    isArchived: false,
  }).select("title price currency createdBy updatedBy paymentPlan");

  const summary = {
    source,
    courses: courses.length,
    checked: 0,
    suspended: 0,
    failed: 0,
  };

  for (const course of courses) {
    try {
      const currentBillingPeriod = await getOrCreateCurrentBillingPeriod(course);
      const previousBillingPeriod = await BillingPeriod.findOne({
        course: course._id,
        year: previousCycle.year,
        month: previousCycle.month,
      });
      const enrollments = await Enrollment.find({
        course: course._id,
        paymentPlan: "monthly",
        status: "active",
      }).populate("student", "firstName lastName email isActive");
      const pendingPayments = await PaymentSubmission.find({
        enrollment: { $in: enrollments.map((entry) => entry._id) },
        billingPeriod: currentBillingPeriod._id,
        status: "pending",
        $or: [
          { submittedAt: { $lte: currentCycle.paymentDeadline } },
          {
            submittedAt: { $exists: false },
            createdAt: { $lte: currentCycle.paymentDeadline },
          },
        ],
      }).select("enrollment");
      const onTimePendingEnrollmentIds = new Set(
        pendingPayments.map((payment) => payment.enrollment.toString())
      );
      const isWithinGracePeriod =
        referenceDate.getTime() <= currentCycle.paymentDeadline.getTime();

      for (const enrollment of enrollments) {
        summary.checked += 1;

        const hasCurrentApproval = hasApprovedBillingPeriod(
          enrollment,
          currentBillingPeriod
        );
        const hasPreviousApproval = hasApprovedBillingPeriod(
          enrollment,
          previousBillingPeriod
        );
        const evidence = evaluateMonthlyAccessEvidence({
          hasCurrentApproval,
          hasPreviousApproval,
          isWithinGracePeriod,
          hasOnTimePendingPayment:
            hasPreviousApproval &&
            onTimePendingEnrollmentIds.has(enrollment._id.toString()),
        });

        if (!evidence.hasCurrentStanding) {
          const suspended = await suspendEnrollment({
            enrollment,
            course,
            currentBillingPeriod,
            source,
          });

          summary.suspended += suspended ? 1 : 0;
        }
      }
    } catch (error) {
      summary.failed += 1;
      console.error(
        `[MONTHLY_ACCESS:${source}] Failed for ${course.title}:`,
        error.message
      );
    }
  }

  console.log(`[MONTHLY_ACCESS:${source}] Completed:`, summary);
  return summary;
};
