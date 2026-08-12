import express from "express";

import {
  approvePayment,
  getAllPaymentsAdmin,
  getMyPaymentSubmissions,
  getPaymentAdmin,
  rejectPayment,
  viewPaymentSlip,
} from "../controllers/paymentController.js";
import { deleteRejectedPaymentPermanently } from "../controllers/cleanupController.js";

import {
  authorize,
  protect,
} from "../middlewares/authMiddleware.js";

import {
  validateObjectIdParam,
} from "../middlewares/validateObjectId.js";

const router = express.Router();

router.use(protect);

router.get(
  "/my",
  authorize("student"),
  getMyPaymentSubmissions
);

router.get(
  "/admin/all",
  authorize("admin"),
  getAllPaymentsAdmin
);

router.get(
  "/admin/:id/file",
  authorize("admin"),
  validateObjectIdParam("id"),
  viewPaymentSlip
);

router.get(
  "/admin/:id",
  authorize("admin"),
  validateObjectIdParam("id"),
  getPaymentAdmin
);

router.patch(
  "/admin/:id/approve",
  authorize("admin"),
  validateObjectIdParam("id"),
  approvePayment
);

router.delete(
  "/admin/:id",
  authorize("admin"),
  validateObjectIdParam("id"),
  deleteRejectedPaymentPermanently
);

router.patch(
  "/admin/:id/reject",
  authorize("admin"),
  validateObjectIdParam("id"),
  rejectPayment
);

export default router;
