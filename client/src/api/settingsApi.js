import {
  apiRequest,
} from "./http.js";

export const getPublicPlatformSettings = () => {
  return apiRequest("/settings/public");
};
