import {
  apiRequest,
} from "./http.js";

import {
  createQueryString,
} from "../utils/queryString.js";

export const getAdminAuditLogs = ({
  page = 1,
  limit = 25,
  action = "",
  entityType = "",
  outcome = "",
  actorId = "",
  targetUserId = "",
  entityId = "",
  from = "",
  to = "",
} = {}) => {
  return apiRequest(
    `/audit-logs${createQueryString({
      page,
      limit,
      action,
      entityType,
      outcome,
      actorId,
      targetUserId,
      entityId,
      from,
      to,
    })}`
  );
};

export const getAdminAuditLog = (
  auditLogId
) => {
  return apiRequest(
    `/audit-logs/${encodeURIComponent(
      auditLogId
    )}`
  );
};