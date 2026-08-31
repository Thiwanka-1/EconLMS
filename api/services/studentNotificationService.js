import {
  createNicSubmittedEmail,
  createPaymentSubmittedEmail,
} from "../utils/emailTemplates.js";

import {
  createUserNotification,
} from "./notificationService.js";

export const notifyStudentOfPaymentSubmission = async ({
  paymentSubmission,
  student,
  course,
  billingPeriod = null,
}) => {
  const courseTitle = course?.title || "Accounting With Udara course";
  const periodLabel = billingPeriod?.label || null;
  const actionUrl = "/student/payments";

  return createUserNotification({
    recipient: student,
    type: "payment_submitted",
    title: "Payment slip received",
    message: periodLabel
      ? `Your payment slip for ${courseTitle} — ${periodLabel} was received and is awaiting review.`
      : `Your payment slip for ${courseTitle} was received and is awaiting review.`,
    actionUrl,
    data: {
      paymentId: paymentSubmission._id,
      courseId: course?._id || null,
      billingPeriodId: billingPeriod?._id || null,
    },
    deduplicationKey: `student-payment-submitted/${paymentSubmission._id}`,
    emailTemplate: createPaymentSubmittedEmail({
      student,
      courseTitle,
      periodLabel,
      actionUrl,
    }),
  });
};

export const notifyStudentOfNicSubmission = async ({ student }) => {
  const uploadVersion = student.nicImageUploadedAt
    ? new Date(student.nicImageUploadedAt).getTime()
    : "unknown";
  const actionUrl = "/student/nic";

  return createUserNotification({
    recipient: student,
    type: "nic_submitted",
    title: "NIC image received",
    message: "Your NIC image was received and is awaiting administrator review.",
    actionUrl,
    data: {
      uploadedAt: student.nicImageUploadedAt || null,
    },
    deduplicationKey: `student-nic-submitted/${student._id}/${uploadVersion}`,
    emailTemplate: createNicSubmittedEmail({
      student,
      actionUrl,
    }),
  });
};
