import {
  apiRequest,
} from "./http.js";

export const getMyPayments = ({
  courseId = "",
} = {}) => {
  const query =
    new URLSearchParams();

  if (courseId) {
    query.set(
      "courseId",
      courseId
    );
  }

  const queryString =
    query.toString();

  return apiRequest(
    `/payments/my${
      queryString
        ? `?${queryString}`
        : ""
    }`
  );
};
