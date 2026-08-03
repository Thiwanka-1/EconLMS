import { Resend } from "resend";

let resendClient = null;

const getResendClient = () => {
  const provider = String(process.env.EMAIL_PROVIDER || "resend").trim().toLowerCase();

  if (provider !== "resend") {
    throw new Error(`Unsupported email provider: ${provider}`);
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
};

const normalizeRecipients = (to) => {
  const recipients = Array.isArray(to) ? to : [to];

  return recipients.map((recipient) => String(recipient || "").trim()).filter(Boolean);
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const recipients = normalizeRecipients(to);
  const from = String(process.env.EMAIL_FROM || "").trim();

  if (recipients.length === 0) {
    throw new Error("At least one email recipient is required.");
  }

  if (!from) {
    throw new Error("EMAIL_FROM is missing.");
  }

  if (!subject) {
    throw new Error("Email subject is required.");
  }

  if (!text && !html) {
    throw new Error("Email text or HTML content is required.");
  }

  const { data, error } = await getResendClient().emails.send({
    from,
    to: recipients,
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(`Resend email delivery failed: ${error.message || "Unknown Resend error."}`);
  }

  if (!data?.id) {
    throw new Error("Resend did not return an email identifier.");
  }

  return data;
};