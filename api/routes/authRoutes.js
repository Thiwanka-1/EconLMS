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

import { protect } from "../middlewares/authMiddleware.js";

import {
  loginRateLimiter,
  otpSendRateLimiter,
  sensitiveActionRateLimiter,
} from "../middlewares/securityMiddleware.js";

const router = express.Router();

router.post("/signup", sensitiveActionRateLimiter, signup);
router.post("/verify-email", sensitiveActionRateLimiter, verifyEmail);
router.post("/resend-verification-otp", otpSendRateLimiter, resendVerificationOtp);
router.post("/login", loginRateLimiter, login);
router.post("/logout", logout);
router.post("/forgot-password", otpSendRateLimiter, forgotPassword);
router.post("/reset-password", sensitiveActionRateLimiter, resetPassword);
router.patch("/change-password", protect, sensitiveActionRateLimiter, changePassword);
router.get("/me", protect, getCurrentUser);

export default router;