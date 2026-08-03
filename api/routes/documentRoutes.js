import express from "express";

import {
  getMyNicStatus,
  getStudentNicStatusAdmin,
  updateNicVerificationStatus,
  uploadMyNicImage,
  viewMyNicImage,
  viewStudentNicImageAdmin,
} from "../controllers/documentController.js";

import {
  authorize,
  protect,
} from "../middlewares/authMiddleware.js";

import {
  validateObjectIdParam,
} from "../middlewares/validateObjectId.js";

import {
  uploadNicImage,
} from "../middlewares/uploadMiddleware.js";

import {
  uploadRateLimiter,
} from "../middlewares/securityMiddleware.js";

import {
  validateNicImageSignature,
} from "../middlewares/uploadSignatureMiddleware.js";

const router = express.Router();

router.use(protect);

/*
 * Student routes
 */
router.get(
  "/nic/me/status",
  authorize("student"),
  getMyNicStatus
);

router.get(
  "/nic/me/file",
  authorize("student"),
  viewMyNicImage
);

router.put(
  "/nic/me",
  authorize("student"),

  uploadRateLimiter,

  uploadNicImage.single(
    "nicImage"
  ),

  validateNicImageSignature,

  uploadMyNicImage
);

/*
 * Admin routes
 */
router.get(
  "/nic/admin/:studentId/status",
  authorize("admin"),
  validateObjectIdParam(
    "studentId"
  ),
  getStudentNicStatusAdmin
);

router.get(
  "/nic/admin/:studentId/file",
  authorize("admin"),
  validateObjectIdParam(
    "studentId"
  ),
  viewStudentNicImageAdmin
);

router.patch(
  "/nic/admin/:studentId/status",
  authorize("admin"),
  validateObjectIdParam(
    "studentId"
  ),
  updateNicVerificationStatus
);

export default router;