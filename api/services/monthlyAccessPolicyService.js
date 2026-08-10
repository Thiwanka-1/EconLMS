import BillingPeriod from "../models/BillingPeriod.js";
import Course from "../models/Course.js";
import PaymentSubmission from "../models/PaymentSubmission.js";

import {
  getBillingReferenceDate,
  getCurrentMonthCycle,
  getOrCreateCurrentBillingPeriod,
  getPreviousMonthCycle,
} from "../utils/billingPeriod.js";

export const getDocumentId = (value) => {
  return value?._id?.toString() || value?.toString() || null;
};

export const hasApprovedBillingPeriod = (enrollment, billingPeriod) => {
  const billingPeriodId = getDocumentId(billingPeriod);

  return Boolean(billingPeriodId) && enrollment.approvedBillingPeriods.some(
    (approvedPeriod) => getDocumentId(approvedPeriod) === billingPeriodId
  );
};

/**
 * Pure policy used by both HTTP access checks and the daily suspension job.
 * Pending-payment continuation is intentionally available only to a returning
 * student who has the immediately previous month approved.
 */
export const evaluateMonthlyAccessEvidence = ({
  hasCurrentApproval,
  hasPreviousApproval,
  isWithinGracePeriod,
  hasOnTimePendingPayment,
}) => {
  if (hasCurrentApproval) {
    return {
      hasCurrentStanding: true,
      source: "current_month_approved",
      reason: "Payment access is approved for the current month.",
    };
  }

  if (hasPreviousApproval && isWithinGracePeriod) {
    return {
      hasCurrentStanding: true,
      source: "previous_month_grace",
      reason: "Access is active during the monthly payment grace period.",
    };
  }

  if (hasPreviousApproval && hasOnTimePendingPayment) {
    return {
      hasCurrentStanding: true,
      source: "on_time_payment_pending",
      reason: "Access remains active while your on-time payment is reviewed.",
    };
  }

  return {
    hasCurrentStanding: false,
    source: "payment_overdue",
    reason: hasPreviousApproval
      ? "The monthly payment grace period has ended and payment approval is required."
      : "Payment approval is required for the current month.",
  };
};

const resolveCurrentBillingPeriod = async ({ course, courseId, currentCycle }) => {
  let billingPeriod = await BillingPeriod.findOne({
    course: courseId,
    year: currentCycle.year,
    month: currentCycle.month,
  });

  if (billingPeriod) {
    return billingPeriod;
  }

  const completeCourse = course?.createdBy
    ? course
    : await Course.findById(courseId).select(
        "price currency createdBy updatedBy paymentPlan"
      );

  if (!completeCourse || completeCourse.paymentPlan !== "monthly") {
    return null;
  }

  billingPeriod = await getOrCreateCurrentBillingPeriod(completeCourse);
  return billingPeriod;
};

export const getMonthlyEnrollmentAccess = async ({
  enrollment,
  course,
  requestedBillingPeriod = null,
  now = null,
}) => {
  const courseId = getDocumentId(course);
  const referenceDate = getBillingReferenceDate(now);
  const currentCycle = getCurrentMonthCycle(referenceDate);
  const previousCycle = getPreviousMonthCycle(referenceDate);

  const currentBillingPeriod = await resolveCurrentBillingPeriod({
    course,
    courseId,
    currentCycle,
  });

  if (!currentBillingPeriod) {
    return {
      hasAccess: false,
      hasCurrentStanding: false,
      source: "current_period_missing",
      reason: "The current billing period is not available.",
      currentBillingPeriod: null,
      previousBillingPeriod: null,
    };
  }

  const previousBillingPeriod = await BillingPeriod.findOne({
    course: courseId,
    year: previousCycle.year,
    month: previousCycle.month,
  });

  const hasCurrentApproval = hasApprovedBillingPeriod(
    enrollment,
    currentBillingPeriod
  );
  const hasPreviousApproval = hasApprovedBillingPeriod(
    enrollment,
    previousBillingPeriod
  );
  const isWithinGracePeriod =
    referenceDate.getTime() <= currentCycle.paymentDeadline.getTime();

  let hasOnTimePendingPayment = false;

  if (hasPreviousApproval && !hasCurrentApproval) {
    hasOnTimePendingPayment = Boolean(
      await PaymentSubmission.exists({
        enrollment: enrollment._id,
        billingPeriod: currentBillingPeriod._id,
        status: "pending",
        $or: [
          { submittedAt: { $lte: currentCycle.paymentDeadline } },
          {
            submittedAt: { $exists: false },
            createdAt: { $lte: currentCycle.paymentDeadline },
          },
        ],
      })
    );
  }

  const standing = evaluateMonthlyAccessEvidence({
    hasCurrentApproval,
    hasPreviousApproval,
    isWithinGracePeriod,
    hasOnTimePendingPayment,
  });

  const requestedId = getDocumentId(requestedBillingPeriod);
  const currentId = getDocumentId(currentBillingPeriod);
  const requestedIsCurrent = Boolean(requestedId && requestedId === currentId);
  const requestedIsApproved = requestedId
    ? hasApprovedBillingPeriod(enrollment, requestedBillingPeriod)
    : false;

  let hasAccess = standing.hasCurrentStanding;
  let reason = standing.reason;

  if (requestedId) {
    if (!standing.hasCurrentStanding) {
      hasAccess = false;
    } else if (requestedIsCurrent) {
      hasAccess = true;
    } else {
      hasAccess = requestedIsApproved;
      reason = requestedIsApproved
        ? `Access approved for ${requestedBillingPeriod.label || "this billing period"}.`
        : `Payment approval is required for ${
            requestedBillingPeriod.label || "this billing period"
          }.`;
    }
  }

  return {
    hasAccess,
    hasCurrentStanding: standing.hasCurrentStanding,
    source: standing.source,
    reason,
    currentBillingPeriod,
    previousBillingPeriod,
    hasCurrentApproval,
    hasPreviousApproval,
    hasOnTimePendingPayment,
    isWithinGracePeriod,
  };
};
