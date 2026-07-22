/**
 * Billing Period Utilities
 *
 * This module handles automatic billing period creation and management for monthly courses.
 * It uses timezone-aware date calculations to ensure billing periods are correctly aligned
 * with calendar months, regardless of the application's deployment location.
 *
 * Key functions:
 * - getCurrentMonthCycle(): Calculates the start/end dates for the current month
 * - getOrCreateCurrentBillingPeriod(): Auto-creates billing period for current month if missing
 *
 * The auto-creation uses MongoDB's upsert feature to atomically create or return existing periods,
 * preventing duplicate periods even with concurrent requests.
 */

import { DateTime } from "luxon";

import BillingPeriod from "../models/BillingPeriod.js";
import HttpError from "./HttpError.js";

/**
 * Gets the configured application timezone.
 * Defaults to Asia/Colombo if not specified in environment variables.
 * This timezone is used for all billing period date calculations.
 *
 * @returns {string} IANA timezone identifier (e.g., 'Asia/Colombo', 'UTC')
 */
const getApplicationTimezone = () => {
  return process.env.APP_TIMEZONE || "Asia/Colombo";
};

/**
 * Calculates the start, end, and metadata for the current calendar month.
 *
 * This function uses the application's configured timezone to determine what "current month" means.
 * For example, if it's June 30th 23:59 UTC but June 1st 05:29 in Asia/Colombo, the current month
 * is still considered June in Asia/Colombo timezone.
 *
 * The returned dates are in UTC to ensure consistent storage in MongoDB.
 *
 * @param {Date} [currentDate=new Date()] - The reference date. Defaults to now. Used for testing.
 *
 * @returns {Object} Object containing:
 *   - year: {number} - The year (e.g., 2026)
 *   - month: {number} - The month number (1-12)
 *   - label: {string} - Human-readable month label (e.g., "July 2026")
 *   - accessStartsAt: {Date} - UTC date when access begins (start of month at 00:00:00)
 *   - accessEndsAt: {Date} - UTC date when access ends (end of month at 23:59:59)
 *   - paymentDeadline: {Date} - UTC date for payment deadline (end of month)
 *   - timezone: {string} - The timezone used for calculation
 *
 * @throws {Error} If the configured timezone is invalid
 *
 * @example
 * // In Asia/Colombo timezone:
 * const cycle = getCurrentMonthCycle();
 * // Returns:
 * // {
 * //   year: 2026,
 * //   month: 7,
 * //   label: "July 2026",
 * //   accessStartsAt: Date(2026-07-01T00:00:00Z),
 * //   accessEndsAt: Date(2026-07-31T23:59:59Z),
 * //   paymentDeadline: Date(2026-07-31T23:59:59Z),
 * //   timezone: "Asia/Colombo"
 * // }
 */
//test billing date for development testing
// Development-only billing date override
const getTestBillingDate = () => {
  if (
    process.env.NODE_ENV !== "development" ||
    !process.env.TEST_BILLING_DATE
  ) {
    return null;
  }

  const testDate = DateTime.fromISO(
    process.env.TEST_BILLING_DATE,
    {
      setZone: true,
    }
  );

  if (!testDate.isValid) {
    throw new Error(
      `Invalid TEST_BILLING_DATE: ${
        testDate.invalidExplanation ||
        process.env.TEST_BILLING_DATE
      }`
    );
  }

  return testDate.toJSDate();
};

export const getCurrentMonthCycle = (
  currentDate = null
) => {
  const timezone = getApplicationTimezone();

  const testBillingDate =
    getTestBillingDate();

  const referenceDate =
    currentDate ??
    testBillingDate ??
    new Date();

  const currentDateTime = DateTime
    .fromJSDate(referenceDate)
    .setZone(timezone);

  if (!currentDateTime.isValid) {
    throw new Error(
      `Invalid application timezone: ${timezone}`
    );
  }

  const monthStart =
    currentDateTime.startOf("month");

  const monthEnd =
    currentDateTime.endOf("month");

  if (
    process.env.NODE_ENV === "development"
  ) {
    console.log(
      `[BILLING_DATE] Using ${
        testBillingDate
          ? "test date"
          : "real date"
      }: ${currentDateTime.toISO()}`
    );
  }

  return {
    year: monthStart.year,
    month: monthStart.month,

    label:
      monthStart.toFormat("LLLL yyyy"),

    accessStartsAt:
      monthStart.toUTC().toJSDate(),

    accessEndsAt:
      monthEnd.toUTC().toJSDate(),

    paymentDeadline:
      monthEnd.toUTC().toJSDate(),

    timezone,
  };
};

