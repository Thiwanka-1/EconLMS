import {
  apiRequest,
} from "./http.js";

import {
  createQueryString,
} from "../utils/queryString.js";

export const getAdminUsers = ({
  page = 1,
  limit = 20,
  search = "",
  role = "student",
  isActive = "",
} = {}) => {
  return apiRequest(
    `/users${createQueryString({
      page,
      limit,
      search,
      role,
      isActive,
    })}`
  );
};

export const getAdminUser = (
  userId
) => {
  return apiRequest(
    `/users/${encodeURIComponent(
      userId
    )}`
  );
};

export const setAdminUserStatus = (
  userId,
  isActive
) => {
  return apiRequest(
    `/users/${encodeURIComponent(
      userId
    )}/status`,
    {
      method: "PATCH",
      body: {
        isActive,
      },
    }
  );
};