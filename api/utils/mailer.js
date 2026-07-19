import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASS
  ) {
    throw new Error("SMTP configuration is incomplete.");
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
};

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}) => {
  if (!process.env.SMTP_FROM) {
    throw new Error("SMTP_FROM is missing.");
  }

  const mailTransporter = getTransporter();

  return mailTransporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
};