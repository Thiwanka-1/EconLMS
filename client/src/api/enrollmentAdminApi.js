import {
  apiRequest,
} from "./http.js";

import {
  createQueryString,
} from "../utils/queryString.js";

export const getAdminEnrollments = ({
  page = 1,
  limit = 20,
  courseId = "",
  status = "",
} = {}) => {
  return apiRequest(
    `/enrollments/admin/all${createQueryString({
      page,
      limit,
      courseId,
      status,
    })}`
  );
};

export const updateAdminEnrollmentStatus =
  ({
    enrollmentId,
    status,
    reason = "",
  }) => {
    return apiRequest(
      `/enrollments/${encodeURIComponent(
        enrollmentId
      )}/status`,
      {
        method: "PATCH",

        body: {
          status,
          reason,
        },
      }
    );
  };