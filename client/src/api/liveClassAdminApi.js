import {
  apiRequest,
} from "./http.js";

import {
  createQueryString,
} from "../utils/queryString.js";

export const getAdminLiveClasses = ({
  courseId = "",
  status = "",
} = {}) => {
  return apiRequest(
    `/live-classes/admin/all${createQueryString({
      courseId,
      status,
    })}`
  );
};

export const createAdminLiveClass = (
  fields
) => {
  return apiRequest(
    "/live-classes",
    {
      method: "POST",
      body: fields,
    }
  );
};

export const syncAdminLiveClass = (
  liveClassId
) => {
  return apiRequest(
    `/live-classes/admin/${encodeURIComponent(
      liveClassId
    )}/sync`,
    {
      method: "POST",
    }
  );
};

export const refreshAdminLiveClass = ({
  liveClassId,
  keepCustomTitle = true,
}) => {
  return apiRequest(
    `/live-classes/admin/${encodeURIComponent(
      liveClassId
    )}/refresh`,
    {
      method: "PATCH",

      body: {
        keepCustomTitle,
      },
    }
  );
};

export const updateAdminLiveClassStatus = ({
  liveClassId,
  status,
  isPublished,
}) => {
  const body = {};

  if (status !== undefined) {
    body.status = status;
  }

  if (isPublished !== undefined) {
    body.isPublished =
      isPublished;
  }

  return apiRequest(
    `/live-classes/admin/${encodeURIComponent(
      liveClassId
    )}/status`,
    {
      method: "PATCH",
      body,
    }
  );
};

export const deleteAdminLiveClass = (liveClassId, confirmation) => {
  return apiRequest(`/live-classes/admin/${encodeURIComponent(liveClassId)}`, {
    method: "DELETE",
    body: { confirmation },
  });
};
