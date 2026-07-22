import {
  randomUUID,
} from "node:crypto";

import Lesson from "../models/Lesson.js";
import LessonView from "../models/LessonView.js";

import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

import {
  getStudentCourseAccess,
} from "../utils/courseAccess.js";

import {
  finalizePlaybackSession,
  finalizeStaleSessionIfNeeded,
  getLessonViewSummary,
  getOrCreateLessonView,
  isPlaybackSessionStale,
} from "../utils/playback.js";

const getAvailableLesson = async (
  lessonId
) => {
  const lesson =
    await Lesson.findById(lessonId)
      .select("+youtubeVideoId")
      .populate("course")
      .populate("billingPeriod");

  if (
    !lesson ||
    !lesson.isPublished ||
    lesson.isArchived
  ) {
    throw new HttpError(
      404,
      "Lesson not found."
    );
  }

  if (
    lesson.publishAt &&
    lesson.publishAt > new Date()
  ) {
    throw new HttpError(
      403,
      "This lesson is not available yet."
    );
  }

  if (
    !lesson.course?.isPublished ||
    lesson.course?.isArchived
  ) {
    throw new HttpError(
      404,
      "Course not found."
    );
  }

  return lesson;
};

const verifyLessonAccess = async ({
  studentId,
  lesson,
}) => {
  const access =
    await getStudentCourseAccess({
      studentId,
      course: lesson.course,
      billingPeriod:
        lesson.billingPeriod,
    });

  if (!access.hasAccess) {
    throw new HttpError(
      403,
      access.reason
    );
  }

  return access;
};

export const startPlayback =
  asyncHandler(async (req, res) => {
    const lesson =
      await getAvailableLesson(
        req.params.lessonId
      );

    await verifyLessonAccess({
      studentId: req.user._id,
      lesson,
    });

    let lessonView =
      await getOrCreateLessonView({
        studentId: req.user._id,
        lesson,
      });

    lessonView =
      await finalizeStaleSessionIfNeeded(
        lessonView
      );

    /*
     * A quick refresh or temporary disconnect
     * returns the same session without consuming
     * another viewing opportunity.
     */
    if (lessonView.activeSession) {
      const summary =
        getLessonViewSummary({
          lesson,
          lessonView,
        });

      return res.status(200).json({
        success: true,
        resumed: true,

        message:
          "Existing playback session resumed.",

        lesson: {
          _id: lesson._id,
          title: lesson.title,
          youtubeVideoId:
            lesson.youtubeVideoId,
        },

        sessionId:
          lessonView.activeSession
            .sessionId,

        heartbeatIntervalSeconds:
          Number(
            process.env
              .PLAYBACK_HEARTBEAT_SECONDS ||
              20
          ),

        playback: summary,
      });
    }

    const summary =
      getLessonViewSummary({
        lesson,
        lessonView,
      });

    if (summary.viewsRemaining <= 0) {
      throw new HttpError(
        403,
        "You have used all viewing opportunities for this lesson."
      );
    }

    const sessionId = randomUUID();
    const now = new Date();

    /*
     * The filter prevents two simultaneous start
     * requests from creating separate sessions.
     */
    let startedView =
      await LessonView.findOneAndUpdate(
        {
          _id: lessonView._id,
          activeSession: null,

          $expr: {
            $lt: [
              "$viewsUsed",
              {
                $add: [
                  lesson.maxViews,
                  {
                    $ifNull: [
                      "$extraViews",
                      0,
                    ],
                  },
                ],
              },
            ],
          },
        },
        {
          $set: {
            activeSession: {
              sessionId,
              startedAt: now,
              lastHeartbeatAt: now,
              watchedSeconds: 0,
              durationSeconds: 0,

              userAgent:
                req.get("user-agent") ||
                "",

              ipAddress:
                req.ip || "",
            },
          },
        },
        {
          returnDocument: "after",
        }
      );

    /*
     * Another request may have started the
     * session first. Return that session.
     */
    if (!startedView) {
      startedView =
        await LessonView.findById(
          lessonView._id
        );

      if (!startedView?.activeSession) {
        throw new HttpError(
          409,
          "Playback could not be started. Please try again."
        );
      }
    }

    res.status(201).json({
      success: true,
      resumed: false,

      message:
        "Playback session started.",

      lesson: {
        _id: lesson._id,
        title: lesson.title,
        youtubeVideoId:
          lesson.youtubeVideoId,
      },

      sessionId:
        startedView.activeSession
          .sessionId,

      heartbeatIntervalSeconds:
        Number(
          process.env
            .PLAYBACK_HEARTBEAT_SECONDS ||
            20
        ),

      playback:
        getLessonViewSummary({
          lesson,
          lessonView: startedView,
        }),
    });
  });

