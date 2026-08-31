import { sendEmail } from "./mailer.js";

import {
  recordAuthenticationEmailFailure,
  recordAuthenticationEmailSuccess,
} from "../services/authenticationEmailMonitorService.js";

const getExpiryMinutes = () => {
  const value = Number.parseInt(process.env.OTP_EXPIRES_MINUTES || "10", 10);
  return Number.isInteger(value) && value > 0 ? value : 10;
};

const createOtpHtml = ({ title, message, otp }) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 24px; color: #1f2937;">
    <div style="max-width: 500px; margin: 0 auto;">
      <h2 style="margin-top: 0;">${title}</h2>
      <p>${message}</p>

      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; text-align: center; background: #f4f4f4; border-radius: 8px;">
        ${otp}
      </div>

      <p>This code expires in ${getExpiryMinutes()} minutes.</p>
      <p>Do not share this code with anyone.</p>
    </div>
  </body>
</html>
`;

const sendMonitoredAuthenticationEmail = async ({ purpose, message }) => {
  try {
    const result = await sendEmail(message);
    await recordAuthenticationEmailSuccess({ purpose });
    return result;
  } catch (error) {
    await recordAuthenticationEmailFailure({ purpose, error });
    throw error;
  }
};

export const sendVerificationOtpEmail = async ({ email, otp }) => {
  const expiryMinutes = getExpiryMinutes();

  return sendMonitoredAuthenticationEmail({
    purpose: "email_verification",
    message: {
      to: email,
      subject: "Verify your Accounting With Udara account",
      text: `Your Accounting With Udara verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
      html: createOtpHtml({
        title: "Verify your Accounting With Udara account",
        message: "Enter the following verification code to complete your registration.",
        otp,
      }),
    },
  });
};

export const sendPasswordResetOtpEmail = async ({ email, otp }) => {
  const expiryMinutes = getExpiryMinutes();

  return sendMonitoredAuthenticationEmail({
    purpose: "password_reset",
    message: {
      to: email,
      subject: "Reset your Accounting With Udara password",
      text: `Your Accounting With Udara password reset code is ${otp}. It expires in ${expiryMinutes} minutes.`,
      html: createOtpHtml({
        title: "Reset your password",
        message: "Enter the following code to reset your Accounting With Udara password.",
        otp,
      }),
    },
  });
};
