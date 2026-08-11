const STORAGE_KEY_PREFIX =
  "econlls.playbackSession.";

const getStorage = () => {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  return window.sessionStorage;
};

const getStorageKey = (
  lessonId
) => {
  return `${STORAGE_KEY_PREFIX}${String(
    lessonId || ""
  )}`;
};

export const getStoredPlaybackSession =
  (lessonId) => {
    if (!lessonId) {
      return {
        sessionId: "",
        watchedSeconds: 0,
        currentPositionSeconds: 0,
        rewindLockedUntilSeconds: null,
      };
    }

    try {
      const storedValue =
        getStorage()?.getItem(
          getStorageKey(
            lessonId
          )
        ) || "";

      if (!storedValue) {
        return {
          sessionId: "",
          watchedSeconds: 0,
          currentPositionSeconds: 0,
          rewindLockedUntilSeconds: null,
        };
      }

      try {
        const parsedValue =
          JSON.parse(storedValue);

        return {
          sessionId:
            typeof parsedValue?.sessionId ===
            "string"
              ? parsedValue.sessionId.trim()
              : "",

          watchedSeconds: Math.max(
            Number(
              parsedValue?.watchedSeconds
            ) || 0,
            0
          ),

          currentPositionSeconds: Math.max(
            Number(parsedValue?.currentPositionSeconds) ||
              Number(parsedValue?.watchedSeconds) ||
              0,
            0
          ),

          rewindLockedUntilSeconds:
            Number.isFinite(Number(parsedValue?.rewindLockedUntilSeconds)) &&
            Number(parsedValue?.rewindLockedUntilSeconds) > 0
              ? Number(parsedValue.rewindLockedUntilSeconds)
              : null,
        };
      } catch {
        // Older sessions stored only the raw ID.
        return {
          sessionId:
            storedValue.trim(),
          watchedSeconds: 0,
          currentPositionSeconds: 0,
          rewindLockedUntilSeconds: null,
        };
      }
    } catch {
      return {
        sessionId: "",
        watchedSeconds: 0,
        currentPositionSeconds: 0,
        rewindLockedUntilSeconds: null,
      };
    }
  };

export const getStoredPlaybackSessionId =
  (lessonId) =>
    getStoredPlaybackSession(
      lessonId
    ).sessionId;

export const setStoredPlaybackSessionId =
  (
    lessonId,
    sessionId
  ) => {
    if (
      !lessonId ||
      !sessionId
    ) {
      return;
    }

    const storedSession =
      getStoredPlaybackSession(
        lessonId
      );

    setStoredPlaybackProgress({
      lessonId,
      sessionId,
      watchedSeconds:
        storedSession.sessionId ===
        String(sessionId)
          ? storedSession.watchedSeconds
          : 0,
      currentPositionSeconds:
        storedSession.sessionId === String(sessionId)
          ? storedSession.currentPositionSeconds
          : 0,
      rewindLockedUntilSeconds:
        storedSession.sessionId === String(sessionId)
          ? storedSession.rewindLockedUntilSeconds
          : null,
    });
  };

export const setStoredPlaybackProgress = ({
  lessonId,
  sessionId,
  watchedSeconds,
  currentPositionSeconds = watchedSeconds,
  rewindLockedUntilSeconds,
}) => {
  if (!lessonId || !sessionId) {
    return;
  }

  try {
    const storedSession =
      getStoredPlaybackSession(
        lessonId
      );

    const nextWatchedSeconds =
      storedSession.sessionId ===
      String(sessionId)
        ? Math.max(
            storedSession.watchedSeconds,
            Number(watchedSeconds) || 0
          )
        : Math.max(
            Number(watchedSeconds) || 0,
            0
          );

    const requestedCurrentPosition = Math.max(
      Number(currentPositionSeconds) || 0,
      0
    );
    const rewindFloor = Math.max(nextWatchedSeconds - 120, 0);
    const nextCurrentPositionSeconds = Math.min(
      Math.max(requestedCurrentPosition, rewindFloor),
      nextWatchedSeconds
    );
    const requestedLock = Number(rewindLockedUntilSeconds);
    const existingLock =
      storedSession.sessionId === String(sessionId)
        ? storedSession.rewindLockedUntilSeconds
        : null;
    let nextRewindLockedUntilSeconds =
      rewindLockedUntilSeconds === undefined
        ? existingLock
        : Number.isFinite(requestedLock) && requestedLock > 0
          ? Math.min(requestedLock, nextWatchedSeconds)
          : null;

    if (
      nextRewindLockedUntilSeconds !== null &&
      nextCurrentPositionSeconds >= nextRewindLockedUntilSeconds - 0.1
    ) {
      nextRewindLockedUntilSeconds = null;
    }

    getStorage()?.setItem(
      getStorageKey(
        lessonId
      ),
      JSON.stringify({
        sessionId:
          String(sessionId),
        watchedSeconds:
          nextWatchedSeconds,
        currentPositionSeconds:
          nextCurrentPositionSeconds,
        rewindLockedUntilSeconds:
          nextRewindLockedUntilSeconds,
      })
    );
  } catch {
    // Playback still works without
    // browser session storage.
  }
};

export const clearStoredPlaybackSessionId =
  (lessonId) => {
    if (!lessonId) {
      return;
    }

    try {
      getStorage()?.removeItem(
        getStorageKey(
          lessonId
        )
      );
    } catch {
      // Nothing else is required.
    }
  };