export const playbackHeartbeat =
  asyncHandler(async (req, res) => {
    const {
      watchedSeconds,
      durationSeconds,
    } = req.body;

    const lessonView =
      await LessonView.findOne({
        student: req.user._id,

        "activeSession.sessionId":
          req.params.sessionId,
      });

    if (!lessonView) {
      throw new HttpError(
        404,
        "Active playback session not found."
      );
    }

    if (
      isPlaybackSessionStale(
        lessonView.activeSession
      )
    ) {
      await finalizePlaybackSession({
        lessonView,
        sessionId:
          req.params.sessionId,
        status: "timeout",
      });

      throw new HttpError(
        409,
        "This playback session has expired."
      );
    }

    const update = {
      $set: {
        "activeSession.lastHeartbeatAt":
          new Date(),
      },
    };

    const maxValues = {};

    if (
      watchedSeconds !== undefined
    ) {
      const watched = Number(
        watchedSeconds
      );

      if (
        Number.isFinite(watched) &&
        watched >= 0
      ) {
        maxValues[
          "activeSession.watchedSeconds"
        ] = watched;
      }
    }

    if (
      durationSeconds !== undefined
    ) {
      const duration = Number(
        durationSeconds
      );

      if (
        Number.isFinite(duration) &&
        duration >= 0
      ) {
        maxValues[
          "activeSession.durationSeconds"
        ] = duration;
      }
    }

    if (
      Object.keys(maxValues).length > 0
    ) {
      update.$max = maxValues;
    }

    const updatedView =
      await LessonView.findOneAndUpdate(
        {
          _id: lessonView._id,

          "activeSession.sessionId":
            req.params.sessionId,
        },
        update,
        {
          returnDocument: "after",
        }
      );

    res.status(200).json({
      success: true,
      message: "Heartbeat received.",

      playback: {
        sessionId:
          req.params.sessionId,

        watchedSeconds:
          updatedView.activeSession
            .watchedSeconds,

        durationSeconds:
          updatedView.activeSession
            .durationSeconds,
      },
    });
  });

export const endPlayback =
  asyncHandler(async (req, res) => {
    const requestedStatus =
      req.body.status;

    const status =
      requestedStatus === "completed"
        ? "completed"
        : "left";

    const lessonView =
      await LessonView.findOne({
        student: req.user._id,

        "activeSession.sessionId":
          req.params.sessionId,
      }).populate("lesson");

    if (!lessonView) {
      throw new HttpError(
        404,
        "Active playback session not found."
      );
    }

    const updatedView =
      await finalizePlaybackSession({
        lessonView,
        sessionId:
          req.params.sessionId,
        status,
      });

    const summary =
      getLessonViewSummary({
        lesson: lessonView.lesson,
        lessonView: updatedView,
      });

    res.status(200).json({
      success: true,

      message:
        status === "completed"
          ? "Video completed. One viewing opportunity was used."
          : "Playback closed. One viewing opportunity was used.",

      playback: summary,
    });
  });

export const getMyLessonView =
  asyncHandler(async (req, res) => {
    const lesson =
      await Lesson.findById(
        req.params.lessonId
      );

    if (!lesson) {
      throw new HttpError(
        404,
        "Lesson not found."
      );
    }

    let lessonView =
      await LessonView.findOne({
        student: req.user._id,
        lesson: lesson._id,
      });

    if (lessonView) {
      lessonView =
        await finalizeStaleSessionIfNeeded(
          lessonView
        );
    }

    res.status(200).json({
      success: true,

      playback:
        getLessonViewSummary({
          lesson,
          lessonView,
        }),
    });
  });

