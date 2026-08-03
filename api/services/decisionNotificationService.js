import PaymentSubmission from "../models/PaymentSubmission.js";

import {
  recordAuditLog,
} from "../utils/auditLog.js";

import {
  createPaymentApprovedEmail,
  createPaymentRejectedEmail,
  createNicRejectedEmail,
  createNicVerifiedEmail,
} from "../utils/emailTemplates.js";

import {
  createUserNotification,
} from "./notificationService.js";

const logSettledFailure = (
  result,
  label
) => {
  if (result.status === "rejected") {
    console.error(
      `[SIDE_EFFECT] ${label} failed:`,
      result.reason?.message ||
        result.reason
    );
  }
};

export const processPaymentDecisionSideEffects =
  async ({
    req,
    paymentId,
    decision,
    reason = "",
  }) => {
    try {
      const payment =
        await PaymentSubmission.findById(
          paymentId
        )
          .populate(
            "student",
            "firstName lastName email"
          )
          .populate(
            "course",
            "title code"
          )
          .populate(
            "billingPeriod",
            "label year month"
          );

      if (!payment) {
        console.error(
          "[PAYMENT_NOTIFICATION] Payment was not found:",
          paymentId
        );

        return {
          success: false,
          error: "Payment not found.",
        };
      }

      if (!payment.student) {
        console.error(
          "[PAYMENT_NOTIFICATION] Payment student was not found:",
          paymentId
        );

        return {
          success: false,
          error:
            "Payment student not found.",
        };
      }

      const approved =
        decision === "approved";

      const courseTitle =
        payment.course?.title ||
        "EconLLS course";

      const periodLabel =
        payment.billingPeriod?.label ||
        null;

      const actionUrl =
        payment.course?._id
          ? `/student/courses/${payment.course._id}`
          : "/student/courses";

      const notificationType =
        approved
          ? "payment_approved"
          : "payment_rejected";

      const notificationTitle =
        approved
          ? "Payment approved"
          : "Payment not approved";

      const notificationMessage =
        approved
          ? periodLabel
            ? `Your payment for ${courseTitle} — ${periodLabel} has been approved.`
            : `Your payment for ${courseTitle} has been approved.`
          : `Your payment for ${courseTitle} was not approved. Reason: ${
              reason ||
              "Please review and resubmit your payment slip."
            }`;

      const emailTemplate =
        approved
          ? createPaymentApprovedEmail({
              student:
                payment.student,
              courseTitle,
              periodLabel,
              actionUrl,
            })
          : createPaymentRejectedEmail({
              student:
                payment.student,
              courseTitle,
              periodLabel,
              reason,
              actionUrl,
            });

      const deduplicationKey = `${
        approved
          ? "payment-approved"
          : "payment-rejected"
      }/${payment._id}`;

      const auditPromise =
        recordAuditLog({
          req,

          action: approved
            ? "PAYMENT_APPROVED"
            : "PAYMENT_REJECTED",

          entityType:
            "PaymentSubmission",

          entityId: payment._id,

          targetUserId:
            payment.student._id,

          description: approved
            ? `Payment approved for ${courseTitle}.`
            : `Payment rejected for ${courseTitle}.`,

          metadata: {
            courseId:
              payment.course?._id ||
              null,

            courseTitle,

            billingPeriodId:
              payment.billingPeriod
                ?._id || null,

            billingPeriodLabel:
              periodLabel,

            paymentPlan:
              payment.paymentPlan,

            decision,

            reason:
              approved
                ? ""
                : reason,
          },
        });

      const notificationPromise =
        createUserNotification({
          recipient:
            payment.student,

          type:
            notificationType,

          title:
            notificationTitle,

          message:
            notificationMessage,

          actionUrl,

          data: {
            paymentId:
              payment._id,

            courseId:
              payment.course?._id ||
              null,

            billingPeriodId:
              payment.billingPeriod
                ?._id || null,
          },

          deduplicationKey,
          emailTemplate,
        });

      const [
        auditResult,
        notificationResult,
      ] = await Promise.allSettled([
        auditPromise,
        notificationPromise,
      ]);

      logSettledFailure(
        auditResult,
        "Payment audit log"
      );

      logSettledFailure(
        notificationResult,
        "Payment notification"
      );

      const auditSaved =
        auditResult.status === "fulfilled" &&
        Boolean(auditResult.value);

      const notificationCreated =
        notificationResult.status === "fulfilled" &&
        Boolean(notificationResult.value);

      return {
        success: auditSaved && notificationCreated,
        auditSaved,
        notificationCreated,
      };
    } catch (error) {
      console.error(
        "[PAYMENT_NOTIFICATION] Side effects failed:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  };

export const processNicDecisionSideEffects =
  async ({
    req,
    student,
    decision,
    note = "",
  }) => {
    try {
      const verified =
        decision === "verified";

      const actionUrl =
        "/student/profile";

      const notificationType =
        verified
          ? "nic_verified"
          : "nic_rejected";

      const notificationTitle =
        verified
          ? "NIC image verified"
          : "NIC image not verified";

      const notificationMessage =
        verified
          ? "Your NIC image has been verified successfully."
          : `Your NIC image could not be verified. Reason: ${
              note ||
              "Please upload a clearer image."
            }`;

      const emailTemplate =
        verified
          ? createNicVerifiedEmail({
              student,
              actionUrl,
            })
          : createNicRejectedEmail({
              student,
              reason: note,
              actionUrl,
            });

      /*
       * Upload timestamp identifies this particular
       * NIC file. Uploading a replacement creates a
       * new deduplication key.
       */
      const uploadVersion =
        student.nicImageUploadedAt
          ? new Date(
              student.nicImageUploadedAt
            ).getTime()
          : "unknown";

      const deduplicationKey = `${
        verified
          ? "nic-verified"
          : "nic-rejected"
      }/${student._id}/${uploadVersion}`;

      const auditPromise =
        recordAuditLog({
          req,

          action: verified
            ? "NIC_VERIFIED"
            : "NIC_REJECTED",

          entityType: "User",

          entityId: student._id,

          targetUserId:
            student._id,

          description: verified
            ? "Student NIC image verified."
            : "Student NIC image rejected.",

          metadata: {
            decision,
            note,
            nicImageUploadedAt:
              student.nicImageUploadedAt,
          },
        });

      const notificationPromise =
        createUserNotification({
          recipient: student,
          type: notificationType,
          title: notificationTitle,
          message:
            notificationMessage,
          actionUrl,

          data: {
            verificationStatus:
              decision,
          },

          deduplicationKey,
          emailTemplate,
        });

      const [
        auditResult,
        notificationResult,
      ] = await Promise.allSettled([
        auditPromise,
        notificationPromise,
      ]);

      logSettledFailure(
        auditResult,
        "NIC audit log"
      );

      logSettledFailure(
        notificationResult,
        "NIC notification"
      );

      const auditSaved =
        auditResult.status === "fulfilled" &&
        Boolean(auditResult.value);

      const notificationCreated =
        notificationResult.status === "fulfilled" &&
        Boolean(notificationResult.value);

      return {
        success: auditSaved && notificationCreated,
        auditSaved,
        notificationCreated,
      };
    } catch (error) {
      console.error(
        "[NIC_NOTIFICATION] Side effects failed:",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  };