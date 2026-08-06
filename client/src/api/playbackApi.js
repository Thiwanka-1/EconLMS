import {
  apiRequest,
} from "./http.js";

export const startLessonPlayback = ({
  lessonId,
  sessionId = "",
  watchedSeconds = 0,
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
