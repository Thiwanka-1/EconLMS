import express from "express";

import {
  archiveLesson,
  createLesson,
  getAdminLessonsByCourse,
  getStudentLessonsByCourse,
  restoreLesson,
  setLessonPublication,
  updateLesson,
} from "../controllers/lessonController.js";
import { deleteLessonPermanently } from "../controllers/cleanupController.js";

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
 * Admin routes.
 */
router.get(
  "/admin/course/:courseId",
  authorize("admin"),
  validateObjectIdParam("courseId"),
  getAdminLessonsByCourse
);

router.post(
  "/",
  authorize("admin"),
  createLesson
);

router.patch(
  "/:id",
  authorize("admin"),
  validateObjectIdParam("id"),
  updateLesson
);

router.delete(
  "/:id",
  authorize("admin"),
  validateObjectIdParam("id"),
  deleteLessonPermanently
);

router.patch(
  "/:id/publication",
  authorize("admin"),
  validateObjectIdParam("id"),
  setLessonPublication
);

router.patch(
  "/:id/archive",
  authorize("admin"),
  validateObjectIdParam("id"),
  archiveLesson
);

router.patch(
  "/:id/restore",
  authorize("admin"),
  validateObjectIdParam("id"),
  restoreLesson
);

/*
 * Student lesson list.
 */
router.get(
  "/course/:courseId",
  authorize("student"),
  validateObjectIdParam("courseId"),
  getStudentLessonsByCourse
);

export default router;
