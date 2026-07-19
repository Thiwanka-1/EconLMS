import express from "express";

import {
  archiveCourse,
  createCourse,
  getAllCoursesAdmin,
  getCourseByIdAdmin,
  getPublishedCourseByIdentifier,
  getPublishedCourses,
  restoreCourse,
  setCourseEnrollmentStatus,
  setCoursePublication,
  updateCourse,
} from "../controllers/courseController.js";

import {
  authorize,
  protect,
} from "../middlewares/authMiddleware.js";

import validateObjectId from "../middlewares/validateObjectId.js";

const router = express.Router();

/*
 * Admin routes must be declared before /:identifier.
 */

router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  getAllCoursesAdmin
);

router.get(
  "/admin/:id",
  protect,
  authorize("admin"),
  validateObjectId,
  getCourseByIdAdmin
);

router.post(
  "/",
  protect,
  authorize("admin"),
  createCourse
);

router.patch(
  "/:id",
  protect,
  authorize("admin"),
  validateObjectId,
  updateCourse
);

router.patch(
  "/:id/publication",
  protect,
  authorize("admin"),
  validateObjectId,
  setCoursePublication
);

router.patch(
  "/:id/enrollment-status",
  protect,
  authorize("admin"),
  validateObjectId,
  setCourseEnrollmentStatus
);

router.patch(
  "/:id/archive",
  protect,
  authorize("admin"),
  validateObjectId,
  archiveCourse
);

router.patch(
  "/:id/restore",
  protect,
  authorize("admin"),
  validateObjectId,
  restoreCourse
);

/*
 * Public routes.
 */

router.get("/", getPublishedCourses);

router.get(
  "/:identifier",
  getPublishedCourseByIdentifier
);

export default router;