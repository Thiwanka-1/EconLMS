import {
  apiRequest,
} from "./http.js";

const createQueryString = (
  values
) => {
  const query =
    new URLSearchParams();

  for (const [
    key,
    value,
  ] of Object.entries(values)) {
    const normalizedValue =
      String(value || "").trim();

    if (normalizedValue) {
      query.set(
        key,
        normalizedValue
      );
    }
  }

  const queryString =
    query.toString();

  return queryString
    ? `?${queryString}`
    : "";
};

export const getPublishedCourses = ({
  search = "",
  category = "",
  paymentPlan = "",
} = {}) => {
  return apiRequest(
    `/courses${createQueryString({
      search,
      category,
      paymentPlan,
    })}`
  );
};

export const getPublishedCourse = (
  identifier
) => {
  return apiRequest(
    `/courses/${encodeURIComponent(
      identifier
    )}`
  );
};

export const getCurrentCourseBillingPeriod =
  (courseId) => {
    return apiRequest(
      `/billing-periods/course/${encodeURIComponent(
        courseId
      )}/current`
    );
  };
