import {
  randomUUID,
} from "node:crypto";

import {
  rateLimit,
} from "express-rate-limit";

import HttpError from "../utils/HttpError.js";

const getPositiveInteger = (
  value,
  fallback
) => {
  const parsed = Number.parseInt(
    value,
    10
  );

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
};

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const getAllowedOrigins = () => {
  const configuredOrigins = [
    process.env.CLIENT_ORIGINS,
    process.env.CLIENT_URL,
  ]
    .flatMap((value) =>
      String(value || "").split(",")
    )
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return new Set(configuredOrigins);
  }

  if (
    process.env.NODE_ENV !== "production"
  ) {
    return new Set([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]);
  }

  return new Set();
};

export const corsOptions = {
  origin(origin, callback) {
    /*
     * Requests from Postman, curl and
     * server-to-server clients may not
     * include an Origin header.
     */
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin =
      normalizeOrigin(origin);

    const allowedOrigins =
      getAllowedOrigins();

    if (
      normalizedOrigin &&
      allowedOrigins.has(
        normalizedOrigin
      )
    ) {
      return callback(null, true);
    }

    return callback(
      new HttpError(
        403,
        "Request origin is not allowed."
      )
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Request-ID",
    "X-CSRF-Token",
  ],

  exposedHeaders: [
    "X-Request-ID",
    "RateLimit",
    "RateLimit-Policy",
    "Retry-After",
  ],

  maxAge: 86400,
};

export const requestIdMiddleware = (
  req,
  res,
  next
) => {
  const requestId = randomUUID();

  req.id = requestId;

  res.setHeader(
    "X-Request-ID",
    requestId
  );

  next();
};

const unsafeMethods = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

/*
 * CORS does not block all requests.
 * This middleware rejects browser write
 * requests from an unapproved origin.
 */
export const verifyRequestOrigin = (
  req,
  res,
  next
) => {
  if (!unsafeMethods.has(req.method)) {
    return next();
  }

  const origin = req.get("origin");

  /*
   * Allow Postman, mobile clients and
   * server-to-server requests without Origin.
   */
  if (!origin) {
    return next();
  }

  const normalizedOrigin =
    normalizeOrigin(origin);

  if (
    normalizedOrigin &&
    getAllowedOrigins().has(
      normalizedOrigin
    )
  ) {
    return next();
  }

  return next(
    new HttpError(
      403,
      "Request origin is not allowed."
    )
  );
};

const suspiciousKeys = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

const inspectInput = (
  value,
  {
    depth = 0,
    state,
  }
) => {
  if (depth > 20) {
    throw new HttpError(
      400,
      "Input nesting is too deep."
    );
  }

  state.nodes += 1;

  if (state.nodes > 5000) {
    throw new HttpError(
      413,
      "Request input is too large."
    );
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      inspectInput(item, {
        depth: depth + 1,
        state,
      });
    }

    return;
  }

  if (
    value === null ||
    typeof value !== "object"
  ) {
    return;
  }

  for (const [
    key,
    nestedValue,
  ] of Object.entries(value)) {
    const normalizedKey =
      String(key).toLowerCase();

    if (
      key.startsWith("$") ||
      key.includes(".") ||
      suspiciousKeys.has(
        normalizedKey
      )
    ) {
      throw new HttpError(
        400,
        "Request contains an invalid input key."
      );
    }

    inspectInput(nestedValue, {
      depth: depth + 1,
      state,
    });
  }
};

export const rejectDangerousInput = (
  req,
  res,
  next
) => {
  try {
    const state = {
      nodes: 0,
    };

    inspectInput(req.body, {
      state,
    });

    inspectInput(req.query, {
      state,
    });

    inspectInput(req.params, {
      state,
    });

    next();
  } catch (error) {
    next(error);
  }
};

const rateLimitHandler = (
  req,
  res,
  next,
  options
) => {
  res.status(options.statusCode).json({
    success: false,

    message:
      "Too many requests. Please wait and try again.",

    requestId: req.id,
  });
};

export const globalApiRateLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,

    limit: getPositiveInteger(
      process.env
        .GLOBAL_RATE_LIMIT_MAX,
      300
    ),

    standardHeaders: "draft-8",
    legacyHeaders: false,

    skip(req) {
      return req.path === "/health";
    },

    handler: rateLimitHandler,
  });

export const loginRateLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,

    limit: getPositiveInteger(
      process.env
        .LOGIN_RATE_LIMIT_MAX,
      10
    ),

    standardHeaders: "draft-8",
    legacyHeaders: false,

    /*
     * Only unsuccessful login attempts
     * count against the limit.
     */
    skipSuccessfulRequests: true,

    handler: rateLimitHandler,
  });

export const otpSendRateLimiter =
  rateLimit({
    windowMs: 60 * 60 * 1000,

    limit: getPositiveInteger(
      process.env
        .OTP_SEND_RATE_LIMIT_MAX,
      5
    ),

    standardHeaders: "draft-8",
    legacyHeaders: false,

    handler: rateLimitHandler,
  });

export const sensitiveActionRateLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    handler: rateLimitHandler,
  });

export const uploadRateLimiter =
  rateLimit({
    windowMs: 60 * 60 * 1000,

    limit: getPositiveInteger(
      process.env
        .UPLOAD_RATE_LIMIT_MAX,
      20
    ),

    standardHeaders: "draft-8",
    legacyHeaders: false,

    handler: rateLimitHandler,
  });

export const getTrustProxySetting =
  () => {
    const value = String(
      process.env.TRUST_PROXY || "0"
    )
      .trim()
      .toLowerCase();

    if (value === "true") {
      return true;
    }

    if (
      value === "false" ||
      value === "0"
    ) {
      return false;
    }

    const numericValue =
      Number.parseInt(value, 10);

    if (
      Number.isInteger(numericValue) &&
      numericValue >= 0
    ) {
      return numericValue;
    }

    return value;
  };