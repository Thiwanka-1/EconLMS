import { sendEmail } from "./mailer.js";

const emailNotificationsEnabled = () => {
  return process.env.EMAIL_NOTIFICATIONS_ENABLED !== "false";
};

export const sendTransactionalEmail = async ({
  to,
  subject,
  text,
  html,
}) => {
  if (!emailNotificationsEnabled()) {
    return {
      skipped: true,
      reason: "Email notifications are disabled.",
    };
  }

  if (!to) {
    return {
      skipped: true,
      reason: "Recipient email is missing.",
    };
  }

  const result = await sendEmail({
    to,
    subject,
    text,
    html,
  });

  return {
    skipped: false,
    provider: "smtp",
    messageId: result.id,
  };
};
