import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

const getOtpSecret = () => {
  if (!process.env.OTP_HASH_SECRET) {
    throw new Error("OTP_HASH_SECRET is missing.");
  }

  return process.env.OTP_HASH_SECRET;
};

export const hashOtp = (otp) => {
  return createHmac("sha256", getOtpSecret())
    .update(String(otp))
    .digest("hex");
};

export const generateOtp = () => {
  const otp = String(randomInt(100000, 1000000));

  return {
    otp,
    otpHash: hashOtp(otp),
  };
};

export const compareOtp = (providedOtp, storedHash) => {
  if (!providedOtp || !storedHash) {
    return false;
  }

  const providedHashBuffer = Buffer.from(
    hashOtp(providedOtp),
    "hex"
  );

  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (providedHashBuffer.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(
    providedHashBuffer,
    storedHashBuffer
  );
};

export const createOtpExpiryDate = () => {
  const expiryMinutes = Number(
    process.env.OTP_EXPIRES_MINUTES || 10
  );

  return new Date(
    Date.now() + expiryMinutes * 60 * 1000
  );
};