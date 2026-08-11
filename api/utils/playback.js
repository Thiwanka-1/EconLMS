import LessonView from "../models/LessonView.js";

export const PLAYBACK_REWIND_LIMIT_SECONDS = 120;

export const getPlaybackRewindFloor = (furthestWatchedSeconds) => {
  return Math.max(
    Number(furthestWatchedSeconds) - PLAYBACK_REWIND_LIMIT_SECONDS || 0,
    0
  );
};

export const clampPlaybackPosition = ({
  currentPositionSeconds,
  furthestWatchedSeconds,
}) => {
  const furthest = Math.max(Number(furthestWatchedSeconds) || 0, 0);
  const floor = getPlaybackRewindFloor(furthest);

  return Math.min(
    Math.max(Number(currentPositionSeconds) || 0, floor),
    furthest
  );
};

export const resolvePlaybackRewindLock = ({
  currentPositionSeconds,
  furthestWatchedSeconds,
  existingLockSeconds = null,
  requestedLockSeconds = null,
  reachedRewindFloor = false,
}) => {
  const current = Math.max(Number(currentPositionSeconds) || 0, 0);
  const furthest = Math.max(Number(furthestWatchedSeconds) || 0, 0);
  const existing = Number(existingLockSeconds);
  const requested = Number(requestedLockSeconds);

  if (Number.isFinite(existing) && existing > current + 0.1) {
    return Math.min(existing, furthest);
  }

  if (
    Number.isFinite(requested) &&
    requested > current + 0.1 &&
    requested <= furthest + 0.1
  ) {
    return Math.min(requested, furthest);
  }

  if (reachedRewindFloor && current < furthest - 0.1) {
    return furthest;
  }

  return null;
};

export const getPlaybackStaleMilliseconds = () => {
  const staleMinutes = Number(
    process.env.PLAYBACK_STALE_MINUTES || 3
  );

  if (!Number.isFinite(staleMinutes) || staleMinutes <= 0) {
    return 3 * 60 * 1000;
  }

  return staleMinutes * 60 * 1000;
};

export const isPlaybackSessionStale = (
  activeSession
) => {
  if (!activeSession?.lastHeartbeatAt) {
    return false;
  }

  const elapsed =
    Date.now() -
    new Date(
      activeSession.lastHeartbeatAt
    ).getTime();

  return (
    elapsed >
    getPlaybackStaleMilliseconds()
  );
};

export const getOrCreateLessonView =
  async ({
    studentId,
    lesson,
  }) => {
    return LessonView.findOneAndUpdate(
      {
        student: studentId,
        lesson: lesson._id,
      },
      {
        $setOnInsert: {
          student: studentId,
          lesson: lesson._id,
          course: lesson.course._id
            ? lesson.course._id
            : lesson.course,
          viewsUsed: 0,
          extraViews: 0,
          activeSession: null,
          history: [],
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );
  };

export const finalizePlaybackSession =
  async ({
    lessonView,
    sessionId,
    status,
  }) => {
    if (
      !lessonView?.activeSession ||
      lessonView.activeSession.sessionId !==
        sessionId
    ) {
      return LessonView.findById(
        lessonView?._id
      );
    }

    const now = new Date();

    const historyEntry = {
      sessionId:
        lessonView.activeSession.sessionId,

      status,

      startedAt:
        lessonView.activeSession.startedAt,

      endedAt: now,

      lastHeartbeatAt:
        lessonView.activeSession
          .lastHeartbeatAt,

      watchedSeconds:
        lessonView.activeSession
          .watchedSeconds || 0,

      currentPositionSeconds:
        lessonView.activeSession
          .currentPositionSeconds ??
        lessonView.activeSession
          .watchedSeconds ??
        0,

      rewindLockedUntilSeconds:
        lessonView.activeSession.rewindLockedUntilSeconds ?? null,

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

    /*
     * The active-session filter ensures the view
     * can only be consumed once.
     */
    const updatedView =
      await LessonView.findOneAndUpdate(
        {
          _id: lessonView._id,

          "activeSession.sessionId":
            sessionId,
        },
        {
          $inc: {
            viewsUsed: 1,
          },

          $set: {
            activeSession: null,
          },

          /*
           * Keep the newest 30 playback records.
           */
          $push: {
            history: {
              $each: [historyEntry],
              $slice: -30,
            },
          },
        },
        {
          returnDocument: "after",
        }
      );

    return (
      updatedView ||
      LessonView.findById(lessonView._id)
    );
  };

export const finalizeStaleSessionIfNeeded =
  async (lessonView) => {
    if (
      !lessonView?.activeSession ||
      !isPlaybackSessionStale(
        lessonView.activeSession
      )
    ) {
      return lessonView;
    }

    return finalizePlaybackSession({
      lessonView,
      sessionId:
        lessonView.activeSession.sessionId,
      status: "timeout",
    });
  };

export const getLessonViewSummary = ({
  lesson,
  lessonView,
}) => {
  const baseLimit = Number(lesson.maxViews || 2);
  const extraViews = Number(lessonView?.extraViews || 0);
  const viewsUsed = Number(lessonView?.viewsUsed || 0);
  const totalAllowedViews = baseLimit + extraViews;
  const hasActiveSession = Boolean(lessonView?.activeSession);

  const viewsRemaining = Math.max(
    totalAllowedViews - viewsUsed,
    0
  );

  const newViewsRemaining = Math.max(
    totalAllowedViews -
      viewsUsed -
      (hasActiveSession ? 1 : 0),
    0
  );

  const activeSession = lessonView?.activeSession
    ? {
        sessionId: lessonView.activeSession.sessionId,
        startedAt: lessonView.activeSession.startedAt,
        lastHeartbeatAt:
          lessonView.activeSession.lastHeartbeatAt,
        watchedSeconds:
          lessonView.activeSession.watchedSeconds || 0,
        currentPositionSeconds:
          lessonView.activeSession.currentPositionSeconds ??
          lessonView.activeSession.watchedSeconds ??
          0,
        rewindLockedUntilSeconds:
          lessonView.activeSession.rewindLockedUntilSeconds ?? null,
        durationSeconds:
          lessonView.activeSession.durationSeconds || 0,
      }
    : null;

  return {
    baseLimit,
    extraViews,
    totalAllowedViews,
    viewsUsed,
    viewsRemaining,
    newViewsRemaining,
    hasActiveSession,
    activeSession,
  };
};
