import AuthenticationEmailHealth from "../models/AuthenticationEmailHealth.js";

import {
  createNotificationsForActiveAdmins,
} from "./adminNotificationService.js";

const getPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getAlertThreshold = () =>
  getPositiveInteger(process.env.AUTH_EMAIL_FAILURE_ALERT_THRESHOLD, 3);

const getAlertCooldownMilliseconds = () =>
  getPositiveInteger(process.env.AUTH_EMAIL_FAILURE_ALERT_COOLDOWN_MINUTES, 60) *
  60 *
  1000;

const safeErrorMessage = (error) =>
  String(error?.message || "Unknown SMTP error")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 500);

export const recordAuthenticationEmailSuccess = async ({ purpose }) => {
  try {
    await AuthenticationEmailHealth.findOneAndUpdate(
      { singletonKey: "authentication-email" },
      {
        $set: {
          consecutiveFailures: 0,
          firstFailureAt: null,
          lastSuccessAt: new Date(),
          lastPurpose: purpose || "unknown",
          lastError: "",
        },
        $setOnInsert: {
          singletonKey: "authentication-email",
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    console.error("[AUTH_EMAIL_MONITOR] Success recording failed:", error.message);
  }
};

export const recordAuthenticationEmailFailure = async ({ purpose, error }) => {
  try {
    const now = new Date();
    let health = await AuthenticationEmailHealth.findOne({
      singletonKey: "authentication-email",
    });

    if (!health) {
      health = new AuthenticationEmailHealth({
        singletonKey: "authentication-email",
      });
    }

    if (Number(health.consecutiveFailures || 0) === 0) {
      health.firstFailureAt = now;
    }

    health.consecutiveFailures = Number(health.consecutiveFailures || 0) + 1;
    health.lastFailureAt = now;
    health.lastPurpose = purpose || "unknown";
    health.lastError = safeErrorMessage(error);

    await health.save();

    if (health.consecutiveFailures < getAlertThreshold()) {
      return;
    }

    const alertBefore = new Date(now.getTime() - getAlertCooldownMilliseconds());
    const claimedAlert = await AuthenticationEmailHealth.findOneAndUpdate(
      {
        _id: health._id,
        consecutiveFailures: { $gte: getAlertThreshold() },
        $or: [
          { lastAlertedAt: null },
          { lastAlertedAt: { $lte: alertBefore } },
        ],
      },
      {
        $set: {
          lastAlertedAt: now,
        },
      },
      { returnDocument: "after" }
    );

    if (!claimedAlert) {
      return;
    }

    await createNotificationsForActiveAdmins({
      type: "system",
      title: "Authentication emails are failing",
      message:
        `${claimedAlert.consecutiveFailures} consecutive verification or password-reset emails failed. ` +
        "Check the SMTP configuration and API logs. Students may be unable to verify or recover accounts.",
      actionUrl: "/admin/settings",
      data: {
        category: "authentication_email_health",
        failureCount: claimedAlert.consecutiveFailures,
        lastPurpose: claimedAlert.lastPurpose,
        lastFailureAt: claimedAlert.lastFailureAt,
      },
      deduplicationKey: `admin-auth-email-failure/${claimedAlert.lastAlertedAt.getTime()}`,
    });
  } catch (monitorError) {
    console.error(
      "[AUTH_EMAIL_MONITOR] Failure recording or alerting failed:",
      monitorError.message
    );
  }
};
