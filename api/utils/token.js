import jwt from "jsonwebtoken";

import {
  getAuthCookieOptions,
  getClearAuthCookieOptions,
} from "./cookieOptions.js";

export const getCookieName = () => {
  return (
    process.env.COOKIE_NAME ||
    "econlls_auth"
  );
};

const getCookieMaxAgeMs = () => {
  const configuredDays = Number(
    process.env.COOKIE_MAX_AGE_DAYS ||
      7
  );

  const maxAgeDays =
    Number.isFinite(configuredDays) &&
    configuredDays > 0
      ? configuredDays
      : 7;

  return (
    maxAgeDays *
    24 *
    60 *
    60 *
    1000
  );
};

export const generateAuthToken = (
  user
) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is missing."
    );
  }

  if (!user?._id) {
    throw new Error(
      "A valid user is required to generate an authentication token."
    );
  }

  return jwt.sign(
    {
      sub: user._id.toString(),

      /*
       * Incrementing authVersion invalidates
       * previously issued tokens.
       */
      ver: user.authVersion || 0,
    },

    process.env.JWT_SECRET,

    {
      expiresIn:
        process.env.JWT_EXPIRES_IN ||
        "7d",
    }
  );
};

/*
 * This export is retained in case another
 * existing file already imports getCookieOptions.
 */
export const getCookieOptions = () => {
  return getAuthCookieOptions({
    maxAgeMs: getCookieMaxAgeMs(),
  });
};

export const setAuthCookie = (
  res,
  token
) => {
  if (!token) {
    throw new Error(
      "Authentication token is required."
    );
  }

  res.cookie(
    getCookieName(),
    token,
    getAuthCookieOptions({
      maxAgeMs: getCookieMaxAgeMs(),
    })
  );
};

export const clearAuthCookie = (
  res
) => {
  res.clearCookie(
    getCookieName(),
    getClearAuthCookieOptions()
  );
};