import Notification from "../models/Notification.js";

import {
  sendTransactionalEmail,
} from "../utils/emailService.js";

const updateEmailDelivery = async ({
  notificationId,
  update,
}) => {
  return Notification.findByIdAndUpdate(
    notificationId,
    {
      $set: update,
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );
};

export const createUserNotification =
  async ({
    recipient,
    type,
    title,
    message,
    actionUrl = "",
    data = {},
    deduplicationKey,
    emailTemplate = null,
  }) => {
    if (!recipient?._id) {
      throw new Error(
        "A valid notification recipient is required."
      );
    }

    if (!deduplicationKey) {
      throw new Error(
        "Notification deduplication key is required."
      );
    }

    const emailNotificationsEnabled =
      process.env.EMAIL_NOTIFICATIONS_ENABLED !== "false";

    const shouldAttemptEmail = Boolean(
      emailNotificationsEnabled &&
      emailTemplate &&
      recipient.email
    );

    const skippedEmailReason = !emailNotificationsEnabled
      ? "Email notifications are disabled."
      : !emailTemplate
        ? "Email template is missing."
        : !recipient.email
          ? "Recipient email is missing."
          : "";

    /*
     * Atomic upsert prevents duplicate in-app
     * notifications for the same event.
     */
    let notification =
      await Notification.findOneAndUpdate(
        {
          deduplicationKey,
        },
        {
          $setOnInsert: {
            recipient: recipient._id,
            type,
            title,
            message,
            actionUrl,
            data,
            isRead: false,
            readAt: null,
            deduplicationKey,

            emailDelivery: {
              status: shouldAttemptEmail
                ? "pending"
                : "skipped",

              provider: "smtp",

              error: shouldAttemptEmail ? "" : skippedEmailReason,
            },
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );

    /*
     * The notification already exists and its
     * email was successfully sent.
     */
    if (
      notification.emailDelivery
        ?.status === "sent"
    ) {
      return notification;
    }

    if (!shouldAttemptEmail) {
      return notification;
    }

    try {
      const result =
        await sendTransactionalEmail({
          to: recipient.email,

          subject:
            emailTemplate.subject,

          text:
            emailTemplate.text,

          html:
            emailTemplate.html,
        });

      if (result.skipped) {
        notification =
          await updateEmailDelivery({
            notificationId:
              notification._id,

            update: {
              "emailDelivery.status":
                "skipped",

              "emailDelivery.attemptedAt":
                new Date(),

              "emailDelivery.error":
                result.reason || "",
            },
          });

        return notification;
      }

      notification =
        await updateEmailDelivery({
          notificationId:
            notification._id,

          update: {
            "emailDelivery.status":
              "sent",

            "emailDelivery.provider":
              result.provider ||
              "smtp",

            "emailDelivery.providerMessageId":
              result.messageId,

            "emailDelivery.attemptedAt":
              new Date(),

            "emailDelivery.sentAt":
              new Date(),

            "emailDelivery.error": "",
          },
        });

      return notification;
    } catch (error) {
      notification =
        await updateEmailDelivery({
          notificationId:
            notification._id,

          update: {
            "emailDelivery.status":
              "failed",

            "emailDelivery.attemptedAt":
              new Date(),

            "emailDelivery.error":
              String(
                error.message ||
                  "Email delivery failed."
              ).slice(0, 1000),
          },
        });

      console.error(
        `[EMAIL] Notification ${notification._id} failed:`,
        error.message
      );

      /*
       * Keep the in-app notification even when
       * the external email provider fails.
       */
      return notification;
    }
  };
