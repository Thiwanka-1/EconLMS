import { DateTime } from "luxon";

const addError = (errors, condition, message) => {
  if (condition) {
    errors.push(message);
  }
};

const hasValue = (name) => String(process.env[name] || "").trim() !== "";

const hasAnyValue = (names) => names.some(hasValue);

const requireAll = (errors, names, groupName) => {
  const missing = names.filter((name) => !hasValue(name));

  if (missing.length > 0) {
    errors.push(`${groupName} is incomplete. Missing: ${missing.join(", ")}`);
  }
};

const isPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
};

const validateOrigin = ({ errors, origin, production }) => {
  try {
    const parsedOrigin = new URL(origin);
    const normalizedInput = origin.endsWith("/") ? origin.slice(0, -1) : origin;

    addError(
      errors,
      parsedOrigin.origin !== normalizedInput,
      `CLIENT_ORIGINS must contain origins without paths, queries or fragments: ${origin}`
    );

    addError(
      errors,
      production && parsedOrigin.protocol !== "https:",
      `Production origin must use HTTPS: ${origin}`
    );
  } catch {
    errors.push(`Invalid CLIENT_ORIGINS value: ${origin}`);
  }
};

export const validateEnvironment = () => {
  const errors = [];
  const production = process.env.NODE_ENV === "production";
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  addError(errors, !mongoUri, "MONGODB_URI or MONGO_URI is required.");

  addError(errors, !process.env.JWT_SECRET, "JWT_SECRET is required.");
  addError(
    errors,
    Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32),
    "JWT_SECRET must contain at least 32 characters."
  );

  addError(errors, !process.env.OTP_HASH_SECRET, "OTP_HASH_SECRET is required.");
  addError(
    errors,
    Boolean(process.env.OTP_HASH_SECRET && process.env.OTP_HASH_SECRET.length < 32),
    "OTP_HASH_SECRET must contain at least 32 characters."
  );

  addError(
    errors,
    hasValue("OTP_EXPIRES_MINUTES") && !isPositiveNumber(process.env.OTP_EXPIRES_MINUTES),
    "OTP_EXPIRES_MINUTES must be a positive number."
  );

  addError(
    errors,
    hasValue("OTP_RESEND_COOLDOWN_SECONDS") &&
      !isPositiveNumber(process.env.OTP_RESEND_COOLDOWN_SECONDS),
    "OTP_RESEND_COOLDOWN_SECONDS must be a positive number."
  );

  addError(
  errors,
  hasValue("PLAYBACK_HEARTBEAT_SECONDS") &&
    !isPositiveNumber(process.env.PLAYBACK_HEARTBEAT_SECONDS),
  "PLAYBACK_HEARTBEAT_SECONDS must be a positive number."
);

addError(
  errors,
  hasValue("PLAYBACK_STALE_MINUTES") &&
    !isPositiveNumber(process.env.PLAYBACK_STALE_MINUTES),
  "PLAYBACK_STALE_MINUTES must be a positive number."
);

