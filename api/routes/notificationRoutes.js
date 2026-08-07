import express from "express";

import {
  deleteAllMyNotifications,
  deleteMyNotification,
  deleteMyReadNotifications,
  getMyNotifications,
  getMyUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notificationController.js";

import {
  protect,
} from "../middlewares/authMiddleware.js";

import {
  validateObjectIdParam,
} from "../middlewares/validateObjectId.js";

const router = express.Router();

router.use(protect);

router.get(
  "/me",
  getMyNotifications
);

router.get(
  "/me/unread-count",
  getMyUnreadCount
);

router.patch(
  "/me/read-all",
  markAllNotificationsRead
);

router.delete(
  "/me/read",
  deleteMyReadNotifications
);

router.delete(
  "/me",
  deleteAllMyNotifications
);

router.delete(
  "/:id",
  validateObjectIdParam("id"),
  deleteMyNotification
);

router.patch(
  "/:id/read",
  validateObjectIdParam("id"),
  markNotificationRead
);

export default router;