export const getLessonViewsAdmin =
  asyncHandler(async (req, res) => {
    const filter = {};

    if (req.query.studentId) {
      filter.student =
        req.query.studentId;
    }

    if (req.query.lessonId) {
      filter.lesson =
        req.query.lessonId;
    }

    if (req.query.courseId) {
      filter.course =
        req.query.courseId;
    }

    const lessonViews =
      await LessonView.find(filter)
        .populate(
          "student",
          "firstName lastName email mobileNumber"
        )
        .populate(
          "lesson",
          "title maxViews"
        )
        .populate(
          "course",
          "title code"
        )
        .populate(
          "lastModifiedByAdmin",
          "firstName lastName email"
        )
        .sort({
          updatedAt: -1,
        });

    const updatedViews =
      await Promise.all(
        lessonViews.map((lessonView) =>
          finalizeStaleSessionIfNeeded(
            lessonView
          )
        )
      );

    res.status(200).json({
      success: true,
      lessonViews: updatedViews,
    });
  });

export const addExtraLessonViews =
  asyncHandler(async (req, res) => {
    const count = Number(
      req.body.count || 1
    );

    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 20
    ) {
      throw new HttpError(
        400,
        "Extra-view count must be between 1 and 20."
      );
    }

    const lesson =
      await Lesson.findById(
        req.params.lessonId
      );

    if (!lesson) {
      throw new HttpError(
        404,
        "Lesson not found."
      );
    }

    const lessonView =
      await LessonView.findOneAndUpdate(
        {
          student:
            req.params.studentId,

          lesson:
            req.params.lessonId,
        },
        {
          $setOnInsert: {
            student:
              req.params.studentId,

            lesson:
              req.params.lessonId,

            course: lesson.course,
            viewsUsed: 0,
            activeSession: null,
            history: [],
          },

          $inc: {
            extraViews: count,
          },

          $set: {
            lastModifiedByAdmin:
              req.user._id,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
        }
      );

    res.status(200).json({
      success: true,

      message: `${count} additional viewing opportunity added.`,

      playback:
        getLessonViewSummary({
          lesson,
          lessonView,
        }),
    });
  });

export const resetLessonViews =
  asyncHandler(async (req, res) => {
    const lesson =
      await Lesson.findById(
        req.params.lessonId
      );

    if (!lesson) {
      throw new HttpError(
        404,
        "Lesson not found."
      );
    }

    let lessonView =
      await LessonView.findOne({
        student:
          req.params.studentId,

        lesson:
          req.params.lessonId,
      });

    if (!lessonView) {
      lessonView =
        await LessonView.create({
          student:
            req.params.studentId,

          lesson:
            req.params.lessonId,

          course: lesson.course,

          viewsUsed: 0,
          extraViews: 0,

          lastModifiedByAdmin:
            req.user._id,
        });
    } else {
      if (lessonView.activeSession) {
        const historyEntry = {
          sessionId:
            lessonView.activeSession
              .sessionId,

          status: "admin_reset",

          startedAt:
            lessonView.activeSession
              .startedAt,

          endedAt: new Date(),

          lastHeartbeatAt:
            lessonView.activeSession
              .lastHeartbeatAt,

          watchedSeconds:
            lessonView.activeSession
              .watchedSeconds || 0,

          durationSeconds:
            lessonView.activeSession
              .durationSeconds || 0,

          userAgent:
            lessonView.activeSession
              .userAgent || "",

          ipAddress:
            lessonView.activeSession
              .ipAddress || "",
        };

        lessonView.history.push(
          historyEntry
        );
      }

      lessonView.viewsUsed = 0;
      lessonView.extraViews = 0;
      lessonView.activeSession = null;

      lessonView.lastModifiedByAdmin =
        req.user._id;

      await lessonView.save();
    }

    res.status(200).json({
      success: true,
      message:
        "Lesson viewing opportunities reset.",

      playback:
        getLessonViewSummary({
          lesson,
          lessonView,
        }),
    });
  });