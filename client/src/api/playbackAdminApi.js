import {
  apiRequest,
} from "./http.js";

import {
  createQueryString,
} from "../utils/queryString.js";

export const getAdminLessonViews = ({
  studentId = "",
  lessonId = "",
  courseId = "",
} = {}) => {
  return apiRequest(
    `/playback/admin/views${createQueryString({
      studentId,
      lessonId,
      courseId,
    })}`
  );
};

export const addAdminLessonViews = ({
  studentId,
  lessonId,
  count,
}) => {
  return apiRequest(
    `/playback/admin/students/${encodeURIComponent(
      studentId
    )}/lessons/${encodeURIComponent(
      lessonId
    )}/add-views`,
    {
      method: "PATCH",

      body: {
        count,
      },
    }
  );
};

export const resetAdminLessonViews = ({
  studentId,
  lessonId,
}) => {
  return apiRequest(
    `/playback/admin/students/${encodeURIComponent(
      studentId
    )}/lessons/${encodeURIComponent(
      lessonId
    )}/reset`,
    {
      method: "PATCH",
    }
  );
};