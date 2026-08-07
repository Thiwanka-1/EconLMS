import { DateTime } from "luxon";

import BillingPeriod from "../models/BillingPeriod.js";
import Enrollment from "../models/Enrollment.js";
import PaymentSubmission from "../models/PaymentSubmission.js";

import {
  createPaymentReminderEmail,
} from "../utils/emailTemplates.js";

import {
  createUserNotification,
} from "./notificationService.js";

const getTimezone = () => {
  return process.env.APP_TIMEZONE || "Asia/Colombo";
};

export const getPaymentReminderDays = () => {
  const parsedDays = String(
    process.env.PAYMENT_REMINDER_DAYS_BEFORE || "6,3",
  )
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 31);

  return [...new Set(parsedDays)].sort((left, right) => right - left);
};

export const getApplicableReminderDay = (reminderDays, daysRemaining) => {
  if (daysRemaining < 0) {
    return null;
  }

  const eligible = reminderDays.filter((day) => day >= daysRemaining);
  return eligible.length > 0 ? Math.min(...eligible) : null;
};

const getDaysUntilDeadline = (deadline, now) => {
  const timezone = getTimezone();
  const today = DateTime.fromJSDate(now).setZone(timezone).startOf("day");
  const deadlineDay = DateTime.fromJSDate(deadline)
    .setZone(timezone)
    .startOf("day");

  return Math.round(deadlineDay.diff(today, "days").days);
};

export const sendDuePaymentReminders = async ({
  now = new Date(),
  source = "scheduled",
} = {}) => {
  const reminderDays = getPaymentReminderDays();

  if (reminderDays.length === 0) {
    return {
      source,
      eligible: 0,
      sent: 0,
      failed: 0,
    };
  }

  const periodCandidates = await BillingPeriod.find({
    paymentDeadline: { $ne: null },
    isPublished: true,
    isPaymentOpen: true,
    isArchived: false,
  }).populate("course", "title paymentPlan isPublished isArchived");

  const periods = periodCandidates
    .map((billingPeriod) => ({
      billingPeriod,
      daysRemaining: getDaysUntilDeadline(billingPeriod.paymentDeadline, now),
    }))
    .map((entry) => ({
      ...entry,
      reminderDay: getApplicableReminderDay(reminderDays, entry.daysRemaining),
    }))
    .filter(
      ({ billingPeriod, reminderDay }) =>
        billingPeriod.course?.paymentPlan === "monthly" &&
        billingPeriod.course.isPublished &&
        !billingPeriod.course.isArchived &&
        reminderDay !== null,
    );

  if (periods.length === 0) {
    return {
      source,
      eligible: 0,
      sent: 0,
      failed: 0,
    };
  }

  const periodIds = periods.map(({ billingPeriod }) => billingPeriod._id);
  const courseIds = periods.map(({ billingPeriod }) => billingPeriod.course._id);

  const [enrollments, pendingPayments] = await Promise.all([
    Enrollment.find({
      course: { $in: courseIds },
      paymentPlan: "monthly",
      status: { $in: ["active", "pending"] },
    }).populate("student", "firstName lastName email isActive isEmailVerified"),

    PaymentSubmission.find({
      billingPeriod: { $in: periodIds },
      status: "pending",
    }).select("student billingPeriod"),
  ]);

  const pendingKeys = new Set(
    pendingPayments.map(
      (payment) => `${payment.student}/${payment.billingPeriod}`,
    ),
  );

  const results = [];

  for (const { billingPeriod, daysRemaining, reminderDay } of periods) {
    const periodId = billingPeriod._id.toString();
    const courseId = billingPeriod.course._id.toString();
    const deadlineLabel = DateTime.fromJSDate(billingPeriod.paymentDeadline)
      .setZone(getTimezone())
      .toFormat("dd LLLL yyyy, hh:mm a");

    for (const enrollment of enrollments) {
      if (
        enrollment.course.toString() !== courseId ||
        !enrollment.student?.isActive ||
        !enrollment.student?.isEmailVerified ||
        enrollment.approvedBillingPeriods.some(
          (approvedId) => approvedId.toString() === periodId,
        ) ||
        pendingKeys.has(`${enrollment.student._id}/${periodId}`)
      ) {
        continue;
      }

      const actionUrl = "/student/payments";
      const timing = daysRemaining === 0
        ? "today"
        : daysRemaining === 1
          ? "tomorrow"
          : `in ${daysRemaining} days`;

      results.push(
        createUserNotification({
          recipient: enrollment.student,
          type: "payment_reminder",
          title: "Payment deadline approaching",
          message: `Your payment for ${billingPeriod.course.title} — ${billingPeriod.label} is due ${timing} (${deadlineLabel}).`,
          actionUrl,
          data: {
            courseId: billingPeriod.course._id,
            billingPeriodId: billingPeriod._id,
            paymentDeadline: billingPeriod.paymentDeadline,
            daysRemaining,
            scheduledReminderDay: reminderDay,
          },
          deduplicationKey: `payment-reminder/${periodId}/${enrollment.student._id}/${reminderDay}`,
          emailTemplate: createPaymentReminderEmail({
            student: enrollment.student,
            courseTitle: billingPeriod.course.title,
            periodLabel: billingPeriod.label,
            deadlineLabel,
            daysRemaining,
            actionUrl,
          }),
        }),
      );
    }
  }

  const settled = await Promise.allSettled(results);
  const failed = settled.filter((result) => result.status === "rejected");

  for (const result of failed) {
    console.error(
      "[PAYMENT_REMINDER] Notification failed:",
      result.reason?.message || result.reason,
    );
  }

  const summary = {
    source,
    eligible: settled.length,
    sent: settled.length - failed.length,
    failed: failed.length,
  };

  console.log("[PAYMENT_REMINDER] Completed:", summary);

  return summary;
};
