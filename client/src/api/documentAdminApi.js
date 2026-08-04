import {
  apiBlobRequest,
  apiRequest,
} from "./http.js";

export const getAdminStudentNicStatus =
  (studentId) => {
    return apiRequest(
      `/documents/nic/admin/${encodeURIComponent(
        studentId
      )}/status`
    );
  };

export const getAdminStudentNicFile =
  (studentId) => {
    return apiBlobRequest(
      `/documents/nic/admin/${encodeURIComponent(
        studentId
      )}/file`
    );
  };

export const decideAdminStudentNic = ({
  studentId,
  status,
  note = "",
  expectedUploadedAt,
}) => {
  return apiRequest(
    `/documents/nic/admin/${encodeURIComponent(
      studentId
    )}/status`,
    {
      method: "PATCH",

      body: {
        status,
        note,
        expectedUploadedAt,
      },
    }
  );
};