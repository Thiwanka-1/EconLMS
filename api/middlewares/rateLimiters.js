import { rateLimit } from "express-rate-limit";

const createResponse = (message) => ({
  success: false,
  message,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: createResponse(
    "Too many requests. Please try again later."
  ),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: createResponse(
    "Too many authentication attempts. Please try again later."
  ),
});

export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: createResponse(
    "Too many OTP requests. Please try again later."
  ),
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: createResponse(
    "Too many incorrect verification attempts. Please try again later."
  ),
});