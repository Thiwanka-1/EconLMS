import mongoose from "mongoose";

import Course from "../models/Course.js";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";
import slugify from "../utils/slugify.js";

const allowedCategories = [
  "grade",
  "revision",
  "other",
];

const allowedPaymentPlans = [
  "monthly",
  "one_time",
];

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const normalizeCourseCode = (code) => {
  return String(code || "")
    .trim()
    .toUpperCase();
};

const validateRequiredFields = (body) => {
  const requiredFields = [
    "title",
    "code",
    "academicLevel",
    "category",
    "paymentPlan",
    "price",
  ];

  const missingFields = requiredFields.filter((field) => {
    const value = body[field];

    return (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    );
  });

  if (missingFields.length > 0) {
    throw new HttpError(
      400,
      `Missing required fields: ${missingFields.join(", ")}`
    );
  }
};

const validateCourseValues = ({
  category,
  paymentPlan,
  price,
}) => {
  if (
    category !== undefined &&
    !allowedCategories.includes(category)
  ) {
    throw new HttpError(
      400,
      "Category must be grade, revision or other."
    );
  }

  if (
    paymentPlan !== undefined &&
    !allowedPaymentPlans.includes(paymentPlan)
  ) {
    throw new HttpError(
      400,
      "Payment plan must be monthly or one_time."
    );
  }

  if (
    price !== undefined &&
    (
      Number.isNaN(Number(price)) ||
      Number(price) < 0
    )
  ) {
    throw new HttpError(
      400,
      "Price must be a non-negative number."
    );
  }
};

const ensureUniqueCourseFields = async ({
  slug,
  code,
  excludeCourseId = null,
}) => {
  const conditions = [];

  if (slug) {
    conditions.push({ slug });
  }

  if (code) {
    conditions.push({ code });
  }

  if (conditions.length === 0) {
    return;
  }

  const query = {
    $or: conditions,
  };

  if (excludeCourseId) {
    query._id = {
      $ne: excludeCourseId,
    };
  }

  const existingCourse = await Course.findOne(query);

  if (!existingCourse) {
    return;
  }

  if (existingCourse.slug === slug) {
    throw new HttpError(
      409,
      "A course with this title or slug already exists."
    );
  }

  if (existingCourse.code === code) {
    throw new HttpError(
      409,
      "A course with this code already exists."
    );
  }
};

export const createCourse = asyncHandler(
  async (req, res) => {
    validateRequiredFields(req.body);
    validateCourseValues(req.body);

    const {
      title,
      code,
      subject,
      category,
      academicLevel,
      shortDescription,
      description,
      paymentPlan,
      price,
      currency,
      thumbnailUrl,
      weeklySchedule,
      isPublished,
      isEnrollmentOpen,
      sortOrder,
    } = req.body;

    const courseSlug = slugify(
      req.body.slug || title
    );

    const normalizedCode =
      normalizeCourseCode(code);

    if (!courseSlug) {
      throw new HttpError(
        400,
        "A valid course title or slug is required."
      );
    }

    await ensureUniqueCourseFields({
      slug: courseSlug,
      code: normalizedCode,
    });

    const course = await Course.create({
      title,
      slug: courseSlug,
      code: normalizedCode,
      subject: subject || "Economics",
      category,
      academicLevel,
      shortDescription,
      description,
      paymentPlan,
      price: Number(price),
      currency: currency || "LKR",
      thumbnailUrl: thumbnailUrl || null,
      weeklySchedule:
        Array.isArray(weeklySchedule)
          ? weeklySchedule
          : [],
      isPublished:
        typeof isPublished === "boolean"
          ? isPublished
          : false,
      isEnrollmentOpen:
        typeof isEnrollmentOpen === "boolean"
          ? isEnrollmentOpen
          : true,
      sortOrder: Number(sortOrder || 0),
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully.",
      course,
    });
  }
);

export const getPublishedCourses =
  asyncHandler(async (req, res) => {
    const filter = {
      isPublished: true,
      isArchived: false,
    };

    if (
      req.query.category &&
      allowedCategories.includes(
        req.query.category
      )
    ) {
      filter.category = req.query.category;
    }

    if (
      req.query.paymentPlan &&
      allowedPaymentPlans.includes(
        req.query.paymentPlan
      )
    ) {
      filter.paymentPlan =
        req.query.paymentPlan;
    }

    if (req.query.search?.trim()) {
      const searchExpression = new RegExp(
        escapeRegExp(req.query.search.trim()),
        "i"
      );

      filter.$or = [
        { title: searchExpression },
        { code: searchExpression },
        { academicLevel: searchExpression },
        { subject: searchExpression },
      ];
    }

    const courses = await Course.find(filter)
      .sort({
        sortOrder: 1,
        title: 1,
      })
      .select("-createdBy -updatedBy");

    res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  });

export const getPublishedCourseByIdentifier =
  asyncHandler(async (req, res) => {
    const { identifier } = req.params;

    const identifierQuery =
      mongoose.isValidObjectId(identifier)
        ? {
            $or: [
              { _id: identifier },
              { slug: identifier.toLowerCase() },
            ],
          }
        : {
            slug: identifier.toLowerCase(),
          };

    const course = await Course.findOne({
      ...identifierQuery,
      isPublished: true,
      isArchived: false,
    }).select("-createdBy -updatedBy");

    if (!course) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    res.status(200).json({
      success: true,
      course,
    });
  });

