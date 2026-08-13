import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AuthSession from "../models/AuthSession.js";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";
import { getCookieName } from "../utils/token.js";

export const protect = asyncHandler(
  async (req, res, next) => {
    const token =
      req.cookies?.[getCookieName()];

    if (!token) {
      throw new HttpError(
        401,
        "Authentication is required."
      );
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch {
      throw new HttpError(
        401,
        "Your login session is invalid or expired."
      );
    }

    if (!decoded.sid) {
      throw new HttpError(
        401,
        "Your login session must be renewed. Please log in again."
      );
    }

    const [user, authSession] = await Promise.all([
      User.findById(decoded.sub),
      AuthSession.findOne({
        _id: decoded.sid,
        user: decoded.sub,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }),
    ]);

    if (!user) {
      throw new HttpError(
        401,
        "The account connected to this session no longer exists."
      );
    }

    if (!user.isActive) {
      throw new HttpError(
        403,
        "Your account has been disabled."
      );
    }

    if (!authSession) {
      throw new HttpError(
        401,
        "This login session has ended. Please log in again."
      );
    }

    if (
      Number(decoded.ver || 0) !==
      Number(user.authVersion || 0)
    ) {
      throw new HttpError(
        401,
        "Your login session has expired. Please log in again."
      );
    }

    if (
      Number(authSession.authVersion || 0) !==
      Number(user.authVersion || 0)
    ) {
      throw new HttpError(
        401,
        "Your login session has expired. Please log in again."
      );
    }

    req.user = user;
    req.authSession = authSession;

    const lastSeenTime = new Date(authSession.lastSeenAt).getTime();

    if (!Number.isFinite(lastSeenTime) || Date.now() - lastSeenTime > 5 * 60 * 1000) {
      authSession.lastSeenAt = new Date();
      await authSession.save();
    }

    next();
  }
);

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (
      !req.user ||
      !allowedRoles.includes(req.user.role)
    ) {
      return next(
        new HttpError(
          403,
          "You do not have permission to perform this action."
        )
      );
    }

    next();
  };
};
