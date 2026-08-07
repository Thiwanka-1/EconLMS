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

export const createAdminUser = ({
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
}) => {
  return apiRequest("/users/admin", {
    method: "POST",
    body: {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    },
  });
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

export const deleteAdminStudent = (userId, confirmation) => {
  return apiRequest(`/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    body: { confirmation },
  });
};
