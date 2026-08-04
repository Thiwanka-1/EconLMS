import {
  apiRequest,
} from "./http.js";

import {
  createQueryString,
} from "../utils/queryString.js";

export const getAdminCourses = ({
  page = 1,
  limit = 20,
  search = "",
  category = "",
  paymentPlan = "",
  isPublished = "",
  isArchived = "",
} = {}) => {
  return apiRequest(
    `/courses/admin/all${createQueryString({
      page,
      limit,
      search,
      category,
      paymentPlan,
      isPublished,
      isArchived,
    })}`
  );
};

export const getAdminCourse = (
  courseId
) => {
  return apiRequest(
    `/courses/admin/${encodeURIComponent(
      courseId
    )}`
  );
};

export const createAdminCourse = (
  fields
) => {
  return apiRequest(
    "/courses",
    {
      method: "POST",
      body: fields,
    }
  );
};

export const updateAdminCourse = (
  courseId,
  fields
) => {
  return apiRequest(
    `/courses/${encodeURIComponent(
      courseId
    )}`,
    {
      method: "PATCH",
      body: fields,
    }
  );
};

export const setAdminCoursePublication =
  (
    courseId,
    isPublished
  ) => {
    return apiRequest(
      `/courses/${encodeURIComponent(
        courseId
      )}/publication`,
      {
        method: "PATCH",
        body: {
          isPublished,
        },
      }
    );
  };

export const setAdminCourseEnrollment =
  (
    courseId,
    isEnrollmentOpen
  ) => {
    return apiRequest(
      `/courses/${encodeURIComponent(
        courseId
      )}/enrollment-status`,
      {
        method: "PATCH",
        body: {
          isEnrollmentOpen,
        },
      }
    );
  };

export const archiveAdminCourse = (
  courseId
) => {
  return apiRequest(
    `/courses/${encodeURIComponent(
      courseId
    )}/archive`,
    {
      method: "PATCH",
    }
  );
};

export const restoreAdminCourse = (
  courseId
) => {
  return apiRequest(
    `/courses/${encodeURIComponent(
      courseId
    )}/restore`,
    {
      method: "PATCH",
    }
  );
};