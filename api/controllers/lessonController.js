import Course from "../models/Course.js";
import Lesson from "../models/Lesson.js";
import LessonView from "../models/LessonView.js";
import BillingPeriod from "../models/BillingPeriod.js";
import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

import {
  getOrCreateCurrentBillingPeriod,
} from "../utils/billingPeriod.js";

import {
  getStudentCourseAccess,
} from "../utils/courseAccess.js";

import {
  extractYouTubeVideoId,
} from "../utils/youtube.js";

import {
  getLessonViewSummary,
} from "../utils/playback.js";

import {
  getPlatformSettings,
} from "../utils/platformSettings.js";

const getCourse = async (courseId) => {
  const course =
    await Course.findById(courseId);

  if (!course) {
    throw new HttpError(
      404,
      "Course not found."
    );
  }

  return course;
};

const resolveLessonBillingPeriod =
  async ({
    course,
    billingPeriodId,
  }) => {
    if (
      course.paymentPlan === "one_time"
    ) {
      if (billingPeriodId) {
        throw new HttpError(
          400,
          "One-time courses cannot use monthly billing periods."
        );
      }

      return null;
    }

    if (!billingPeriodId) {
      return getOrCreateCurrentBillingPeriod(
        course
      );
    }

    const billingPeriod =
      await BillingPeriod.findOne({
        _id: billingPeriodId,
        course: course._id,
        isArchived: false,
      });

    if (!billingPeriod) {
      throw new HttpError(
        400,
        "The selected billing period does not belong to this course."
      );
    }

    return billingPeriod;
  };

