import Enrollment from "../models/Enrollment.js";
import { getMonthlyEnrollmentAccess } from "../services/monthlyAccessPolicyService.js";

export const getStudentCourseAccess = async ({
  studentId,
  course,
  billingPeriod = null,
  now = null,
  allowCourseLevel = false,
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

  if (!billingPeriod && !allowCourseLevel) {
    return {
      hasAccess: false,
      reason: "The requested course content does not have a billing period.",
      enrollment,
    };
  }

  const monthlyAccess = await getMonthlyEnrollmentAccess({
    enrollment,
    course,
    requestedBillingPeriod: billingPeriod,
    now,
  });

  return {
    ...monthlyAccess,
    enrollment,
  };
};
