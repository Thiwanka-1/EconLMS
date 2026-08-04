import {
  apiRequest,
} from "./http.js";

export const getAdminPlatformSettings =
  () => {
    return apiRequest(
      "/settings/admin"
    );
  };

export const updateAdminPlatformSettings =
  (settings) => {
    return apiRequest(
      "/settings/admin",
      {
        method: "PATCH",
        body: settings,
      }
    );
  };