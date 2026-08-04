import {
  apiRequest,
} from "./http.js";

import {
  createQueryString,
} from "../utils/queryString.js";

export const getMyNotifications = ({
  page = 1,
  limit = 20,
  unreadOnly = false,
  type = "",
} = {}) => {
  return apiRequest(
    `/notifications/me${createQueryString({
      page,
      limit,
      unreadOnly:
        unreadOnly
          ? "true"
          : "",
      type,
    })}`
  );
};

export const getMyUnreadNotificationCount =
  () => {
    return apiRequest(
      "/notifications/me/unread-count"
    );
  };

export const markMyNotificationRead = (
  notificationId
) => {
  return apiRequest(
    `/notifications/${encodeURIComponent(
      notificationId
    )}/read`,
    {
      method: "PATCH",
    }
  );
};

export const markAllMyNotificationsRead =
  () => {
    return apiRequest(
      "/notifications/me/read-all",
      {
        method: "PATCH",
      }
    );
  };