export const createLesson = asyncHandler(
  async (req, res) => {
    const {
      courseId,
      title,
      description,
      youtubeVideo,
      youtubeVideoId,
      billingPeriodId,
      lessonOrder,
      maxViews,
      publishAt,
      isPublished,
    } = req.body;

    if (!courseId || !title) {
      throw new HttpError(
        400,
        "Course and lesson title are required."
      );
    }

    const course =
      await getCourse(courseId);

    if (course.isArchived) {
      throw new HttpError(
        400,
        "Lessons cannot be added to an archived course."
      );
    }

    const extractedVideoId =
      extractYouTubeVideoId(
        youtubeVideo ||
          youtubeVideoId
      );

    if (!extractedVideoId) {
      throw new HttpError(
        400,
        "A valid YouTube video URL or video ID is required."
      );
    }

    const billingPeriod =
      await resolveLessonBillingPeriod({
        course,
        billingPeriodId,
      });

    const platformSettings =
      await getPlatformSettings();

    const parsedMaxViews = Number(
      maxViews ??
        platformSettings.learning
          .defaultLessonMaxViews ??
        2
    );

    if (
      !Number.isInteger(parsedMaxViews) ||
      parsedMaxViews < 1 ||
      parsedMaxViews > 100
    ) {
      throw new HttpError(
        400,
        "Maximum views must be a whole number between 1 and 100."
      );
    }

    const lesson = await Lesson.create({
      course: course._id,

      billingPeriod:
        billingPeriod?._id || null,

      title,
      description: description || "",

      youtubeVideoId:
        extractedVideoId,

      lessonOrder: Number(
        lessonOrder || 0
      ),

      maxViews: parsedMaxViews,

      publishAt: publishAt || null,

      isPublished:
        typeof isPublished === "boolean"
          ? isPublished
          : false,

      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    const adminLesson =
      await Lesson.findById(
        lesson._id
      )
        .select("+youtubeVideoId")
        .populate(
          "course",
          "title code paymentPlan"
        )
        .populate(
          "billingPeriod",
          "label year month"
        );

    res.status(201).json({
      success: true,
      message:
        "Lesson created successfully.",
      lesson: adminLesson,
    });
  }
);

export const getAdminLessonsByCourse =
  asyncHandler(async (req, res) => {
    await getCourse(req.params.courseId);

    const lessons = await Lesson.find({
      course: req.params.courseId,
    })
      .select("+youtubeVideoId")
      .populate(
        "billingPeriod",
        "label year month"
      )
      .populate(
        "createdBy updatedBy",
        "firstName lastName email"
      )
      .sort({
        lessonOrder: 1,
        createdAt: 1,
      });

    res.status(200).json({
      success: true,
      lessons,
    });
  });

export const getStudentLessonsByCourse =
  asyncHandler(async (req, res) => {
    const course =
      await getCourse(
        req.params.courseId
      );

    if (
      !course.isPublished ||
      course.isArchived
    ) {
      throw new HttpError(
        404,
        "Course not found."
      );
    }

    let billingPeriod = null;

    if (course.paymentPlan === "monthly") {
      const requestedBillingPeriodId = String(
        req.query.billingPeriodId || ""
      ).trim();

      if (requestedBillingPeriodId) {
        if (!mongoose.isValidObjectId(requestedBillingPeriodId)) {
          throw new HttpError(400, "Invalid billing period ID.");
        }

        billingPeriod = await BillingPeriod.findOne({
          _id: requestedBillingPeriodId,
          course: course._id,
          isPublished: true,
          isArchived: false,
        });

        if (!billingPeriod) {
          throw new HttpError(
            404,
            "The requested billing period is not available for this course."
          );
        }
      } else {
        billingPeriod = await getOrCreateCurrentBillingPeriod(course);
      }
    }

    const access =
      await getStudentCourseAccess({
        studentId: req.user._id,
        course,
        billingPeriod,
      });

    const lessonFilter = {
      course: course._id,
      isPublished: true,
      isArchived: false,

      $or: [
        {
          publishAt: null,
        },
        {
          publishAt: {
            $lte: new Date(),
          },
        },
      ],
    };

    if (
      course.paymentPlan === "monthly"
    ) {
      lessonFilter.billingPeriod =
        billingPeriod._id;
    }

    const lessons =
      await Lesson.find(lessonFilter)
        .populate(
          "billingPeriod",
          "label year month"
        )
        .sort({
          lessonOrder: 1,
          createdAt: 1,
        });

    const lessonIds = lessons.map(
      (lesson) => lesson._id
    );

    const existingViews =
      await LessonView.find({
        student: req.user._id,
        lesson: {
          $in: lessonIds,
        },
      });

    const viewMap = new Map(
      existingViews.map((lessonView) => [
        lessonView.lesson.toString(),
        lessonView,
      ])
    );

    const lessonResults = lessons.map(
      (lesson) => {
        const lessonView = viewMap.get(
          lesson._id.toString()
        );

        const viewSummary =
          getLessonViewSummary({
            lesson,
            lessonView,
          });

        return {
          ...lesson.toJSON(),

          /*
           * youtubeVideoId is not included here.
           * It is returned only by the start
           * playback endpoint.
           */
          playback: {
            ...viewSummary,

            canStart:
              access.hasAccess &&
              (
                viewSummary
                  .newViewsRemaining > 0 ||
                viewSummary
                  .hasActiveSession
              ),
          },
        };
      }
    );

    res.status(200).json({
      success: true,

      course: {
        _id: course._id,
        title: course.title,
        code: course.code,
        paymentPlan:
          course.paymentPlan,
      },

      billingPeriod,

      access: {
        hasAccess:
          access.hasAccess,
        reason: access.reason,
      },

      lessons: lessonResults,
    });
  });

export const updateLesson = asyncHandler(
  async (req, res) => {
    const lesson =
      await Lesson.findById(
        req.params.id
      ).select("+youtubeVideoId");

    if (!lesson) {
      throw new HttpError(
        404,
        "Lesson not found."
      );
    }

    const course =
      await getCourse(lesson.course);

    const editableFields = [
      "title",
      "description",
      "lessonOrder",
      "publishAt",
    ];

    for (const field of editableFields) {
      if (req.body[field] !== undefined) {
        lesson[field] =
          req.body[field];
      }
    }

    if (
      req.body.youtubeVideo !==
        undefined ||
      req.body.youtubeVideoId !==
        undefined
    ) {
      const videoId =
        extractYouTubeVideoId(
          req.body.youtubeVideo ||
            req.body.youtubeVideoId
        );

      if (!videoId) {
        throw new HttpError(
          400,
          "Invalid YouTube video URL or ID."
        );
      }

      lesson.youtubeVideoId =
        videoId;
    }

    if (
      req.body.maxViews !== undefined
    ) {
      const maxViews = Number(
        req.body.maxViews
      );

      if (
        !Number.isInteger(maxViews) ||
        maxViews < 1 ||
        maxViews > 100
      ) {
        throw new HttpError(
          400,
          "Maximum views must be a whole number between 1 and 100."
        );
      }

      lesson.maxViews = maxViews;
    }

    if (
      req.body.billingPeriodId !==
      undefined
    ) {
      const billingPeriod =
        await resolveLessonBillingPeriod({
          course,
          billingPeriodId:
            req.body.billingPeriodId ||
            null,
        });

      lesson.billingPeriod =
        billingPeriod?._id || null;
    }

    lesson.updatedBy =
      req.user._id;

    await lesson.save();

    res.status(200).json({
      success: true,
      message:
        "Lesson updated successfully.",
      lesson,
    });
  }
);

export const setLessonPublication =
  asyncHandler(async (req, res) => {
    const { isPublished } = req.body;

    if (
      typeof isPublished !== "boolean"
    ) {
      throw new HttpError(
        400,
        "isPublished must be true or false."
      );
    }

    const lesson =
      await Lesson.findById(
        req.params.id
      );

    if (!lesson) {
      throw new HttpError(
        404,
        "Lesson not found."
      );
    }

    if (
      lesson.isArchived &&
      isPublished
    ) {
      throw new HttpError(
        400,
        "An archived lesson cannot be published."
      );
    }

    lesson.isPublished = isPublished;
    lesson.updatedBy =
      req.user._id;

    await lesson.save();

    res.status(200).json({
      success: true,
      message: isPublished
        ? "Lesson published."
        : "Lesson unpublished.",
      lesson,
    });
  });

export const archiveLesson =
  asyncHandler(async (req, res) => {
    const lesson =
      await Lesson.findById(
        req.params.id
      );

    if (!lesson) {
      throw new HttpError(
        404,
        "Lesson not found."
      );
    }

    lesson.isArchived = true;
    lesson.isPublished = false;
    lesson.updatedBy =
      req.user._id;

    await lesson.save();

    res.status(200).json({
      success: true,
      message: "Lesson archived.",
      lesson,
    });
  });

export const restoreLesson =
  asyncHandler(async (req, res) => {
    const lesson =
      await Lesson.findById(
        req.params.id
      );

    if (!lesson) {
      throw new HttpError(
        404,
        "Lesson not found."
      );
    }

    lesson.isArchived = false;
    lesson.updatedBy =
      req.user._id;

    await lesson.save();

    res.status(200).json({
      success: true,
      message:
        "Lesson restored. It remains unpublished.",
      lesson,
    });
  });
