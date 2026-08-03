import { Resend } from "resend";

let resendClient = null;

const emailNotificationsEnabled = () => {
  return (
    process.env
      .EMAIL_NOTIFICATIONS_ENABLED !==
    "false"
  );
};

const getEmailProvider = () => {
  return (
    process.env.EMAIL_PROVIDER ||
    "resend"
  ).toLowerCase();
};

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is missing."
    );
  }

  if (!resendClient) {
    resendClient = new Resend(
      process.env.RESEND_API_KEY
    );
  }

  return resendClient;
};

const getSenderAddress = () => {
  const sender = String(process.env.EMAIL_FROM || "").trim();

  if (!sender) {
    throw new Error("EMAIL_FROM is missing.");
  }

  return sender;
};

export const sendTransactionalEmail =
  async ({
    to,
    subject,
    text,
    html,
    idempotencyKey,
  }) => {
    if (!emailNotificationsEnabled()) {
      return {
        skipped: true,
        reason:
          "Email notifications are disabled.",
      };
    }

    if (!to) {
      return {
        skipped: true,
        reason:
          "Recipient email is missing.",
      };
    }

    const provider =
      getEmailProvider();

    if (provider !== "resend") {
      throw new Error(
        `Unsupported email provider: ${provider}`
      );
    }

    const resend = getResendClient();

    const {
      data,
      error,
    } = await resend.emails.send(
      {
        from: getSenderAddress(),
        to: [to],
        subject,
        text,
        html,
      },
      {
        idempotencyKey,
      }
    );

    if (error) {
      throw new Error(
        error.message ||
          "Resend could not send the email."
      );
    }

    return {
      skipped: false,
      provider: "resend",
      messageId: data?.id || null,
    };
  };