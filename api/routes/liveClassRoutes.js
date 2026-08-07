import express from "express";

import {
  createLiveClass,
  getAdminLiveClasses,
  getStudentLiveClasses,
  joinLiveClass,
  refreshLiveClassFromZoom,
  syncLiveClass,
  updateLiveClassStatus,
} from "../controllers/liveClassController.js";
import { deleteLiveClassPermanently } from "../controllers/cleanupController.js";

import {
  authorize,
  protect,
} from "../middlewares/authMiddleware.js";

import {
  validateObjectIdParam,
} from "../middlewares/validateObjectId.js";

const router = express.Router();

router.use(protect);

/*
 * Admin routes
 */
router.get(
  "/admin/all",
  authorize("admin"),
  getAdminLiveClasses
);

router.post(
  "/",
  authorize("admin"),
  createLiveClass
);

router.post(
  "/admin/:id/sync",
  authorize("admin"),
  validateObjectIdParam("id"),
  syncLiveClass
);

router.patch(
  "/admin/:id/refresh",
  authorize("admin"),
  validateObjectIdParam("id"),
  refreshLiveClassFromZoom
);

router.delete(
  "/admin/:id",
  authorize("admin"),
  validateObjectIdParam("id"),
  deleteLiveClassPermanently
);

router.patch(
  "/admin/:id/status",
  authorize("admin"),
  validateObjectIdParam("id"),
  updateLiveClassStatus
);

/*
 * Student routes
 */
router.get(
  "/course/:courseId",
  authorize("student"),
  validateObjectIdParam("courseId"),
  getStudentLiveClasses
);

router.post(
  "/:id/join",
  authorize("student"),
  validateObjectIdParam("id"),
  joinLiveClass
);

export default router;
