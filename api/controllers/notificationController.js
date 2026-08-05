import Notification from "../models/Notification.js";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

const notificationTypes = new Set([
  "payment_approved",
  "payment_rejected",
  "payment_submitted",
  "nic_verified",
  "nic_rejected",
  "nic_submitted",
  "system",
]);

const publicNotificationFields =
  "recipient type title message actionUrl data isRead readAt createdAt updatedAt";

const getPagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 50);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const getMyNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { recipient: req.user._id };

  if (req.query.unreadOnly === "true") {
    filter.isRead = false;
  }

  if (req.query.type) {
    if (!notificationTypes.has(req.query.type)) {
      throw new HttpError(400, "Invalid notification type.");
    }

    filter.type = req.query.type;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .select(publicNotificationFields)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Notification.countDocuments(filter),

    Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    }),
  ]);

  res.status(200).json({
    success: true,
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    unreadCount,
  });
});

export const getMyUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    unreadCount,
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      recipient: req.user._id,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).select(publicNotificationFields);

  if (!notification) {
    throw new HttpError(404, "Notification not found.");
  }

  res.status(200).json({
    success: true,
    notification,
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    {
      recipient: req.user._id,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read.",
    modifiedCount: result.modifiedCount,
  });
});
