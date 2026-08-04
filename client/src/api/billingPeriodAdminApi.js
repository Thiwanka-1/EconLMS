import {
  apiRequest,
} from "./http.js";

export const getAdminBillingPeriods =
  (courseId) => {
    return apiRequest(
      `/billing-periods/admin/course/${encodeURIComponent(
        courseId
      )}`
    );
  };

export const createAdminBillingPeriod =
  (fields) => {
    return apiRequest(
      "/billing-periods",
      {
        method: "POST",
        body: fields,
      }
    );
  };

export const updateAdminBillingPeriod =
  (
    billingPeriodId,
    fields
  ) => {
    return apiRequest(
      `/billing-periods/${encodeURIComponent(
        billingPeriodId
      )}`,
      {
        method: "PATCH",
        body: fields,
      }
    );
  };

export const setAdminBillingPeriodStatus =
  (
    billingPeriodId,
    fields
  ) => {
    return apiRequest(
      `/billing-periods/${encodeURIComponent(
        billingPeriodId
      )}/status`,
      {
        method: "PATCH",
        body: fields,
      }
    );
  };

export const archiveAdminBillingPeriod =
  (billingPeriodId) => {
    return apiRequest(
      `/billing-periods/${encodeURIComponent(
        billingPeriodId
      )}/archive`,
      {
        method: "PATCH",
      }
    );
  };

export const restoreAdminBillingPeriod =
  (billingPeriodId) => {
    return apiRequest(
      `/billing-periods/${encodeURIComponent(
        billingPeriodId
      )}/restore`,
      {
        method: "PATCH",
      }
    );
  };