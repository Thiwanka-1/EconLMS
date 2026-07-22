import express from "express";

import {
  addExtraLessonViews,
  endPlayback,
  getLessonViewsAdmin,
  getMyLessonView,
  playbackHeartbeat,
  resetLessonViews,
  startPlayback,
} from "../controllers/playbackController.js";

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
 * Student playback routes.
 */
router.post(
  "/lessons/:lessonId/start",
  authorize("student"),
  validateObjectIdParam("lessonId"),
  startPlayback
);

router.get(
  "/lessons/:lessonId/me",
  authorize("student"),
  validateObjectIdParam("lessonId"),
  getMyLessonView
);

router.patch(
  "/:sessionId/heartbeat",
  authorize("student"),
  playbackHeartbeat
);

router.post(
  "/:sessionId/end",
  authorize("student"),
  endPlayback
);

/*
 * Admin view-management routes.
 */
router.get(
  "/admin/views",
  authorize("admin"),
  getLessonViewsAdmin
);

router.patch(
  "/admin/students/:studentId/lessons/:lessonId/add-views",
  authorize("admin"),
  validateObjectIdParam("studentId"),
  validateObjectIdParam("lessonId"),
  addExtraLessonViews
);

router.patch(
  "/admin/students/:studentId/lessons/:lessonId/reset",
  authorize("admin"),
  validateObjectIdParam("studentId"),
  validateObjectIdParam("lessonId"),
  resetLessonViews
);

export default router;