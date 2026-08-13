import assert from "node:assert/strict";
import test from "node:test";

import {
  compareOtp,
  generateOtp,
} from "../utils/otp.js";

import {
  clearPasswordResetOtp,
  recordFailedPasswordResetAttempt,
} from "../utils/passwordReset.js";

test("password reset codes are six digits and stored as hashes", () => {
  const originalSecret = process.env.OTP_HASH_SECRET;
  process.env.OTP_HASH_SECRET = "test-only-password-reset-hash-secret-123456789";

  try {
    const { otp, otpHash } = generateOtp();

    assert.match(otp, /^\d{6}$/);
    assert.notEqual(otpHash, otp);
    assert.equal(compareOtp(otp, otpHash), true);
    assert.equal(compareOtp("000000", otpHash), otp === "000000");
  } finally {
    if (originalSecret === undefined) {
      delete process.env.OTP_HASH_SECRET;
    } else {
      process.env.OTP_HASH_SECRET = originalSecret;
    }
  }
});

test("a reset code is invalidated after its per-account attempt limit", () => {
  const resetState = {
    passwordResetOtpHash: "stored-hash",
    passwordResetOtpExpiresAt: new Date(Date.now() + 60_000),
    passwordResetOtpSentAt: new Date(),
    passwordResetOtpAttempts: 0,
  };

  assert.equal(recordFailedPasswordResetAttempt(resetState, 3), false);
  assert.equal(recordFailedPasswordResetAttempt(resetState, 3), false);
  assert.equal(resetState.passwordResetOtpAttempts, 2);

  assert.equal(recordFailedPasswordResetAttempt(resetState, 3), true);
  assert.equal(resetState.passwordResetOtpHash, null);
  assert.equal(resetState.passwordResetOtpExpiresAt, null);
  assert.equal(resetState.passwordResetOtpSentAt, null);
  assert.equal(resetState.passwordResetOtpAttempts, 0);
});

test("clearing a reset code removes every reusable recovery value", () => {
  const resetState = {
    passwordResetOtpHash: "stored-hash",
    passwordResetOtpExpiresAt: new Date(),
    passwordResetOtpSentAt: new Date(),
    passwordResetOtpAttempts: 2,
  };

  clearPasswordResetOtp(resetState);

  assert.deepEqual(resetState, {
    passwordResetOtpHash: null,
    passwordResetOtpExpiresAt: null,
    passwordResetOtpSentAt: null,
    passwordResetOtpAttempts: 0,
  });
});
