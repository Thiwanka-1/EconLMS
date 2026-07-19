import { sendEmail } from "./mailer.js";

const getExpiryMinutes = () => {
  return Number(process.env.OTP_EXPIRES_MINUTES || 10);
};

const createOtpHtml = ({ title, message, otp }) => {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 500px; margin: auto; padding: 24px;">
          <h2>${title}</h2>

          <p>${message}</p>

          <div
            style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              padding: 16px;
              text-align: center;
              background: #f4f4f4;
              border-radius: 8px;
            "
          >
            ${otp}
          </div>

          <p>
            This code expires in ${getExpiryMinutes()} minutes.
          </p>

          <p>
            Do not share this code with anyone.
          </p>
        </div>
      </body>
    </html>
  `;
};

export const sendVerificationOtpEmail = async ({
  email,
  otp,
}) => {
  const expiryMinutes = getExpiryMinutes();

  return sendEmail({
    to: email,
    subject: "Verify your EconLMS account",
    text: `Your EconLMS verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
    html: createOtpHtml({
      title: "Verify your EconLMS account",
      message:
        "Enter the following verification code to complete your registration.",
      otp,
    }),
  });
};

export const sendPasswordResetOtpEmail = async ({
  email,
  otp,
}) => {
  const expiryMinutes = getExpiryMinutes();

  return sendEmail({
    to: email,
    subject: "Reset your EconLMS password",
    text: `Your EconLMS password reset code is ${otp}. It expires in ${expiryMinutes} minutes.`,
    html: createOtpHtml({
      title: "Reset your password",
      message:
        "Enter the following code to reset your EconLMS password.",
      otp,
    }),
  });
};