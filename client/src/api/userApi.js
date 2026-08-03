import {
  apiRequest,
} from "./http.js";

export const getUserById = (
  userId
) => {
  return apiRequest(
    `/users/${encodeURIComponent(
      userId
    )}`
  );
};

export const updateUserById = (
  userId,
  fields
) => {
  return apiRequest(
    `/users/${encodeURIComponent(
      userId
    )}`,
    {
      method: "PATCH",
      body: fields,
    }
  );
};
