import express from "express";

import {
  getAllEnrollmentsAdmin,
  getMyCourseEnrollment,
  getMyEnrollments,
  setEnrollmentStatus,
  submitPaymentSlip,
} from "../controllers/enrollmentController.js";

import {
  authorize,
  protect,
} from "../middlewares/authMiddleware.js";

import {
  validateObjectIdParam,
} from "../middlewares/validateObjectId.js";

import {
  uploadPaymentSlip,
} from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/my",
  authorize("student"),
  getMyEnrollments
);

router.get(
  "/my/:courseId",
  authorize("student"),
  validateObjectIdParam("courseId"),
  getMyCourseEnrollment
);

router.get(
  "/admin/all",
  authorize("admin"),
  getAllEnrollmentsAdmin
);

router.post(
  "/:courseId/payment-slip",
  authorize("student"),
  validateObjectIdParam("courseId"),
  uploadPaymentSlip.single("slip"),
  submitPaymentSlip
);

router.patch(
  "/:id/status",
  authorize("admin"),
  validateObjectIdParam("id"),
  setEnrollmentStatus
);

export default router;