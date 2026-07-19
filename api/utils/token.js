import jwt from "jsonwebtoken";

export const getCookieName = () => {
  return process.env.COOKIE_NAME || "econlls_auth";
};

export const generateAuthToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing.");
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      ver: user.authVersion || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

export const getCookieOptions = () => {
  const maxAgeDays = Number(
    process.env.COOKIE_MAX_AGE_DAYS || 7
  );

  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production";

  const options = {
    httpOnly: true,
    secure,
    sameSite:
      process.env.COOKIE_SAME_SITE || "lax",
    path: "/",
    maxAge:
      maxAgeDays * 24 * 60 * 60 * 1000,
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
};

export const setAuthCookie = (res, token) => {
  res.cookie(
    getCookieName(),
    token,
    getCookieOptions()
  );
};

export const clearAuthCookie = (res) => {
  const { maxAge, ...clearOptions } =
    getCookieOptions();

  res.clearCookie(
    getCookieName(),
    clearOptions
  );
};