/**
 * Automatically creates a billing period for the current month if it doesn't exist,
 * or returns the existing one if it does.
 *
 * This is the core function that enables automatic billing period generation.
 * It uses MongoDB's findOneAndUpdate with upsert to atomically create-or-return,
 * ensuring no duplicates even with concurrent requests.
 *
 * IMPORTANT PRICING BEHAVIOR:
 * The billing period amount is a SNAPSHOT of the course price at creation time.
 * If the course price changes later, this period's amount remains unchanged.
 * This is intentional - students who enrolled in July at 1000 LKR should keep
 * that price if the course price increases in August.
 *
 * CALLED FROM:
 * 1. Enrollment controller - when students submit payment slips
 * 2. Billing period controller - when fetching periods (on-demand generation)
 * 3. Scheduled job (scheduledJobs.js) - proactive generation on 1st of month
 *
 * @param {Object} course - The course document with _id, paymentPlan, price, currency, createdBy
 *
 * @returns {Promise<Object>} The billing period document for the current month with fields:
 *   - _id: MongoDB ObjectId
 *   - course: Reference to course
 *   - year: Year number
 *   - month: Month number (1-12)
 *   - label: Human-readable label (e.g., "July 2026")
 *   - amount: Price at time of creation (snapshot of course.price)
 *   - currency: Currency code (usually "LKR")
 *   - accessStartsAt: Start of access period (UTC)
 *   - accessEndsAt: End of access period (UTC)
 *   - paymentDeadline: When payment must be submitted by (UTC)
 *   - isPublished: Whether period is visible to students (true for auto-generated)
 *   - isPaymentOpen: Whether students can submit payments (true for auto-generated)
 *   - isArchived: Whether period is archived (false for auto-generated)
 *   - isAutoGenerated: Whether created by this function (true)
 *   - createdBy: User who owns/created the course
 *   - updatedBy: User who last updated the period
 *   - createdAt: Timestamp
 *   - updatedAt: Timestamp
 *
 * @throws {HttpError} If course is invalid, doesn't have monthly billing, or no creator
 * @throws {Error} If database operation fails (other than duplicate key)
 *
 * @example
 * // Typical usage in a controller:
 * const course = await Course.findById(courseId);
 * const currentBillingPeriod = await getOrCreateCurrentBillingPeriod(course);
 * // If July period exists: returns it
 * // If July period doesn't exist: creates and returns it
 */
export const getOrCreateCurrentBillingPeriod =
  async (course) => {
    // Validate course object
    if (!course?._id) {
      throw new HttpError(
        400,
        "A valid course is required."
      );
    }

    // Ensure this course uses monthly billing, not one-time
    if (course.paymentPlan !== "monthly") {
      throw new HttpError(
        400,
        "This course does not use monthly billing."
      );
    }

    // Ensure course has a valid creator reference
    if (!course.createdBy) {
      throw new HttpError(
        500,
        "The course does not have a valid creator."
      );
    }

    // Calculate the current month's dates in the app's configured timezone
    const cycle = getCurrentMonthCycle();

    // This is the query to find the existing period, or upsert if missing
    const filter = {
      course: course._id,
      year: cycle.year,
      month: cycle.month,
    };

    try {
      // MongoDB findOneAndUpdate with upsert:
      // - If period (course, year, month) exists: returns it (unchanged)
      // - If period doesn't exist: creates it with $setOnInsert fields
      const billingPeriod =
        await BillingPeriod.findOneAndUpdate(
          filter,
          {
            // $setOnInsert: Only applied when creating (upsert=true and document didn't exist)
            $setOnInsert: {
              course: course._id,

              year: cycle.year,
              month: cycle.month,
              label: cycle.label,

              // SNAPSHOT: Amount is the course price AT THIS MOMENT
              // Future changes to course.price won't affect this period's amount
              amount: course.price,
              currency: course.currency || "LKR",

              // Access dates define when students can use the course materials
              accessStartsAt:
                cycle.accessStartsAt,

              accessEndsAt:
                cycle.accessEndsAt,

              // Payment deadline is when payment submissions close
              paymentDeadline:
                cycle.paymentDeadline,

              // Auto-generated periods are immediately published and open for payment
              isPublished: true,
              isPaymentOpen: true,
              isArchived: false,

              // Flag to identify auto-generated vs manually created periods
              isAutoGenerated: true,

              // Track who created this period (inherited from course)
              createdBy: course.createdBy,
              updatedBy:
                course.updatedBy ||
                course.createdBy,
            },
          },
          {
            returnDocument: "after",
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );

      return billingPeriod;
    } catch (error) {
      // Handle race condition: two simultaneous requests might both try to create
      // MongoDB's unique index on (course, year, month) prevents duplicates
      // If we hit the duplicate key error here, just fetch and return the winner's document
      if (error.code === 11000) {
        const existingPeriod =
          await BillingPeriod.findOne(filter);

        if (existingPeriod) {
          // Another request created it first, return that one
          return existingPeriod;
        }
      }

      // If it's not a duplicate key error, or duplicate key but document isn't found,
      // re-throw the error
      throw error;
    }
  };