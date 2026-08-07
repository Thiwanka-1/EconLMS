import Notification from "../models/Notification.js";
import { sendTransactionalEmail } from "../utils/emailService.js";

const MAX_EMAIL_ATTEMPTS = 6;

const getRetryDelayMilliseconds = (attempts) => {
  const delays = [5, 15, 60, 180, 360, 720];
  const minutes = delays[Math.min(Math.max(attempts - 1, 0), delays.length - 1)];
  return minutes * 60 * 1000;
};

const claimNotificationEmail = async (notificationId = null) => {
  const now = new Date();
  const staleProcessingBefore = new Date(Date.now() - 15 * 60 * 1000);

  const filter = {
    ...(notificationId && { _id: notificationId }),
    $and: [
      {
        $or: [
          {
            "emailDelivery.status": { $in: ["pending", "failed"] },
            $or: [
              { "emailDelivery.nextAttemptAt": null },
              { "emailDelivery.nextAttemptAt": { $lte: now } },
            ],
          },
          {
            "emailDelivery.status": "processing",
            "emailDelivery.attemptedAt": { $lte: staleProcessingBefore },
          },
        ],
      },
      {
        $or: [
          { "emailDelivery.attempts": { $lt: MAX_EMAIL_ATTEMPTS } },
          { "emailDelivery.attempts": { $exists: false } },
        ],
      },
    ],
  };

  return Notification.findOneAndUpdate(
    filter,
    {
      $set: {
        "emailDelivery.status": "processing",
        "emailDelivery.attemptedAt": now,
        "emailDelivery.nextAttemptAt": null,
        "emailDelivery.error": "",
      },
      $inc: { "emailDelivery.attempts": 1 },
    },
    {
      sort: { createdAt: 1 },
      returnDocument: "after",
    }
  )
    .select("+emailPayload")
    .populate("recipient", "email isActive");
};

export const deliverQueuedNotificationEmail = async (notificationId = null) => {
  const notification = await claimNotificationEmail(notificationId);

  if (!notification) {
    return { processed: false };
  }

  const recipientEmail = notification.recipient?.email;
  const payload = notification.emailPayload;

  if (!recipientEmail || !notification.recipient?.isActive || !payload?.subject) {
    await Notification.updateOne(
      { _id: notification._id },
      {
        $set: {
          "emailDelivery.status": "skipped",
          "emailDelivery.error": "Recipient or stored email payload is unavailable.",
          "emailDelivery.nextAttemptAt": null,
        },
      }
    );

    return { processed: true, skipped: true };
  }

  try {
    const result = await sendTransactionalEmail({
      to: recipientEmail,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    await Notification.updateOne(
      { _id: notification._id },
      {
        $set: {
          "emailDelivery.status": result.skipped ? "skipped" : "sent",
          "emailDelivery.provider": result.provider || "smtp",
          "emailDelivery.providerMessageId": result.messageId || null,
          "emailDelivery.sentAt": result.skipped ? null : new Date(),
          "emailDelivery.error": result.reason || "",
          "emailDelivery.nextAttemptAt": null,
        },
      }
    );

    return { processed: true, sent: !result.skipped, skipped: result.skipped };
  } catch (error) {
    const attempts = Number(notification.emailDelivery?.attempts || 1);
    const exhausted = attempts >= MAX_EMAIL_ATTEMPTS;

    await Notification.updateOne(
      { _id: notification._id },
      {
        $set: {
          "emailDelivery.status": "failed",
          "emailDelivery.error": String(error.message || "Email delivery failed.").slice(0, 1000),
          "emailDelivery.nextAttemptAt": exhausted
            ? null
            : new Date(Date.now() + getRetryDelayMilliseconds(attempts)),
        },
      }
    );

    console.error(`[EMAIL] Notification ${notification._id} failed:`, error.message);
    return { processed: true, failed: true, exhausted };
  }
};

export const processPendingNotificationEmails = async ({ limit = 25 } = {}) => {
  const summary = { processed: 0, sent: 0, failed: 0, skipped: 0 };

  for (let index = 0; index < limit; index += 1) {
    const result = await deliverQueuedNotificationEmail();

    if (!result.processed) {
      break;
    }

    summary.processed += 1;
    summary.sent += result.sent ? 1 : 0;
    summary.failed += result.failed ? 1 : 0;
    summary.skipped += result.skipped ? 1 : 0;
  }

  return summary;
};

export const createUserNotification = async ({
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
    throw new Error("A valid notification recipient is required.");
  }

  if (!deduplicationKey) {
    throw new Error("Notification deduplication key is required.");
  }

  const emailNotificationsEnabled =
    process.env.EMAIL_NOTIFICATIONS_ENABLED !== "false";
  const shouldAttemptEmail = Boolean(
    emailNotificationsEnabled && emailTemplate && recipient.email
  );
  const skippedEmailReason = !emailNotificationsEnabled
    ? "Email notifications are disabled."
    : !emailTemplate
      ? "Email template is missing."
      : !recipient.email
        ? "Recipient email is missing."
        : "";

  let notification = await Notification.findOneAndUpdate(
    { deduplicationKey },
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
        emailPayload: shouldAttemptEmail
          ? {
              subject: emailTemplate.subject,
              text: emailTemplate.text || "",
              html: emailTemplate.html || "",
            }
          : null,
        emailDelivery: {
          status: shouldAttemptEmail ? "pending" : "skipped",
          provider: "smtp",
          attempts: 0,
          nextAttemptAt: null,
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

  if (
    shouldAttemptEmail &&
    ["pending", "failed"].includes(notification.emailDelivery?.status)
  ) {
    await Notification.updateOne(
      { _id: notification._id },
      {
        $set: {
          emailPayload: {
            subject: emailTemplate.subject,
            text: emailTemplate.text || "",
            html: emailTemplate.html || "",
          },
        },
      }
    );

    setImmediate(() => {
      void deliverQueuedNotificationEmail(notification._id).catch((error) => {
        console.error("[EMAIL] Immediate notification delivery failed:", error.message);
      });
    });
  }

  return notification;
};
