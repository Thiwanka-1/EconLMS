import express from "express";

import {
  changePassword,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  resendVerificationOtp,
  resetPassword,
  signup,
  verifyEmail,
} from "../controllers/authController.js";

import {
  protect,
} from "../middlewares/authMiddleware.js";

import {
  authLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
} from "../middlewares/rateLimiters.js";

const router = express.Router();

router.post(
  "/signup",
  authLimiter,
  signup
);

router.post(
  "/verify-email",
  otpVerifyLimiter,
  verifyEmail
);

router.post(
  "/resend-verification",
  otpRequestLimiter,
  resendVerificationOtp
);

router.post(
  "/login",
  authLimiter,
  login
);

router.post(
  "/logout",
  logout
);

router.post(
  "/forgot-password",
  otpRequestLimiter,
  forgotPassword
);

router.post(
  "/reset-password",
  otpVerifyLimiter,
  resetPassword
);

router.patch(
  "/change-password",
  protect,
  authLimiter,
  changePassword
);

router.get(
  "/me",
  protect,
  getCurrentUser
);

export default router;