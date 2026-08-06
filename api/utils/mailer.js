import nodemailer from "nodemailer";

let smtpTransporter = null;

const normalizeRecipients = (to) => {
  const recipients = Array.isArray(to) ? to : [to];

  return recipients
    .map((recipient) => String(recipient || "").trim())
    .filter(Boolean);
};

const getSmtpPort = () => {
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);

  return Number.isInteger(port) && port > 0 ? port : 587;
};

const getSmtpTransporter = () => {
  const host = String(process.env.SMTP_HOST || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const port = getSmtpPort();
  const secure =
    String(process.env.SMTP_SECURE || (port === 465 ? "true" : "false"))
      .trim()
      .toLowerCase() === "true";

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP configuration is incomplete. SMTP_HOST, SMTP_USER and SMTP_PASS are required.",
    );
  }

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure,
      pool: true,
      maxConnections: Math.max(
        Number.parseInt(process.env.SMTP_MAX_CONNECTIONS || "3", 10) || 3,
        1,
      ),
      maxMessages: Math.max(
        Number.parseInt(process.env.SMTP_MAX_MESSAGES || "100", 10) || 100,
        1,
      ),
      auth: {
        user,
        pass,
      },
    });
  }

  return smtpTransporter;
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

  const result = await getSmtpTransporter().sendMail({
    from,
    to: recipients,
    subject,
    text,
    html,
  });

  if (!result?.messageId) {
    throw new Error("SMTP server did not return an email identifier.");
  }

  return {
    id: result.messageId,
    accepted: result.accepted || [],
    rejected: result.rejected || [],
  };
};

export const verifyEmailConnection = async () => {
  return getSmtpTransporter().verify();
};
