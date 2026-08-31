import User from "../models/User.js";
import PaymentSubmission from "../models/PaymentSubmission.js";

import {
  createUserNotification,
} from "./notificationService.js";

const getStudentName = (student) => {
  const fullName = [
    student?.firstName,
    student?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "A student";
};

export const createNotificationsForActiveAdmins = async ({
  type,
  title,
  message,
  actionUrl,
  data,
  deduplicationKey,
  administrators = null,
}) => {
  const recipients =
    administrators ||
    (await User.find({
      role: "admin",
      isActive: true,
    }).select("_id"));

  if (recipients.length === 0) {
    console.warn(
      `[ADMIN_NOTIFICATION] No active administrator could receive ${deduplicationKey}.`,
    );

    return {
      attempted: 0,
      created: 0,
      failed: 0,
    };
  }

  const results = await Promise.allSettled(
    recipients.map((administrator) =>
      createUserNotification({
        recipient: administrator,
        type,
        title,
        message,
        actionUrl,
        data,

        // Each administrator needs a separate record for the same event.
        deduplicationKey: `${deduplicationKey}/${administrator._id}`,

        // Administrator alerts are in-app only and do not depend on email.
        emailTemplate: null,
      }),
    ),
  );

  const failedResults = results.filter(
    (result) => result.status === "rejected",
  );

  for (const result of failedResults) {
    console.error(
      "[ADMIN_NOTIFICATION] In-app notification creation failed:",
      result.reason?.message || result.reason,
    );
  }

  return {
    attempted: results.length,
    created: results.length - failedResults.length,
    failed: failedResults.length,
  };
};

export const notifyAdminsOfPaymentSubmission = async ({
  paymentSubmission,
  student,
  course,
  billingPeriod = null,
  administrators = null,
}) => {
  const studentName = getStudentName(student);
  const courseTitle = course?.title || "a course";
  const periodLabel = billingPeriod?.label
    ? ` (${billingPeriod.label})`
    : "";

  return createNotificationsForActiveAdmins({
    type: "payment_submitted",
    title: "Payment awaiting review",
    message: `${studentName} submitted a payment slip for ${courseTitle}${periodLabel}.`,
    actionUrl: `/admin/payments?paymentId=${paymentSubmission._id}`,
    data: {
      paymentId: paymentSubmission._id,
      studentId: student?._id || null,
      courseId: course?._id || null,
      billingPeriodId: billingPeriod?._id || null,
    },
    deduplicationKey: `admin-payment-submitted/${paymentSubmission._id}`,
    administrators,
  });
};

export const notifyAdminsOfNicSubmission = async ({
  student,
  administrators = null,
}) => {
  const studentName = getStudentName(student);
  const uploadVersion = student.nicImageUploadedAt
    ? new Date(student.nicImageUploadedAt).getTime()
    : "unknown";

  return createNotificationsForActiveAdmins({
    type: "nic_submitted",
    title: "NIC document awaiting review",
    message: `${studentName} uploaded an NIC image for verification.`,
    actionUrl: `/admin/students/${student._id}`,
    data: {
      studentId: student._id,
      uploadedAt: student.nicImageUploadedAt || null,
    },
    deduplicationKey: `admin-nic-submitted/${student._id}/${uploadVersion}`,
    administrators,
  });
};

export const notifyAdminsOfStudentRegistration = async ({
  student,
  administrators = null,
}) => {
  const studentName = getStudentName(student);

  return createNotificationsForActiveAdmins({
    type: "student_registered",
    title: "New student registration",
    message: `${studentName} completed email verification and registered with Accounting With Udara.`,
    actionUrl: `/admin/students/${student._id}`,
    data: {
      studentId: student._id,
    },
    deduplicationKey: `admin-student-registered/${student._id}`,
    administrators,
  });
};

export const backfillPendingAdminNotifications = async () => {
  const administrators = await User.find({
    role: "admin",
    isActive: true,
  }).select("_id");

  if (administrators.length === 0) {
    return {
      payments: 0,
      nicDocuments: 0,
    };
  }

  const [pendingPayments, pendingNicStudents] = await Promise.all([
    PaymentSubmission.find({
      status: "pending",
    })
      .populate("student", "firstName lastName")
      .populate("course", "title")
      .populate("billingPeriod", "label"),

    User.find({
      role: "student",
      nicVerificationStatus: "pending",
      nicImageUploadedAt: {
        $ne: null,
      },
    }).select("firstName lastName nicImageUploadedAt"),
  ]);

  for (const paymentSubmission of pendingPayments) {
    if (!paymentSubmission.student) {
      continue;
    }

    await notifyAdminsOfPaymentSubmission({
      paymentSubmission,
      student: paymentSubmission.student,
      course: paymentSubmission.course,
      billingPeriod: paymentSubmission.billingPeriod,
      administrators,
    });
  }

  for (const student of pendingNicStudents) {
    await notifyAdminsOfNicSubmission({
      student,
      administrators,
    });
  }

  return {
    payments: pendingPayments.length,
    nicDocuments: pendingNicStudents.length,
  };
};
