import {
  apiBlobRequest,
  apiRequest,
} from "./http.js";

import {
  createQueryString,
} from "../utils/queryString.js";

export const getAdminPayments = ({
  page = 1,
  limit = 20,
  status = "",
  courseId = "",
  billingPeriodId = "",
  studentId = "",
} = {}) => {
  return apiRequest(
    `/payments/admin/all${createQueryString({
      page,
      limit,
      status,
      courseId,
      billingPeriodId,
      studentId,
    })}`
  );
};

export const getAdminPayment = (
  paymentId
) => {
  return apiRequest(
    `/payments/admin/${encodeURIComponent(
      paymentId
    )}`
  );
};

export const getAdminPaymentFile = (
  paymentId
) => {
  return apiBlobRequest(
    `/payments/admin/${encodeURIComponent(
      paymentId
    )}/file`
  );
};

export const approveAdminPayment = ({
  paymentId,
  reviewNote = "",
}) => {
  return apiRequest(
    `/payments/admin/${encodeURIComponent(
      paymentId
    )}/approve`,
    {
      method: "PATCH",
      body: {
        reviewNote,
      },
    }
  );
};

export const rejectAdminPayment = ({
  paymentId,
  reviewNote,
}) => {
  return apiRequest(
    `/payments/admin/${encodeURIComponent(
      paymentId
    )}/reject`,
    {
      method: "PATCH",
      body: {
        reviewNote,
      },
    }
  );
};