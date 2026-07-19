import express from "express";

import {
  archiveBillingPeriod,
  createBillingPeriod,
  getAdminBillingPeriods,
  getCourseBillingPeriods,
  getCurrentCourseBillingPeriod,
  restoreBillingPeriod,
  setBillingPeriodStatus,
  updateBillingPeriod,
} from "../controllers/billingPeriodController.js";

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
  "/course/:courseId/current",
  validateObjectIdParam("courseId"),
  getCurrentCourseBillingPeriod
);

router.get(
  "/course/:courseId",
  validateObjectIdParam("courseId"),
  getCourseBillingPeriods
);

router.get(
  "/admin/course/:courseId",
  authorize("admin"),
  validateObjectIdParam("courseId"),
  getAdminBillingPeriods
);

router.post(
  "/",
  authorize("admin"),
  createBillingPeriod
);

router.patch(
  "/:id",
  authorize("admin"),
  validateObjectIdParam("id"),
  updateBillingPeriod
);

router.patch(
  "/:id/status",
  authorize("admin"),
  validateObjectIdParam("id"),
  setBillingPeriodStatus
);

router.patch(
  "/:id/archive",
  authorize("admin"),
  validateObjectIdParam("id"),
  archiveBillingPeriod
);

router.patch(
  "/:id/restore",
  authorize("admin"),
  validateObjectIdParam("id"),
  restoreBillingPeriod
);

export default router;