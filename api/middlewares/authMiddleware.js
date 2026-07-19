import jwt from "jsonwebtoken";
import User from "../models/User.js";
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

    const user = await User.findById(decoded.sub);

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

    if (
      Number(decoded.ver || 0) !==
      Number(user.authVersion || 0)
    ) {
      throw new HttpError(
        401,
        "Your login session has expired. Please log in again."
      );
    }

    req.user = user;

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