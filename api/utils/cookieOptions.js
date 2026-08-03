const VALID_SAME_SITE_VALUES = new Set([
  "strict",
  "lax",
  "none",
]);

const getSameSiteValue = () => {
  const configuredValue = String(
    process.env.COOKIE_SAME_SITE || "lax"
  ).toLowerCase();

  if (
    VALID_SAME_SITE_VALUES.has(
      configuredValue
    )
  ) {
    return configuredValue;
  }

  return "lax";
};

const getSecureValue = () => {
  if (
    process.env.COOKIE_SECURE !==
    undefined
  ) {
    return (
      process.env.COOKIE_SECURE ===
      "true"
    );
  }

  return (
    process.env.NODE_ENV ===
    "production"
  );
};

const getBaseCookieOptions = () => {
  const sameSite = getSameSiteValue();

  /*
   * Browsers require Secure=true when
   * SameSite=None is used.
   */
  const secure =
    sameSite === "none"
      ? true
      : getSecureValue();

  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };

  /*
   * Usually leave COOKIE_DOMAIN empty.
   * A host-only cookie is safer and works
   * correctly for localhost.
   */
  if (process.env.COOKIE_DOMAIN) {
    options.domain =
      process.env.COOKIE_DOMAIN;
  }

  return options;
};

export const getAuthCookieOptions = ({
  maxAgeMs,
} = {}) => {
  const options =
    getBaseCookieOptions();

  if (
    Number.isFinite(maxAgeMs) &&
    maxAgeMs > 0
  ) {
    options.maxAge = maxAgeMs;
  }

  return options;
};

export const getClearAuthCookieOptions =
  () => {
    /*
     * clearCookie must receive the same
     * path, domain, secure and sameSite values
     * used when the cookie was created.
     *
     * Do not include maxAge here.
     */
    return getBaseCookieOptions();
  };