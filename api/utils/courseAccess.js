import Enrollment from "../models/Enrollment.js";

const getDocumentId = (value) => {
  return value?._id?.toString() || value?.toString() || null;
};

export const getStudentCourseAccess = async ({
  studentId,
  course,
  billingPeriod = null,
}) => {
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: course._id,
  });

  if (!enrollment) {
    return {
      hasAccess: false,
      reason: "You are not enrolled in this course.",
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

  if (course.paymentPlan === "one_time") {
    const hasAccess = Boolean(enrollment.oneTimeAccessGrantedAt);

    return {
      hasAccess,
      reason: hasAccess
        ? "One-time course access is active."
        : "The course payment has not been approved.",
      enrollment,
    };
  }

  if (!billingPeriod) {
    return {
      hasAccess: false,
      reason: "The requested course content does not have a billing period.",
      enrollment,
    };
  }

  const billingPeriodId = getDocumentId(billingPeriod);

  const approved =
    Boolean(billingPeriodId) &&
    enrollment.approvedBillingPeriods.some(
      (approvedPeriod) => getDocumentId(approvedPeriod) === billingPeriodId
    );

  return {
    hasAccess: approved,
    reason: approved
      ? `Access approved for ${billingPeriod.label}.`
      : `Payment approval is required for ${billingPeriod.label}.`,
    enrollment,
  };
};