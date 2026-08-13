import AuthSession from "../models/AuthSession.js";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";
import { revokeAllUserSessions } from "../services/authSessionService.js";

const publicSessionFields =
  "deviceName browser operatingSystem lastSeenAt expiresAt createdAt";

export const getMySessions = asyncHandler(async (req, res) => {
  const sessions = await AuthSession.find({
    user: req.user._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
    authVersion: Number(req.user.authVersion || 0),
  })
    .select(publicSessionFields)
    .sort({ lastSeenAt: -1 });

  res.status(200).json({
    success: true,
    sessions: sessions.map((session) => ({
      ...session.toJSON(),
      isCurrent: session._id.toString() === req.authSession._id.toString(),
    })),
  });
});

export const revokeMySession = asyncHandler(async (req, res) => {
  if (req.params.sessionId === req.authSession._id.toString()) {
    throw new HttpError(400, "Use Sign out to end the session on this device.");
  }

  const session = await AuthSession.findOneAndUpdate(
    {
      _id: req.params.sessionId,
      user: req.user._id,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
        revocationReason: "remote_logout",
      },
    },
    { returnDocument: "after" }
  );

  if (!session) {
    throw new HttpError(404, "Active login session not found.");
  }

  res.status(200).json({
    success: true,
    message: "The selected device has been signed out.",
  });
});

export const revokeMyOtherSessions = asyncHandler(async (req, res) => {
  const result = await revokeAllUserSessions({
    userId: req.user._id,
    exceptSessionId: req.authSession._id,
    reason: "remote_logout_all",
  });

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount || 0} other device session(s) signed out.`,
    revokedCount: result.modifiedCount || 0,
  });
});
