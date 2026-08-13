export const getPasswordResetMaxAttempts = () => {
  const configuredAttempts = Number.parseInt(
    process.env.PASSWORD_RESET_MAX_ATTEMPTS || "5",
    10
  );

  return Number.isInteger(configuredAttempts) && configuredAttempts > 0
    ? configuredAttempts
    : 5;
};

export const clearPasswordResetOtp = (user) => {
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpiresAt = null;
  user.passwordResetOtpSentAt = null;
  user.passwordResetOtpAttempts = 0;
};

export const recordFailedPasswordResetAttempt = (
  user,
  maxAttempts = getPasswordResetMaxAttempts()
) => {
  user.passwordResetOtpAttempts =
    Number(user.passwordResetOtpAttempts || 0) + 1;

  const attemptsExhausted =
    user.passwordResetOtpAttempts >= maxAttempts;

  if (attemptsExhausted) {
    clearPasswordResetOtp(user);
  }

  return attemptsExhausted;
};
