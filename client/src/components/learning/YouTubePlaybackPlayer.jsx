import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  endLessonPlayback,
  sendPlaybackHeartbeat,
} from "../../api/playbackApi.js";

import {
  loadYouTubeIframeApi,
} from "../../utils/youtubeApi.js";

import StatusMessage from "../common/StatusMessage.jsx";

const getPlayerErrorMessage = (
  errorCode
) => {
  switch (Number(errorCode)) {
    case 2:
      return "The lesson has an invalid YouTube video ID.";

    case 5:
      return "The lesson video could not be played in this browser.";

    case 100:
      return "The lesson video is unavailable or has been removed.";

    case 101:
    case 150:
      return "The lesson video owner has disabled embedded playback.";

    case 153:
      return "YouTube could not verify the player request.";

    default:
      return "The lesson video could not be played.";
  }
};

const formatDuration = (
  seconds
) => {
  const normalizedSeconds =
    Math.max(
      Number(seconds) || 0,
      0
    );

  const minutes =
    Math.floor(
      normalizedSeconds / 60
    );

  const remainingSeconds =
    Math.floor(
      normalizedSeconds % 60
    );

  return `${minutes}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};

export default function YouTubePlaybackPlayer({
  playbackSession,
  onFinished,
  onSessionInvalid,
}) {
  const reactId =
    useId();

  const playerElementId =
    useMemo(
      () =>
        `econlls-youtube-${reactId.replace(
          /[^a-zA-Z0-9_-]/g,
          ""
        )}`,
      [reactId]
    );

  const initialWatchedSeconds =
    Number(
      playbackSession.playback
        ?.activeSession
        ?.watchedSeconds || 0
    );

  const initialDurationSeconds =
    Number(
      playbackSession.playback
        ?.activeSession
        ?.durationSeconds || 0
    );

  const playerRef =
    useRef(null);

  const closedRef =
    useRef(false);

  const heartbeatInFlightRef =
    useRef(false);

  const endingPromiseRef =
    useRef(null);

  const watchedSecondsRef =
    useRef(
      initialWatchedSeconds
    );

  const durationSecondsRef =
    useRef(
      initialDurationSeconds
    );

  const [isReady, setIsReady] =
    useState(false);

  const [isEnding, setIsEnding] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    watchedSeconds,
    setWatchedSeconds,
  ] = useState(
    initialWatchedSeconds
  );

  const [
    durationSeconds,
    setDurationSeconds,
  ] = useState(
    initialDurationSeconds
  );

  const updateStoredMetrics =
    useCallback(
      ({
        watched,
        duration,
      }) => {
        watchedSecondsRef.current =
          watched;

        durationSecondsRef.current =
          duration;

        setWatchedSeconds(
          watched
        );

        setDurationSeconds(
          duration
        );
      },
      []
    );

  const getPlayerMetrics =
    useCallback(() => {
      let currentTime =
        watchedSecondsRef.current;

      let duration =
        durationSecondsRef.current;

      try {
        const value =
          Number(
            playerRef.current
              ?.getCurrentTime?.()
          );

        if (
          Number.isFinite(value) &&
          value >= 0
        ) {
          currentTime = value;
        }
      } catch {
        // Use last known position.
      }

      try {
        const value =
          Number(
            playerRef.current
              ?.getDuration?.()
          );

        if (
          Number.isFinite(value) &&
          value >= 0
        ) {
          duration = value;
        }
      } catch {
        // Use last known duration.
      }

      return {
        watched:
          Math.max(
            Math.floor(
              currentTime
            ),
            0
          ),

        duration:
          Math.max(
            Math.floor(
              duration
            ),
            0
          ),
      };
    }, []);

  const invalidateSession =
    useCallback(
      (requestError) => {
        closedRef.current =
          true;

        setError(
          requestError.message ||
            "The playback session is no longer active."
        );

        onSessionInvalid?.(
          requestError
        );
      },
      [onSessionInvalid]
    );

  const sendHeartbeatNow =
    useCallback(async () => {
      if (
        closedRef.current ||
        heartbeatInFlightRef.current
      ) {
        return null;
      }

      heartbeatInFlightRef.current =
        true;

      try {
        const metrics =
          getPlayerMetrics();

        const result =
          await sendPlaybackHeartbeat({
            sessionId:
              playbackSession.sessionId,

            watchedSeconds:
              metrics.watched,

            durationSeconds:
              metrics.duration,
          });

        updateStoredMetrics({
          watched:
            Number(
              result.playback
                ?.watchedSeconds ??
                metrics.watched
            ),

          duration:
            Number(
              result.playback
                ?.durationSeconds ??
                metrics.duration
            ),
        });

        return result;
      } catch (requestError) {
        if (
          requestError.status ===
            404 ||
          requestError.status ===
            409
        ) {
          invalidateSession(
            requestError
          );

          return null;
        }

        setError(
          requestError.message ||
            "Playback progress could not be synchronized."
        );

        return null;
      } finally {
        heartbeatInFlightRef.current =
          false;
      }
    }, [
      getPlayerMetrics,
      invalidateSession,
      playbackSession.sessionId,
      updateStoredMetrics,
    ]);

  const finishPlayback =
    useCallback(
      async (status) => {
        if (closedRef.current) {
          return null;
        }

        if (
          endingPromiseRef.current
        ) {
          return endingPromiseRef.current;
        }

        setError("");
        setIsEnding(true);

        const endingPromise =
          (async () => {
            await sendHeartbeatNow();

            if (
              closedRef.current
            ) {
              return null;
            }

            try {
              const result =
                await endLessonPlayback({
                  sessionId:
                    playbackSession.sessionId,

                  status,
                });

              closedRef.current =
                true;

              try {
                playerRef.current
                  ?.stopVideo?.();
              } catch {
                // Session has still ended.
              }

              onFinished?.(
                result
              );

              return result;
            } catch (
              requestError
            ) {
              if (
                requestError.status ===
                  404 ||
                requestError.status ===
                  409
              ) {
                invalidateSession(
                  requestError
                );

                return null;
              }

              setError(
                requestError.message ||
                  "The playback session could not be ended."
              );

              return null;
            }
          })();

        endingPromiseRef.current =
          endingPromise;

        try {
          return await endingPromise;
        } finally {
          endingPromiseRef.current =
            null;

          setIsEnding(false);
        }
      },
      [
        invalidateSession,
        onFinished,
        playbackSession.sessionId,
        sendHeartbeatNow,
      ]
    );

  useEffect(() => {
    let cancelled = false;

    const createPlayer =
      async () => {
        try {
          const YT =
            await loadYouTubeIframeApi();

          if (
            cancelled ||
            closedRef.current
          ) {
            return;
          }

          playerRef.current =
            new YT.Player(
              playerElementId,
              {
                width: "100%",
                height: "100%",

                videoId:
                  playbackSession
                    .lesson
                    .youtubeVideoId,

                playerVars: {
                  playsinline: 1,
                  rel: 0,
                  origin:
                    window.location
                      .origin,
                },

                events: {
                  onReady: (
                    event
                  ) => {
                    if (cancelled) {
                      return;
                    }

                    const resumePosition =
                      Number(
                        playbackSession
                          .playback
                          ?.activeSession
                          ?.watchedSeconds ||
                          0
                      );

                    if (
                      playbackSession.resumed &&
                      resumePosition > 0
                    ) {
                      try {
                        event.target.seekTo(
                          resumePosition,
                          true
                        );
                      } catch {
                        // Start from the
                        // current position.
                      }
                    }

                    setIsReady(true);
                  },

                  onStateChange: (
                    event
                  ) => {
                    if (
                      event.data ===
                      YT.PlayerState
                        .ENDED
                    ) {
                      void finishPlayback(
                        "completed"
                      );
                    }
                  },

                  onError: (
                    event
                  ) => {
                    setError(
                      getPlayerErrorMessage(
                        event.data
                      )
                    );
                  },
                },
              }
            );
        } catch (
          playerError
        ) {
          if (!cancelled) {
            setError(
              playerError.message ||
                "The YouTube player could not be loaded."
            );
          }
        }
      };

    createPlayer();

    return () => {
      cancelled = true;

      try {
        playerRef.current
          ?.destroy?.();
      } catch {
        // Player may already be gone.
      }

      playerRef.current =
        null;
    };
  }, [
    finishPlayback,
    playerElementId,
    playbackSession.lesson
      .youtubeVideoId,
    playbackSession.playback
      ?.activeSession
      ?.watchedSeconds,
    playbackSession.resumed,
  ]);

  useEffect(() => {
    const intervalSeconds =
      Math.max(
        Number(
          playbackSession
            .heartbeatIntervalSeconds ||
            20
        ),
        5
      );

    const heartbeatTimer =
      window.setInterval(
        () => {
          void sendHeartbeatNow();
        },
        intervalSeconds * 1000
      );

    return () => {
      window.clearInterval(
        heartbeatTimer
      );
    };
  }, [
    playbackSession
      .heartbeatIntervalSeconds,
    sendHeartbeatNow,
  ]);

  useEffect(() => {
    const displayTimer =
      window.setInterval(
        () => {
          if (
            closedRef.current
          ) {
            return;
          }

          updateStoredMetrics(
            getPlayerMetrics()
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        displayTimer
      );
    };
  }, [
    getPlayerMetrics,
    updateStoredMetrics,
  ]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-brand-700">
            Controlled lesson playback
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
            {
              playbackSession
                .lesson.title
            }
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {playbackSession.resumed
              ? "Your existing session was resumed."
              : "A new viewing session was started."}
          </p>
        </div>

        <button
          type="button"
          disabled={
            isEnding ||
            closedRef.current
          }
          onClick={() => {
            void finishPlayback(
              "left"
            );
          }}
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEnding
            ? "Ending session…"
            : "End viewing"}
        </button>
      </div>

      {error && (
        <div className="px-5 pt-5 sm:px-7">
          <StatusMessage variant="error">
            {error}
          </StatusMessage>
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="relative aspect-video min-h-60 overflow-hidden rounded-2xl bg-black">
          <div
            id={playerElementId}
            className="h-full w-full"
          />

          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-white">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />

                <p className="mt-4 text-sm font-bold">
                  Preparing playback…
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Watched
            </p>

            <p className="mt-2 text-lg font-black text-slate-950">
              {formatDuration(
                watchedSeconds
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Duration
            </p>

            <p className="mt-2 text-lg font-black text-slate-950">
              {durationSeconds > 0
                ? formatDuration(
                    durationSeconds
                  )
                : "Loading…"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              New views remaining
            </p>

            <p className="mt-2 text-lg font-black text-slate-950">
              {
                playbackSession
                  .playback
                  .newViewsRemaining
              }
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-500">
          Use End viewing when finished.
          Refreshing this browser tab keeps
          the session available for resume.
          Closing the tab leaves it active
          until the server timeout.
        </p>
      </div>
    </section>
  );
}