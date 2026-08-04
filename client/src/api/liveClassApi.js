import {
  apiRequest,
} from "./http.js";

export const getStudentLiveClasses = (
  courseId
) => {
  return apiRequest(
    `/live-classes/course/${encodeURIComponent(
      courseId
    )}`
  );
};

export const joinStudentLiveClass = (
  liveClassId
) => {
  return apiRequest(
    `/live-classes/${encodeURIComponent(
      liveClassId
    )}/join`,
    {
      method: "POST",
    }
  );
};
