import {
  apiRequest,
} from "./http.js";

export const getMyEnrollments =
  () => {
    return apiRequest(
      "/enrollments/my"
    );
  };

export const getMyCourseAccess = (
  courseId
) => {
  return apiRequest(
    `/enrollments/my/${encodeURIComponent(
      courseId
    )}/access`
  );
};

export const submitCoursePaymentSlip = ({
  courseId,
  file,
}) => {
  const formData =
    new FormData();

  formData.append(
    "slip",
    file
  );

  return apiRequest(
    `/enrollments/${encodeURIComponent(
      courseId
    )}/payment-slip`,
    {
      method: "POST",
      body: formData,
    }
  );
};
