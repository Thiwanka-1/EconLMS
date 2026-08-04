import {
  apiRequest,
} from "./http.js";

export const getAdminLessons = (
  courseId
) => {
  return apiRequest(
    `/lessons/admin/course/${encodeURIComponent(
      courseId
    )}`
  );
};

export const createAdminLesson = (
  fields
) => {
  return apiRequest(
    "/lessons",
    {
      method: "POST",
      body: fields,
    }
  );
};

export const updateAdminLesson = (
  lessonId,
  fields
) => {
  return apiRequest(
    `/lessons/${encodeURIComponent(
      lessonId
    )}`,
    {
      method: "PATCH",
      body: fields,
    }
  );
};

export const setAdminLessonPublication =
  (
    lessonId,
    isPublished
  ) => {
    return apiRequest(
      `/lessons/${encodeURIComponent(
        lessonId
      )}/publication`,
      {
        method: "PATCH",
        body: {
          isPublished,
        },
      }
    );
  };

export const archiveAdminLesson = (
  lessonId
) => {
  return apiRequest(
    `/lessons/${encodeURIComponent(
      lessonId
    )}/archive`,
    {
      method: "PATCH",
    }
  );
};

export const restoreAdminLesson = (
  lessonId
) => {
  return apiRequest(
    `/lessons/${encodeURIComponent(
      lessonId
    )}/restore`,
    {
      method: "PATCH",
    }
  );
};