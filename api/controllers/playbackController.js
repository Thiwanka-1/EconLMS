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
  clampPlaybackPosition,
  finalizePlaybackSession,
  finalizeStaleSessionIfNeeded,
  getPlaybackRewindFloor,
  getLessonViewSummary,
  getOrCreateLessonView,
  isPlaybackSessionStale,
  resolvePlaybackRewindLock,
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

    const requestedSessionId =
      typeof req.body?.sessionId === "string"
        ? req.body.sessionId.trim()
        : "";

    const requestedWatchedSeconds =
      Math.max(
        Number(
          req.body?.watchedSeconds
        ) || 0,
        0
      );
    const requestedCurrentPosition = Number(req.body?.currentPositionSeconds);
    const requestedCurrentPositionSeconds =
      Number.isFinite(requestedCurrentPosition) && requestedCurrentPosition >= 0
        ? requestedCurrentPosition
        : requestedWatchedSeconds;
    const requestedRewindLockedUntilSeconds =
      req.body?.rewindLockedUntilSeconds;

    let lessonView =
      await getOrCreateLessonView({
        studentId: req.user._id,
        lesson,
      });

    /*
     * A refresh or Back navigation can recover the
     * same browser session while it is still fresh.
     * Expired sessions are finalized below and
     * cannot be revived with a stored session ID.
     */
    if (
      lessonView.activeSession &&
      requestedSessionId &&
      requestedSessionId ===
        lessonView.activeSession.sessionId &&
      !isPlaybackSessionStale(lessonView.activeSession)
    ) {
      const knownDuration = Math.max(
        Number(
          lessonView.activeSession
            .durationSeconds
        ) || 0,
        0
      );

      const storedWatchedSeconds = Math.max(
        Number(lessonView.activeSession.watchedSeconds) || 0,
        0
      );
      const elapsedSeconds = Math.max(
        (Date.now() - new Date(lessonView.activeSession.lastHeartbeatAt).getTime()) /
          1000,
        0
      );
      const plausibleWatchedSeconds = Math.min(
        requestedWatchedSeconds,
        storedWatchedSeconds + elapsedSeconds * 2 + 15
      );
      const resumedWatchedSeconds = knownDuration > 0
        ? Math.min(plausibleWatchedSeconds, knownDuration)
        : plausibleWatchedSeconds;
      const resumedFurthestSeconds = Math.max(
        storedWatchedSeconds,
        resumedWatchedSeconds
      );
      const resumedCurrentPositionSeconds = clampPlaybackPosition({
        currentPositionSeconds: requestedCurrentPositionSeconds,
        furthestWatchedSeconds: resumedFurthestSeconds,
      });
      const resumedRewindFloor = getPlaybackRewindFloor(
        resumedFurthestSeconds
      );
      const resumedRewindLockedUntilSeconds = resolvePlaybackRewindLock({
        currentPositionSeconds: resumedCurrentPositionSeconds,
        furthestWatchedSeconds: resumedFurthestSeconds,
        existingLockSeconds:
          lessonView.activeSession.rewindLockedUntilSeconds,
        requestedLockSeconds: requestedRewindLockedUntilSeconds,
        reachedRewindFloor:
          resumedCurrentPositionSeconds <= resumedRewindFloor + 0.1 &&
          Number(lessonView.activeSession.currentPositionSeconds) >
            resumedRewindFloor + 0.1,
      });

      lessonView =
        await LessonView.findOneAndUpdate(
          {
            _id: lessonView._id,
            "activeSession.sessionId":
              requestedSessionId,
          },
          {
            $set: {
              "activeSession.lastHeartbeatAt":
                new Date(),
              "activeSession.currentPositionSeconds":
                resumedCurrentPositionSeconds,
              "activeSession.rewindLockedUntilSeconds":
                resumedRewindLockedUntilSeconds,
            },
            $max: {
              "activeSession.watchedSeconds":
                resumedWatchedSeconds,
            },
          },
          {
            returnDocument: "after",
          }
        );

      if (!lessonView?.activeSession) {
        throw new HttpError(
          409,
          "The playback session could not be resumed. Please try again."
        );
      }

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

    lessonView =
      await finalizeStaleSessionIfNeeded(
        lessonView
      );

    if (lessonView.activeSession) {
      throw new HttpError(
        409,
        "This lesson already has an active playback session."
      );
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
              currentPositionSeconds: 0,
              rewindLockedUntilSeconds: null,
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
      currentPositionSeconds,
      rewindLockedUntilSeconds,
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

    if (isPlaybackSessionStale(lessonView.activeSession)) {
      await finalizePlaybackSession({
        lessonView,
        sessionId: req.params.sessionId,
        status: "timeout",
      });

      throw new HttpError(
        409,
        "This playback session expired after being inactive. Start a new viewing session."
      );
    }

    const update = {
      $set: {
        "activeSession.lastHeartbeatAt":
          new Date(),
      },
    };

    const maxValues = {};
    const currentWatched = Number(
      lessonView.activeSession.watchedSeconds || 0
    );
    let nextFurthestWatched = currentWatched;

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
        const elapsedSeconds = Math.max(
          (Date.now() -
            new Date(lessonView.activeSession.lastHeartbeatAt).getTime()) /
            1000,
          0
        );

        const acceptedWatched = Math.min(
          watched,
          currentWatched + elapsedSeconds * 2 + 15
        );

        nextFurthestWatched = Math.max(
          currentWatched,
          acceptedWatched
        );
        maxValues["activeSession.watchedSeconds"] = acceptedWatched;
      }
    }

    const storedCurrentPosition =
      lessonView.activeSession.currentPositionSeconds ?? currentWatched;
    const requestedPosition = Number(currentPositionSeconds);
    const nextCurrentPosition = clampPlaybackPosition({
      currentPositionSeconds:
        Number.isFinite(requestedPosition) && requestedPosition >= 0
          ? requestedPosition
          : storedCurrentPosition,
      furthestWatchedSeconds: nextFurthestWatched,
    });
    const nextRewindFloor = getPlaybackRewindFloor(nextFurthestWatched);
    update.$set["activeSession.currentPositionSeconds"] = nextCurrentPosition;
    update.$set["activeSession.rewindLockedUntilSeconds"] =
      resolvePlaybackRewindLock({
        currentPositionSeconds: nextCurrentPosition,
        furthestWatchedSeconds: nextFurthestWatched,
        existingLockSeconds:
          lessonView.activeSession.rewindLockedUntilSeconds,
        requestedLockSeconds: rewindLockedUntilSeconds,
        reachedRewindFloor:
          nextCurrentPosition <= nextRewindFloor + 0.1 &&
          Number(storedCurrentPosition) > nextRewindFloor + 0.1,
      });

    if (
      durationSeconds !== undefined
    ) {
      const duration = Number(
        durationSeconds
      );

      if (
        Number.isFinite(duration) &&
        duration >= 0 &&
        duration <= 24 * 60 * 60
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

        currentPositionSeconds:
          updatedView.activeSession
            .currentPositionSeconds,

        rewindLockedUntilSeconds:
          updatedView.activeSession
            .rewindLockedUntilSeconds ?? null,
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

    const lessonView =
      await LessonView.findOne({
        student: req.user._id,
        lesson: lesson._id,
      });

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

        lessonView.history.push(historyEntry);

        if (lessonView.history.length > 30) {
          lessonView.history =
            lessonView.history.slice(-30);
        }
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