if (
  isPositiveNumber(process.env.PLAYBACK_HEARTBEAT_SECONDS) &&
  isPositiveNumber(process.env.PLAYBACK_STALE_MINUTES)
) {
  const heartbeatSeconds =
    Number(process.env.PLAYBACK_HEARTBEAT_SECONDS);

  const staleSeconds =
    Number(process.env.PLAYBACK_STALE_MINUTES) * 60;

  addError(
    errors,
    staleSeconds <= heartbeatSeconds * 2,
    "PLAYBACK_STALE_MINUTES must allow more than two heartbeat intervals."
  );
}

  const timezone = process.env.APP_TIMEZONE || "Asia/Colombo";
  const timezoneCheck = DateTime.now().setZone(timezone);

  addError(errors, !timezoneCheck.isValid, `APP_TIMEZONE is invalid: ${timezone}`);

  const sameSite = String(process.env.COOKIE_SAME_SITE || "lax").trim().toLowerCase();
  const cookieSecure = String(process.env.COOKIE_SECURE || "").trim().toLowerCase();

  addError(
    errors,
    !["strict", "lax", "none"].includes(sameSite),
    "COOKIE_SAME_SITE must be strict, lax or none."
  );

  addError(
    errors,
    cookieSecure && !["true", "false"].includes(cookieSecure),
    "COOKIE_SECURE must be true or false."
  );

  addError(
    errors,
    sameSite === "none" && cookieSecure !== "true",
    "COOKIE_SECURE must be true when COOKIE_SAME_SITE is none."
  );

  addError(
    errors,
    hasValue("COOKIE_MAX_AGE_DAYS") && !isPositiveNumber(process.env.COOKIE_MAX_AGE_DAYS),
    "COOKIE_MAX_AGE_DAYS must be a positive number."
  );

  const emailProvider = String(process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();

  addError(errors, emailProvider !== "smtp", "EMAIL_PROVIDER must be set to smtp.");
  requireAll(
    errors,
    ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"],
    "SMTP email configuration"
  );

  addError(
    errors,
    hasValue("SMTP_PORT") && !isPositiveNumber(process.env.SMTP_PORT),
    "SMTP_PORT must be a positive number."
  );

  const smtpSecure = String(process.env.SMTP_SECURE || "false").trim().toLowerCase();

  addError(
    errors,
    !["true", "false"].includes(smtpSecure),
    "SMTP_SECURE must be true or false."
  );

  if (hasValue("PAYMENT_REMINDER_DAYS_BEFORE")) {
    const reminderDays = process.env.PAYMENT_REMINDER_DAYS_BEFORE
      .split(",")
      .map((value) => Number.parseInt(value.trim(), 10));

    addError(
      errors,
      reminderDays.length === 0 ||
        reminderDays.some(
          (value) => !Number.isInteger(value) || value < 0 || value > 31
        ),
      "PAYMENT_REMINDER_DAYS_BEFORE must be comma-separated whole numbers from 0 to 31."
    );
  }

  if (hasValue("PAYMENT_REMINDER_HOUR")) {
    const reminderHour = Number.parseInt(process.env.PAYMENT_REMINDER_HOUR, 10);

    addError(
      errors,
      !Number.isInteger(reminderHour) || reminderHour < 0 || reminderHour > 23,
      "PAYMENT_REMINDER_HOUR must be a whole number from 0 to 23."
    );
  }

  const clientOrigins = String(process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (production) {
    addError(errors, clientOrigins.length === 0, "CLIENT_ORIGINS is required in production.");
    addError(errors, cookieSecure !== "true", "COOKIE_SECURE must be true in production.");

    addError(
      errors,
      process.env.BILLING_CRON_TEST_MODE === "true",
      "BILLING_CRON_TEST_MODE must be false in production."
    );

    addError(
      errors,
      Boolean(process.env.TEST_BILLING_DATE),
      "TEST_BILLING_DATE must be empty in production."
    );

    addError(
      errors,
      process.env.TRUST_PROXY === undefined,
      "TRUST_PROXY must be explicitly configured in production."
    );
  }

  for (const origin of clientOrigins) {
    validateOrigin({ errors, origin, production });
  }

  if (hasValue("CLIENT_URL")) {
    try {
      const clientUrl = new URL(process.env.CLIENT_URL);
      const normalizedInput = process.env.CLIENT_URL.endsWith("/")
        ? process.env.CLIENT_URL.slice(0, -1)
        : process.env.CLIENT_URL;

      addError(
        errors,
        clientUrl.origin !== normalizedInput,
        "CLIENT_URL must be an origin without a path, query or fragment."
      );

      addError(
        errors,
        production && clientUrl.protocol !== "https:",
        "CLIENT_URL must use HTTPS in production."
      );
    } catch {
      errors.push("CLIENT_URL must be a valid URL.");
    }
  }

  const zoomVariables = [
    "ZOOM_ACCOUNT_ID",
    "ZOOM_CLIENT_ID",
    "ZOOM_CLIENT_SECRET",
    "ZOOM_LINK_ENCRYPTION_KEY",
  ];

  if (hasAnyValue(zoomVariables)) {
    requireAll(errors, zoomVariables, "Zoom configuration");

    addError(
      errors,
      Boolean(
        process.env.ZOOM_LINK_ENCRYPTION_KEY &&
          !/^[a-fA-F0-9]{64}$/.test(process.env.ZOOM_LINK_ENCRYPTION_KEY)
      ),
      "ZOOM_LINK_ENCRYPTION_KEY must be a 64-character hexadecimal value."
    );
  }

  const driveVariables = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN",
    "GDRIVE_PAYMENT_SLIPS_FOLDER_ID",
    "GDRIVE_NIC_DOCUMENTS_FOLDER_ID",
  ];

  if (hasAnyValue(driveVariables)) {
    requireAll(errors, driveVariables, "Google Drive configuration");
  }

  if (errors.length > 0) {
    throw new Error(
      ["Environment validation failed:", ...errors.map((message) => `- ${message}`)].join("\n")
    );
  }

  console.log("[ENV] Environment validation passed.");
};
