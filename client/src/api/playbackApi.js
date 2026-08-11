import {
  apiRequest,
} from "./http.js";

export const startLessonPlayback = ({
  lessonId,
  sessionId = "",
  watchedSeconds = 0,
  currentPositionSeconds = watchedSeconds,
  rewindLockedUntilSeconds = null,
}) => {
  const normalizedSessionId =
    String(sessionId || "").trim();

  return apiRequest(
    `/playback/lessons/${encodeURIComponent(
      lessonId
    )}/start`,
    {
      method: "POST",

      body: normalizedSessionId
        ? {
            sessionId:
              normalizedSessionId,

            watchedSeconds:
              Math.max(
                Number(
                  watchedSeconds
                ) || 0,
                0
              ),

            currentPositionSeconds:
              Math.max(
                Number(currentPositionSeconds) || 0,
                0
              ),

            rewindLockedUntilSeconds,
          }
        : {},
    }
  );
};

export const getMyLessonPlayback = (
  lessonId
) => {
  return apiRequest(
    `/playback/lessons/${encodeURIComponent(
      lessonId
    )}/me`
  );
};

export const sendPlaybackHeartbeat = ({
  sessionId,
  watchedSeconds,
  currentPositionSeconds,
  rewindLockedUntilSeconds,
  durationSeconds,
}) => {
  return apiRequest(
    `/playback/${encodeURIComponent(
      sessionId
    )}/heartbeat`,
    {
      method: "PATCH",

      body: {
        watchedSeconds,
        currentPositionSeconds,
        rewindLockedUntilSeconds,
        durationSeconds,
      },
    }
  );
};

export const endLessonPlayback = ({
  sessionId,
  status,
}) => {
  return apiRequest(
    `/playback/${encodeURIComponent(
      sessionId
    )}/end`,
    {
      method: "POST",

      body: {
        status:
          status === "completed"
            ? "completed"
            : "left",
      },
    }
  );
};
