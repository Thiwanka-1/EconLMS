import { DateTime } from "luxon";

import BillingPeriod from "../models/BillingPeriod.js";
import HttpError from "./HttpError.js";

export const MONTHLY_PAYMENT_GRACE_END_DAY = 10;

export const getApplicationTimezone = () => {
  return process.env.APP_TIMEZONE || "Asia/Colombo";
};

const getTestBillingDate = () => {
  if (
    process.env.NODE_ENV !== "development" ||
    !process.env.TEST_BILLING_DATE
  ) {
    return null;
  }

  const testDate = DateTime.fromISO(process.env.TEST_BILLING_DATE, {
    zone: getApplicationTimezone(),
    setZone: true,
  });

  if (!testDate.isValid) {
    throw new Error(
      `Invalid TEST_BILLING_DATE: ${
        testDate.invalidExplanation || process.env.TEST_BILLING_DATE
      }`
    );
  }

  return testDate.toJSDate();
};

/**
 * Returns the application clock. The override is deliberately development-only
 * and is rejected by production environment validation.
 */
export const getBillingReferenceDate = (currentDate = null) => {
  return currentDate ?? getTestBillingDate() ?? new Date();
};

/**
 * Produces the fixed calendar rules for a monthly billing period.
 *
 * Example: August access begins on August 1 and ends at the end of September
 * 10. The August payment itself is due by the end of August 10.
 */
export const getMonthCycle = (year, month) => {
  const timezone = getApplicationTimezone();
  const monthStart = DateTime.fromObject(
    { year: Number(year), month: Number(month), day: 1 },
    { zone: timezone }
  ).startOf("day");

  if (!monthStart.isValid) {
    throw new Error(
      `Invalid billing month or application timezone: ${year}-${month} (${timezone})`
    );
  }

  const nextMonthStart = monthStart.plus({ months: 1 }).startOf("month");
  const paymentDeadline = monthStart
    .set({ day: MONTHLY_PAYMENT_GRACE_END_DAY })
    .endOf("day");
  const accessEndsAt = nextMonthStart
    .set({ day: MONTHLY_PAYMENT_GRACE_END_DAY })
    .endOf("day");

  return {
    year: monthStart.year,
    month: monthStart.month,
    label: monthStart.toFormat("LLLL yyyy"),
    accessStartsAt: monthStart.toUTC().toJSDate(),
    monthEndsAt: monthStart.endOf("month").toUTC().toJSDate(),
    accessEndsAt: accessEndsAt.toUTC().toJSDate(),
    paymentDeadline: paymentDeadline.toUTC().toJSDate(),
    timezone,
  };
};

export const getCurrentMonthCycle = (currentDate = null) => {
  const timezone = getApplicationTimezone();
  const referenceDate = getBillingReferenceDate(currentDate);
  const currentDateTime = DateTime.fromJSDate(referenceDate).setZone(timezone);

  if (!currentDateTime.isValid) {
    throw new Error(`Invalid application timezone: ${timezone}`);
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[BILLING_DATE] Using ${
        getTestBillingDate() ? "test date" : "real date"
      }: ${currentDateTime.toISO()}`
    );
  }

  return getMonthCycle(currentDateTime.year, currentDateTime.month);
};

export const getPreviousMonthCycle = (currentDate = null) => {
  const timezone = getApplicationTimezone();
  const referenceDate = getBillingReferenceDate(currentDate);
  const previousMonth = DateTime.fromJSDate(referenceDate)
    .setZone(timezone)
    .minus({ months: 1 });

  return getMonthCycle(previousMonth.year, previousMonth.month);
};

export const isWithinCurrentMonthGracePeriod = (currentDate = null) => {
  const referenceDate = getBillingReferenceDate(currentDate);
  const currentCycle = getCurrentMonthCycle(referenceDate);
  return referenceDate.getTime() <= currentCycle.paymentDeadline.getTime();
};

/**
 * Keeps historical records aligned with the fixed calendar rule without
 * changing prices, publication state, or payment state.
 */
export const synchronizeCourseBillingPeriodDates = async (courseId) => {
  const periods = await BillingPeriod.find({ course: courseId }).select(
    "year month accessStartsAt accessEndsAt paymentDeadline"
  );

  if (periods.length === 0) {
    return { matched: 0, modified: 0 };
  }

  const operations = periods.map((period) => {
    const cycle = getMonthCycle(period.year, period.month);

    return {
      updateOne: {
        filter: { _id: period._id },
        update: {
          $set: {
            accessStartsAt: cycle.accessStartsAt,
            accessEndsAt: cycle.accessEndsAt,
            paymentDeadline: cycle.paymentDeadline,
          },
        },
      },
    };
  });

  const result = await BillingPeriod.bulkWrite(operations, { ordered: false });

  return {
    matched: result.matchedCount,
    modified: result.modifiedCount,
  };
};

export const getOrCreateCurrentBillingPeriod = async (course) => {
  if (!course?._id) {
    throw new HttpError(400, "A valid course is required.");
  }

  if (course.paymentPlan !== "monthly") {
    throw new HttpError(400, "This course does not use monthly billing.");
  }

  if (!course.createdBy) {
    throw new HttpError(500, "The course does not have a valid creator.");
  }

  const cycle = getCurrentMonthCycle();
  const filter = {
    course: course._id,
    year: cycle.year,
    month: cycle.month,
  };

  try {
    return await BillingPeriod.findOneAndUpdate(
      filter,
      {
        $set: {
          accessStartsAt: cycle.accessStartsAt,
          accessEndsAt: cycle.accessEndsAt,
          paymentDeadline: cycle.paymentDeadline,
        },
        $setOnInsert: {
          course: course._id,
          year: cycle.year,
          month: cycle.month,
          label: cycle.label,
          amount: course.price,
          currency: course.currency || "LKR",
          isPublished: true,
          isPaymentOpen: true,
          isArchived: false,
          isAutoGenerated: true,
          createdBy: course.createdBy,
          updatedBy: course.updatedBy || course.createdBy,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    if (error.code === 11000) {
      const existingPeriod = await BillingPeriod.findOne(filter);

      if (existingPeriod) {
        return existingPeriod;
      }
    }

    throw error;
  }
};
