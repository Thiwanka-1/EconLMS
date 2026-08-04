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

export const getStoredPlaybackSessionId =
  (lessonId) => {
    if (!lessonId) {
      return "";
    }

    try {
      return (
        getStorage()?.getItem(
          getStorageKey(
            lessonId
          )
        ) || ""
      );
    } catch {
      return "";
    }
  };

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

    try {
      getStorage()?.setItem(
        getStorageKey(
          lessonId
        ),
        String(sessionId)
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