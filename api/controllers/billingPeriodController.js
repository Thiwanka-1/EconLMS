import Course from "../models/Course.js";
import BillingPeriod from "../models/BillingPeriod.js";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";
import {
  getOrCreateCurrentBillingPeriod,
} from "../utils/billingPeriod.js";


const getMonthlyCourse = async (
  courseId
) => {
  const course =
    await Course.findById(courseId);

  if (!course) {
    throw new HttpError(
      404,
      "Course not found."
    );
  }

  if (course.paymentPlan !== "monthly") {
    throw new HttpError(
      400,
      "Billing periods can only be created for monthly courses."
    );
  }

  return course;
};

export const createBillingPeriod =
  asyncHandler(async (req, res) => {
    const {
      courseId,
      year,
      month,
      label,
      amount,
      currency,
      accessStartsAt,
      accessEndsAt,
      paymentDeadline,
      isPublished,
      isPaymentOpen,
    } = req.body;

    if (
      !courseId ||
      year === undefined ||
      month === undefined ||
      amount === undefined ||
      !accessStartsAt ||
      !accessEndsAt
    ) {
      throw new HttpError(
        400,
        "Course, year, month, amount, access start and access end are required."
      );
    }

    await getMonthlyCourse(courseId);

    const existingPeriod =
      await BillingPeriod.findOne({
        course: courseId,
        year: Number(year),
        month: Number(month),
      });

    if (existingPeriod) {
      throw new HttpError(
        409,
        "This billing period already exists."
      );
    }

    const billingPeriod =
      await BillingPeriod.create({
        course: courseId,
        year: Number(year),
        month: Number(month),
        label,
        amount: Number(amount),
        currency: currency || "LKR",
        accessStartsAt,
        accessEndsAt,
        paymentDeadline:
          paymentDeadline || null,

        isPublished:
          typeof isPublished === "boolean"
            ? isPublished
            : false,

        isPaymentOpen:
          typeof isPaymentOpen === "boolean"
            ? isPaymentOpen
            : true,

        createdBy: req.user._id,
        updatedBy: req.user._id,
      });

    res.status(201).json({
      success: true,
      message:
        "Billing period created successfully.",
      billingPeriod,
    });
  });

export const getCourseBillingPeriods =
  asyncHandler(async (req, res) => {
    const course =
      await getMonthlyCourse(
        req.params.courseId
      );

    if (
      req.user.role !== "admin" &&
      (
        !course.isPublished ||
        course.isArchived
      )
    ) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    const currentBillingPeriod =
      await getOrCreateCurrentBillingPeriod(
        course
      );

    const periods =
      await BillingPeriod.find({
        course: course._id,
        isPublished: true,
        isArchived: false,
      }).sort({
        year: -1,
        month: -1,
      });

    res.status(200).json({
      success: true,
      currentBillingPeriod,
      billingPeriods: periods,
    });
  });


export const getCurrentCourseBillingPeriod =
  asyncHandler(async (req, res) => {
    const course =
      await getMonthlyCourse(
        req.params.courseId
      );

    if (
      req.user.role !== "admin" &&
      (
        !course.isPublished ||
        course.isArchived
      )
    ) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    const billingPeriod =
      await getOrCreateCurrentBillingPeriod(
        course
      );

    res.status(200).json({
      success: true,
      billingPeriod,
    });
  });

export const getAdminBillingPeriods =
  asyncHandler(async (req, res) => {
    const course =
      await getMonthlyCourse(
        req.params.courseId
      );

    /*
    * Automatically generate periods only for
    * published, non-archived monthly courses.
    */
    if (course.isPublished && !course.isArchived) {
      await getOrCreateCurrentBillingPeriod(course);
    }

    const periods =
      await BillingPeriod.find({
        course: course._id,
      })
        .populate(
          "createdBy updatedBy",
          "firstName lastName email"
        )
        .sort({
          year: -1,
          month: -1,
        });

    res.status(200).json({
      success: true,
      billingPeriods: periods,
    });
  });

export const updateBillingPeriod =
  asyncHandler(async (req, res) => {
    const billingPeriod =
      await BillingPeriod.findById(
        req.params.id
      );

    if (!billingPeriod) {
      throw new HttpError(
        404,
        "Billing period not found."
      );
    }

    const editableFields = [
      "year",
      "month",
      "label",
      "currency",
      "accessStartsAt",
      "accessEndsAt",
      "paymentDeadline",
    ];

    for (const field of editableFields) {
      if (req.body[field] !== undefined) {
        billingPeriod[field] =
          req.body[field];
      }
    }

    if (req.body.amount !== undefined) {
      const amount = Number(
        req.body.amount
      );

      if (
        Number.isNaN(amount) ||
        amount < 0
      ) {
        throw new HttpError(
          400,
          "Amount must be a non-negative number."
        );
      }

      billingPeriod.amount = amount;
    }

    billingPeriod.updatedBy =
      req.user._id;

    await billingPeriod.save();

    res.status(200).json({
      success: true,
      message:
        "Billing period updated successfully.",
      billingPeriod,
    });
  });

export const setBillingPeriodStatus =
  asyncHandler(async (req, res) => {
    const billingPeriod =
      await BillingPeriod.findById(
        req.params.id
      );

    if (!billingPeriod) {
      throw new HttpError(
        404,
        "Billing period not found."
      );
    }

    if (
      billingPeriod.isArchived &&
      (
        req.body.isPublished === true ||
        req.body.isPaymentOpen === true
      )
    ) {
      throw new HttpError(
        400,
        "An archived billing period cannot be published or opened."
      );
    }

    if (
      req.body.isPublished !== undefined
    ) {
      if (
        typeof req.body.isPublished !==
        "boolean"
      ) {
        throw new HttpError(
          400,
          "isPublished must be true or false."
        );
      }

      billingPeriod.isPublished =
        req.body.isPublished;
    }

    if (
      req.body.isPaymentOpen !== undefined
    ) {
      if (
        typeof req.body.isPaymentOpen !==
        "boolean"
      ) {
        throw new HttpError(
          400,
          "isPaymentOpen must be true or false."
        );
      }

      billingPeriod.isPaymentOpen =
        req.body.isPaymentOpen;
    }

    billingPeriod.updatedBy =
      req.user._id;

    await billingPeriod.save();

    res.status(200).json({
      success: true,
      message:
        "Billing-period status updated.",
      billingPeriod,
    });
  });

export const archiveBillingPeriod =
  asyncHandler(async (req, res) => {
    const billingPeriod =
      await BillingPeriod.findById(
        req.params.id
      );

    if (!billingPeriod) {
      throw new HttpError(
        404,
        "Billing period not found."
      );
    }

    billingPeriod.isArchived = true;
    billingPeriod.isPublished = false;
    billingPeriod.isPaymentOpen = false;
    billingPeriod.updatedBy =
      req.user._id;

    await billingPeriod.save();

    res.status(200).json({
      success: true,
      message:
        "Billing period archived.",
      billingPeriod,
    });
  });

export const restoreBillingPeriod =
  asyncHandler(async (req, res) => {
    const billingPeriod =
      await BillingPeriod.findById(
        req.params.id
      );

    if (!billingPeriod) {
      throw new HttpError(
        404,
        "Billing period not found."
      );
    }

    billingPeriod.isArchived = false;
    billingPeriod.updatedBy =
      req.user._id;

    await billingPeriod.save();

    res.status(200).json({
      success: true,
      message:
        "Billing period restored. It remains closed and unpublished until updated.",
      billingPeriod,
    });
  });