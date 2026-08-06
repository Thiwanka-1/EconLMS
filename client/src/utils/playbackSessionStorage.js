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
        };
      } catch {
        // Older sessions stored only the raw ID.
        return {
          sessionId:
            storedValue.trim(),
          watchedSeconds: 0,
        };
      }
    } catch {
      return {
        sessionId: "",
        watchedSeconds: 0,
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
    });
  };

export const setStoredPlaybackProgress = ({
  lessonId,
  sessionId,
  watchedSeconds,
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

    getStorage()?.setItem(
      getStorageKey(
        lessonId
      ),
      JSON.stringify({
        sessionId:
          String(sessionId),
        watchedSeconds:
          nextWatchedSeconds,
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
