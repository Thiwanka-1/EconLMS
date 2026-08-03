import {
  apiBlobRequest,
  apiRequest,
} from "./http.js";

export const getMyNicStatus =
  () => {
    return apiRequest(
      "/documents/nic/me/status"
    );
  };

export const getMyNicImage =
  () => {
    return apiBlobRequest(
      "/documents/nic/me/file"
    );
  };

export const uploadMyNicImage = (
  file
) => {
  const formData =
    new FormData();

  formData.append(
    "nicImage",
    file
  );

  return apiRequest(
    "/documents/nic/me",
    {
      method: "PUT",
      body: formData,
    }
  );
};
