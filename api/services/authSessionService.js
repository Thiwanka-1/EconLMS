import AuthSession from "../models/AuthSession.js";

import {
  normalizeSessionIp,
  parseSessionUserAgent,
} from "../utils/sessionMetadata.js";

const getPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getSessionDurationMilliseconds = () => {
  const rawValue = String(process.env.JWT_EXPIRES_IN || "7d").trim();
  const match = rawValue.match(/^(\d+)(s|m|h|d|w)?$/i);

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || "s").toLowerCase();
  const unitMilliseconds = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return amount * unitMilliseconds[unit];
};

export const createAuthSession = async ({ user, req }) => {
  const now = new Date();
  const userAgent = String(req.get("user-agent") || "").slice(0, 1000);
  const metadata = parseSessionUserAgent(userAgent);

  const session = await AuthSession.create({
    user: user._id,
    authVersion: Number(user.authVersion || 0),
    ...metadata,
    userAgent,
    ipAddress: normalizeSessionIp(req.ip || req.socket?.remoteAddress),
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + getSessionDurationMilliseconds()),
  });

  const maximumActiveSessions = getPositiveInteger(
    process.env.AUTH_MAX_ACTIVE_SESSIONS,
    10
  );

  const excessSessions = await AuthSession.find({
    user: user._id,
    revokedAt: null,
    expiresAt: { $gt: now },
    _id: { $ne: session._id },
  })
    .sort({ lastSeenAt: -1 })
    .skip(Math.max(maximumActiveSessions - 1, 0))
    .select("_id");

  if (excessSessions.length > 0) {
    await AuthSession.updateMany(
      { _id: { $in: excessSessions.map((item) => item._id) } },
      {
        $set: {
          revokedAt: now,
          revocationReason: "active_session_limit",
        },
      }
    );
  }

  return session;
};

export const revokeAllUserSessions = async ({
  userId,
  reason,
  exceptSessionId = null,
}) => {
  const filter = {
    user: userId,
    revokedAt: null,
  };

  if (exceptSessionId) {
    filter._id = { $ne: exceptSessionId };
  }

  return AuthSession.updateMany(filter, {
    $set: {
      revokedAt: new Date(),
      revocationReason: String(reason || "revoked").slice(0, 100),
    },
  });
};
