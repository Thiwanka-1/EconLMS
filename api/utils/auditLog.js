import AuditLog from "../models/AuditLog.js";

const sensitiveKeyFragments = [
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "otp",
  "joinurl",
  "encryptedjoinurl",
  "refresh_token",
  "access_token",
  "nicimagefileid",
  "drivefileid",
  "gdrive",
];

const isSensitiveKey = (key) => {
  const normalizedKey = String(key || "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();

  return sensitiveKeyFragments.some(
    (fragment) =>
      normalizedKey.includes(fragment)
  );
};

const sanitizeMetadata = (metadata) => {
  try {
    const seenObjects = new WeakSet();

    const json = JSON.stringify(
      metadata || {},
      (key, value) => {
        if (isSensitiveKey(key)) {
          return "[REDACTED]";
        }

        if (Buffer.isBuffer(value)) {
          return "[BUFFER_REDACTED]";
        }

        if (
          value &&
          typeof value === "object" &&
          value.type === "Buffer" &&
          Array.isArray(value.data)
        ) {
          return "[BUFFER_REDACTED]";
        }

        if (
          value &&
          typeof value === "object"
        ) {
          if (seenObjects.has(value)) {
            return "[CIRCULAR]";
          }

          seenObjects.add(value);
        }

        return value;
      }
    );

    if (json.length > 20_000) {
      return {
        truncated: true,
        message:
          "Audit metadata exceeded the storage limit.",
      };
    }

    return JSON.parse(json);
  } catch {
    return {
      serializationError: true,
    };
  }
};

const getRequestPath = (req) => {
  const rawUrl =
    req?.originalUrl ||
    req?.url ||
    "";

  try {
    return new URL(
      rawUrl,
      "http://localhost"
    ).pathname;
  } catch {
    return String(rawUrl).split("?")[0];
  }
};

export const recordAuditLog = async ({
  req,
  action,
  entityType,
  entityId = null,
  targetUserId = null,
  description,
  metadata = {},
  outcome = "success",
}) => {
  try {
    const requestId =
      req?.id ||
      req?.get?.("x-request-id") ||
      "";

    return await AuditLog.create({
      actor: req?.user?._id || null,

      actorEmail:
        req?.user?.email || "",

      actorRole:
        req?.user?.role || "",

      action,
      entityType,
      entityId,
      targetUser: targetUserId,
      description,

      metadata:
        sanitizeMetadata(metadata),

      outcome,

      request: {
        method: req?.method || "",
        path: getRequestPath(req),
        ipAddress:
          req?.ip ||
          req?.socket?.remoteAddress ||
          "",
        userAgent:
          req?.get?.("user-agent") ||
          "",
        requestId,
      },
    });
  } catch (error) {
    /*
     * Audit-log failure should be visible in server
     * logs but must not reverse a completed payment
     * or NIC decision.
     */
    console.error(
      "[AUDIT_LOG] Failed to save audit record:",
      error.message
    );

    return null;
  }
};