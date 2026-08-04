import {
  apiRequest,
} from "./http.js";

export const getStudentLessons = (
  courseId
) => {
  return apiRequest(
    `/lessons/course/${encodeURIComponent(
      courseId
    )}`
  );
};