export const getAllCoursesAdmin =
  asyncHandler(async (req, res) => {
    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit, 10) ||
          20,
        1
      ),
      100
    );

    const filter = {};

    if (req.query.isPublished === "true") {
      filter.isPublished = true;
    }

    if (req.query.isPublished === "false") {
      filter.isPublished = false;
    }

    if (req.query.isArchived === "true") {
      filter.isArchived = true;
    }

    if (req.query.isArchived === "false") {
      filter.isArchived = false;
    }

    if (
      req.query.category &&
      allowedCategories.includes(
        req.query.category
      )
    ) {
      filter.category = req.query.category;
    }

    if (
      req.query.paymentPlan &&
      allowedPaymentPlans.includes(
        req.query.paymentPlan
      )
    ) {
      filter.paymentPlan =
        req.query.paymentPlan;
    }

    if (req.query.search?.trim()) {
      const searchExpression = new RegExp(
        escapeRegExp(req.query.search.trim()),
        "i"
      );

      filter.$or = [
        { title: searchExpression },
        { code: searchExpression },
        { academicLevel: searchExpression },
        { subject: searchExpression },
      ];
    }

    const [courses, totalCourses] =
      await Promise.all([
        Course.find(filter)
          .populate(
            "createdBy",
            "firstName lastName email"
          )
          .populate(
            "updatedBy",
            "firstName lastName email"
          )
          .sort({
            sortOrder: 1,
            createdAt: -1,
          })
          .skip((page - 1) * limit)
          .limit(limit),

        Course.countDocuments(filter),
      ]);

    res.status(200).json({
      success: true,
      courses,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalCourses,
        totalPages: Math.ceil(
          totalCourses / limit
        ),
      },
    });
  });

export const getCourseByIdAdmin =
  asyncHandler(async (req, res) => {
    const course = await Course.findById(
      req.params.id
    )
      .populate(
        "createdBy",
        "firstName lastName email"
      )
      .populate(
        "updatedBy",
        "firstName lastName email"
      );

    if (!course) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    res.status(200).json({
      success: true,
      course,
    });
  });

export const updateCourse = asyncHandler(
  async (req, res) => {
    const course = await Course.findById(
      req.params.id
    );

    if (!course) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    validateCourseValues(req.body);

    const editableFields = [
      "title",
      "subject",
      "category",
      "academicLevel",
      "shortDescription",
      "description",
      "paymentPlan",
      "currency",
      "thumbnailUrl",
      "weeklySchedule",
      "sortOrder",
    ];

    for (const field of editableFields) {
      if (req.body[field] !== undefined) {
        course[field] = req.body[field];
      }
    }

    if (req.body.price !== undefined) {
      course.price = Number(req.body.price);
    }

    let updatedSlug = course.slug;
    let updatedCode = course.code;

    if (
      req.body.slug !== undefined ||
      req.body.title !== undefined
    ) {
      updatedSlug = slugify(
        req.body.slug || req.body.title
      );

      if (!updatedSlug) {
        throw new HttpError(
          400,
          "A valid course slug is required."
        );
      }
    }

    if (req.body.code !== undefined) {
      updatedCode = normalizeCourseCode(
        req.body.code
      );

      if (!updatedCode) {
        throw new HttpError(
          400,
          "Course code cannot be empty."
        );
      }
    }

    await ensureUniqueCourseFields({
      slug: updatedSlug,
      code: updatedCode,
      excludeCourseId: course._id,
    });

    course.slug = updatedSlug;
    course.code = updatedCode;
    course.updatedBy = req.user._id;

    await course.save();

    res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      course,
    });
  }
);

export const setCoursePublication =
  asyncHandler(async (req, res) => {
    const { isPublished } = req.body;

    if (typeof isPublished !== "boolean") {
      throw new HttpError(
        400,
        "isPublished must be true or false."
      );
    }

    const course = await Course.findById(
      req.params.id
    );

    if (!course) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    if (
      course.isArchived &&
      isPublished === true
    ) {
      throw new HttpError(
        400,
        "An archived course cannot be published."
      );
    }

    course.isPublished = isPublished;
    course.updatedBy = req.user._id;

    await course.save();

    res.status(200).json({
      success: true,
      message: isPublished
        ? "Course published successfully."
        : "Course unpublished successfully.",
      course,
    });
  });

export const setCourseEnrollmentStatus =
  asyncHandler(async (req, res) => {
    const { isEnrollmentOpen } = req.body;

    if (
      typeof isEnrollmentOpen !== "boolean"
    ) {
      throw new HttpError(
        400,
        "isEnrollmentOpen must be true or false."
      );
    }

    const course = await Course.findById(
      req.params.id
    );

    if (!course) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    if (
      course.isArchived &&
      isEnrollmentOpen === true
    ) {
      throw new HttpError(
        400,
        "Enrolment cannot be opened for an archived course."
      );
    }

    course.isEnrollmentOpen =
      isEnrollmentOpen;
    course.updatedBy = req.user._id;

    await course.save();

    res.status(200).json({
      success: true,
      message: isEnrollmentOpen
        ? "Course enrolment opened."
        : "Course enrolment closed.",
      course,
    });
  });

export const archiveCourse = asyncHandler(
  async (req, res) => {
    const course = await Course.findById(
      req.params.id
    );

    if (!course) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    course.isArchived = true;
    course.isPublished = false;
    course.isEnrollmentOpen = false;
    course.updatedBy = req.user._id;

    await course.save();

    res.status(200).json({
      success: true,
      message: "Course archived successfully.",
      course,
    });
  }
);

export const restoreCourse = asyncHandler(
  async (req, res) => {
    const course = await Course.findById(
      req.params.id
    );

    if (!course) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    course.isArchived = false;
    course.updatedBy = req.user._id;

    await course.save();

    res.status(200).json({
      success: true,
      message:
        "Course restored successfully. It remains unpublished until an administrator publishes it.",
      course,
    });
  }
);