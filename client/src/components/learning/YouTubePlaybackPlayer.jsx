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

import { loadYouTubeIframeApi } from "../../utils/youtubeApi.js";

import StatusMessage from "../common/StatusMessage.jsx";

const getPlayerErrorMessage = (errorCode) => {
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

const formatDuration = (seconds) => {
  const normalizedSeconds = Math.max(Number(seconds) || 0, 0);
  const minutes = Math.floor(normalizedSeconds / 60);
  const remainingSeconds = Math.floor(normalizedSeconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(Number(value) || 0, minimum), maximum);

function PlayIcon({ isPlaying }) {
  if (isPlaying) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  );
}

function VolumeIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 9v6h4l5 4V5L8 9H4zm11.5 3a3.5 3.5 0 0 0-1.5-2.87v5.74A3.5 3.5 0 0 0 15.5 12z"
      />
      {muted ? (
        <path
          fill="currentColor"
          d="m16.6 8.2 1.4-1.4 2 2 2-2 1.4 1.4-2 2 2 2-1.4 1.4-2-2-2 2-1.4-1.4 2-2z"
        />
      ) : (
        <path
          fill="currentColor"
          d="M17.5 4.5v2.1a7 7 0 0 1 0 10.8v2.1a9 9 0 0 0 0-15z"
        />
      )}
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zm-3-12v2h3v3h2V5h-5z"
      />
    </svg>
  );
}

export default function YouTubePlaybackPlayer({
  playbackSession,
  onFinished,
  onSessionInvalid,
}) {
  const reactId = useId();

  const playerElementId = useMemo(
    () => `econlls-youtube-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactId],
  );

  const initialWatchedSeconds = Number(
    playbackSession.playback?.activeSession?.watchedSeconds || 0,
  );

  const initialDurationSeconds = Number(
    playbackSession.playback?.activeSession?.durationSeconds || 0,
  );

  const playerRef = useRef(null);
  const fullscreenContainerRef = useRef(null);
  const closedRef = useRef(false);
  const heartbeatInFlightRef = useRef(false);
  const endingPromiseRef = useRef(null);
  const watchedSecondsRef = useRef(initialWatchedSeconds);
  const durationSecondsRef = useRef(initialDurationSeconds);
  const isSeekingRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(100);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [availablePlaybackRates, setAvailablePlaybackRates] = useState([1]);
  const [seekPreviewSeconds, setSeekPreviewSeconds] = useState(
    initialWatchedSeconds,
  );
  const [error, setError] = useState("");
  const [watchedSeconds, setWatchedSeconds] = useState(
    initialWatchedSeconds,
  );
  const [durationSeconds, setDurationSeconds] = useState(
    initialDurationSeconds,
  );

  const updateStoredMetrics = useCallback(({ watched, duration }) => {
    watchedSecondsRef.current = watched;
    durationSecondsRef.current = duration;

    if (!isSeekingRef.current) {
      setWatchedSeconds(watched);
      setSeekPreviewSeconds(watched);
    }

    setDurationSeconds(duration);
  }, []);

  const getPlayerMetrics = useCallback(() => {
    let currentTime = watchedSecondsRef.current;
    let duration = durationSecondsRef.current;

    try {
      const value = Number(playerRef.current?.getCurrentTime?.());

      if (Number.isFinite(value) && value >= 0) {
        currentTime = value;
      }
    } catch {
      // Keep the last known position.
    }

    try {
      const value = Number(playerRef.current?.getDuration?.());

      if (Number.isFinite(value) && value >= 0) {
        duration = value;
      }
    } catch {
      // Keep the last known duration.
    }

    return {
      watched: Math.max(currentTime, 0),
      duration: Math.max(duration, 0),
    };
  }, []);

  const invalidateSession = useCallback(
    (requestError) => {
      closedRef.current = true;

      setError(
        requestError.message || "The playback session is no longer active.",
      );

      onSessionInvalid?.(requestError);
    },
    [onSessionInvalid],
  );

  const sendHeartbeatNow = useCallback(async () => {
    if (closedRef.current || heartbeatInFlightRef.current) {
      return null;
    }

    heartbeatInFlightRef.current = true;

    try {
      const metrics = getPlayerMetrics();

      const result = await sendPlaybackHeartbeat({
        sessionId: playbackSession.sessionId,
        watchedSeconds: Math.floor(metrics.watched),
        durationSeconds: Math.floor(metrics.duration),
      });

      updateStoredMetrics({
        watched: Number(
          result.playback?.watchedSeconds ?? metrics.watched,
        ),
        duration: Number(
          result.playback?.durationSeconds ?? metrics.duration,
        ),
      });

      return result;
    } catch (requestError) {
      if (requestError.status === 404 || requestError.status === 409) {
        invalidateSession(requestError);
        return null;
      }

      setError(
        requestError.message ||
          "Playback progress could not be synchronized.",
      );

      return null;
    } finally {
      heartbeatInFlightRef.current = false;
    }
  }, [
    getPlayerMetrics,
    invalidateSession,
    playbackSession.sessionId,
    updateStoredMetrics,
  ]);

  const finishPlayback = useCallback(
    async (status) => {
      if (closedRef.current) {
        return null;
      }

      if (endingPromiseRef.current) {
        return endingPromiseRef.current;
      }

      setError("");
      setIsEnding(true);

      const endingPromise = (async () => {
        await sendHeartbeatNow();

        if (closedRef.current) {
          return null;
        }

        try {
          const result = await endLessonPlayback({
            sessionId: playbackSession.sessionId,
            status,
          });

          closedRef.current = true;

          try {
            playerRef.current?.stopVideo?.();
          } catch {
            // The server session has still ended.
          }

          onFinished?.(result);
          return result;
        } catch (requestError) {
          if (requestError.status === 404 || requestError.status === 409) {
            invalidateSession(requestError);
            return null;
          }

          setError(
            requestError.message ||
              "The playback session could not be ended.",
          );

          return null;
        }
      })();

      endingPromiseRef.current = endingPromise;

      try {
        return await endingPromise;
      } finally {
        endingPromiseRef.current = null;
        setIsEnding(false);
      }
    },
    [
      invalidateSession,
      onFinished,
      playbackSession.sessionId,
      sendHeartbeatNow,
    ],
  );

  const togglePlayback = useCallback(() => {
    if (!isReady || closedRef.current) {
      return;
    }

    try {
      const state = playerRef.current?.getPlayerState?.();

      if (state === 1) {
        playerRef.current?.pauseVideo?.();
      } else {
        playerRef.current?.playVideo?.();
      }
    } catch {
      setError("Playback could not be controlled.");
    }
  }, [isReady]);

  const seekBy = useCallback(
    (seconds) => {
      if (!isReady || closedRef.current) {
        return;
      }

      try {
        const current = Number(playerRef.current?.getCurrentTime?.()) || 0;
        const duration = Number(playerRef.current?.getDuration?.()) || 0;
        const nextTime =
          duration > 0
            ? clamp(current + seconds, 0, duration)
            : Math.max(current + seconds, 0);

        playerRef.current?.seekTo?.(nextTime, true);
        watchedSecondsRef.current = nextTime;
        setWatchedSeconds(nextTime);
        setSeekPreviewSeconds(nextTime);
      } catch {
        setError("The video position could not be changed.");
      }
    },
    [isReady],
  );

  const beginSeeking = useCallback(() => {
    isSeekingRef.current = true;
  }, []);

  const updateSeekPreview = useCallback((event) => {
    isSeekingRef.current = true;
    setSeekPreviewSeconds(Number(event.target.value));
  }, []);

  const commitSeek = useCallback(() => {
    if (!isSeekingRef.current) {
      return;
    }

    isSeekingRef.current = false;

    try {
      playerRef.current?.seekTo?.(seekPreviewSeconds, true);
      watchedSecondsRef.current = seekPreviewSeconds;
      setWatchedSeconds(seekPreviewSeconds);
    } catch {
      setError("The video position could not be changed.");
    }
  }, [seekPreviewSeconds]);

  const toggleMute = useCallback(() => {
    if (!isReady) {
      return;
    }

    try {
      if (playerRef.current?.isMuted?.()) {
        playerRef.current?.unMute?.();
        setIsMuted(false);
      } else {
        playerRef.current?.mute?.();
        setIsMuted(true);
      }
    } catch {
      setError("The video sound could not be changed.");
    }
  }, [isReady]);

  const changeVolume = useCallback((event) => {
    const nextVolume = clamp(event.target.value, 0, 100);
    setVolume(nextVolume);

    try {
      playerRef.current?.setVolume?.(nextVolume);

      if (nextVolume === 0) {
        playerRef.current?.mute?.();
        setIsMuted(true);
      } else {
        playerRef.current?.unMute?.();
        setIsMuted(false);
      }
    } catch {
      setError("The video volume could not be changed.");
    }
  }, []);

  const changePlaybackRate = useCallback((event) => {
    const nextRate = Number(event.target.value);

    try {
      playerRef.current?.setPlaybackRate?.(nextRate);
      setPlaybackRateState(nextRate);
    } catch {
      setError("The playback speed could not be changed.");
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = fullscreenContainerRef.current;

    if (!container) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      setError("Fullscreen mode is not available in this browser.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const createPlayer = async () => {
      try {
        const YT = await loadYouTubeIframeApi();

        if (cancelled || closedRef.current) {
          return;
        }

        playerRef.current = new YT.Player(playerElementId, {
          width: "100%",
          height: "100%",
          videoId: playbackSession.lesson.youtubeVideoId,

          playerVars: {
            playsinline: 1,

            // Native controls are off because they also contain YouTube links.
            controls: 0,

            // The custom controls below provide keyboard and fullscreen support.
            disablekb: 1,
            fs: 0,

            iv_load_policy: 3,
            rel: 0,
            enablejsapi: 1,
            autoplay: 0,
            loop: 0,
            origin: window.location.origin,
          },

          events: {
            onReady: (event) => {
              if (cancelled) {
                return;
              }

              const resumePosition = Number(
                playbackSession.playback?.activeSession?.watchedSeconds || 0,
              );

              if (playbackSession.resumed && resumePosition > 0) {
                try {
                  event.target.seekTo(resumePosition, true);
                } catch {
                  // Start from the current position if seeking fails.
                }
              }

              try {
                const duration = Number(event.target.getDuration?.()) || 0;
                const currentTime = Number(event.target.getCurrentTime?.()) || 0;
                const currentVolume = Number(event.target.getVolume?.());
                const rates = event.target.getAvailablePlaybackRates?.() || [1];
                const currentRate = Number(event.target.getPlaybackRate?.()) || 1;
                const iframe = event.target.getIframe?.();

                updateStoredMetrics({
                  watched: currentTime,
                  duration,
                });

                setVolume(
                  Number.isFinite(currentVolume) ? currentVolume : 100,
                );
                setIsMuted(Boolean(event.target.isMuted?.()));
                setAvailablePlaybackRates(
                  Array.isArray(rates) && rates.length > 0 ? rates : [1],
                );
                setPlaybackRateState(currentRate);

                iframe?.setAttribute(
                  "title",
                  playbackSession.lesson.title || "Lesson video",
                );
                iframe?.setAttribute(
                  "referrerpolicy",
                  "strict-origin-when-cross-origin",
                );
              } catch {
                // Optional player details can load on the next timer tick.
              }

              setIsReady(true);
            },

            onStateChange: (event) => {
              setIsPlaying(event.data === YT.PlayerState.PLAYING);
              setIsBuffering(event.data === YT.PlayerState.BUFFERING);

              if (event.data === YT.PlayerState.ENDED) {
                void finishPlayback("completed");
              }
            },

            onPlaybackRateChange: (event) => {
              setPlaybackRateState(Number(event.data) || 1);
            },

            onError: (event) => {
              setError(getPlayerErrorMessage(event.data));
            },
          },
        });
      } catch (playerError) {
        if (!cancelled) {
          setError(
            playerError.message || "The YouTube player could not be loaded.",
          );
        }
      }
    };

    void createPlayer();

    return () => {
      cancelled = true;

      try {
        playerRef.current?.destroy?.();
      } catch {
        // The player may already be gone.
      }

      playerRef.current = null;
    };
  }, [
    finishPlayback,
    playerElementId,
    playbackSession.lesson.title,
    playbackSession.lesson.youtubeVideoId,
    playbackSession.playback?.activeSession?.watchedSeconds,
    playbackSession.resumed,
    updateStoredMetrics,
  ]);

  useEffect(() => {
    const intervalSeconds = Math.max(
      Number(playbackSession.heartbeatIntervalSeconds || 20),
      5,
    );

    const heartbeatTimer = window.setInterval(() => {
      void sendHeartbeatNow();
    }, intervalSeconds * 1000);

    return () => {
      window.clearInterval(heartbeatTimer);
    };
  }, [playbackSession.heartbeatIntervalSeconds, sendHeartbeatNow]);

  useEffect(() => {
    const displayTimer = window.setInterval(() => {
      if (closedRef.current || isSeekingRef.current) {
        return;
      }

      updateStoredMetrics(getPlayerMetrics());
    }, 500);

    return () => {
      window.clearInterval(displayTimer);
    };
  }, [getPlayerMetrics, updateStoredMetrics]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement === fullscreenContainerRef.current,
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleKeyboard = useCallback(
    (event) => {
      const interactiveTag = ["INPUT", "SELECT", "BUTTON"].includes(
        event.target.tagName,
      );

      if (interactiveTag) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case " ":
        case "k":
          event.preventDefault();
          togglePlayback();
          break;

        case "arrowleft":
          event.preventDefault();
          seekBy(-5);
          break;

        case "arrowright":
          event.preventDefault();
          seekBy(5);
          break;

        case "j":
          event.preventDefault();
          seekBy(-10);
          break;

        case "l":
          event.preventDefault();
          seekBy(10);
          break;

        case "m":
          event.preventDefault();
          toggleMute();
          break;

        case "f":
          event.preventDefault();
          void toggleFullscreen();
          break;

        default:
          break;
      }
    }, [seekBy, toggleFullscreen, toggleMute, togglePlayback],
  );

  const displayedTime = isSeekingRef.current
    ? seekPreviewSeconds
    : watchedSeconds;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-brand-700">
            Controlled lesson playback
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
            {playbackSession.lesson.title}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {playbackSession.resumed
              ? "Your existing session was resumed."
              : "A new viewing session was started."}
          </p>
        </div>

        <button
          type="button"
          disabled={isEnding || closedRef.current}
          onClick={() => {
            void finishPlayback("left");
          }}
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEnding ? "Ending session…" : "End viewing"}
        </button>
      </div>

      {error && (
        <div className="px-5 pt-5 sm:px-7">
          <StatusMessage variant="error">{error}</StatusMessage>
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div
          ref={fullscreenContainerRef}
          tabIndex={0}
          onKeyDown={handleKeyboard}
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
          className={`overflow-hidden bg-black outline-none ${
            isFullscreen ? "flex h-screen w-screen flex-col" : "rounded-2xl"
          }`}
        >
          <div
            className={`relative select-none bg-black ${
              isFullscreen
                ? "min-h-0 flex-1"
                : "aspect-video min-h-[200px]"
            }`}
          >
            <div id={playerElementId} className="h-full w-full" />

            {/*
              These masks cover YouTube's Share and Watch-on-YouTube areas.
              They are intentionally small because all actual playback controls
              are rendered below the iframe by this component.
            */}
            {isReady && (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-auto absolute bottom-0 left-0 z-20 h-14 w-24 rounded-tr-2xl bg-black sm:h-16 sm:w-28"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-auto absolute bottom-0 right-0 z-20 h-[30%] min-h-16 max-h-40 w-[52%] min-w-40 max-w-md rounded-tl-2xl bg-black sm:h-[27%] sm:w-[40%] lg:h-[24%] lg:w-[34%]"
                />
              </>
            )}

            {!isReady && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                  <p className="mt-4 text-sm font-bold">Preparing playback…</p>
                </div>
              </div>
            )}

            {isReady && !isPlaying && !isBuffering && (
              <button
                type="button"
                onClick={togglePlayback}
                className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black/85 focus:outline-none focus:ring-4 focus:ring-white/40"
                aria-label="Play video"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="ml-1 h-9 w-9"
                  aria-hidden="true"
                >
                  <path fill="currentColor" d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}

            {isBuffering && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-slate-950 px-3 py-3 text-white sm:px-4">
            <div className="flex items-center gap-3">
              <span className="w-12 text-right text-xs font-bold tabular-nums text-slate-300">
                {formatDuration(displayedTime)}
              </span>

              <input
                type="range"
                min="0"
                max={Math.max(durationSeconds, 0)}
                step="0.1"
                value={Math.min(displayedTime, Math.max(durationSeconds, 0))}
                disabled={!isReady || durationSeconds <= 0}
                onPointerDown={beginSeeking}
                onChange={updateSeekPreview}
                onPointerUp={commitSeek}
                onPointerCancel={commitSeek}
                onKeyUp={commitSeek}
                aria-label="Video position"
                className="h-2 min-w-0 flex-1 cursor-pointer accent-white disabled:cursor-not-allowed disabled:opacity-50"
              />

              <span className="w-12 text-xs font-bold tabular-nums text-slate-300">
                {formatDuration(durationSeconds)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={!isReady}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isPlaying ? "Pause video" : "Play video"}
              >
                <PlayIcon isPlaying={isPlaying} />
              </button>

              <button
                type="button"
                onClick={() => seekBy(-10)}
                disabled={!isReady}
                className="h-10 rounded-xl bg-white/10 px-3 text-xs font-black transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Go back 10 seconds"
              >
                −10s
              </button>

              <button
                type="button"
                onClick={() => seekBy(10)}
                disabled={!isReady}
                className="h-10 rounded-xl bg-white/10 px-3 text-xs font-black transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Go forward 10 seconds"
              >
                +10s
              </button>

              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  disabled={!isReady}
                  className="flex h-10 w-8 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                >
                  <VolumeIcon muted={isMuted} />
                </button>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={isMuted ? 0 : volume}
                  onChange={changeVolume}
                  disabled={!isReady}
                  aria-label="Volume"
                  className="h-2 w-20 cursor-pointer accent-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-24"
                />
              </div>

              <label className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-bold">
                Speed
                <select
                  value={playbackRate}
                  onChange={changePlaybackRate}
                  disabled={!isReady}
                  className="bg-transparent font-black text-white outline-none disabled:opacity-40"
                  aria-label="Playback speed"
                >
                  {availablePlaybackRates.map((rate) => (
                    <option key={rate} value={rate} className="text-black">
                      {rate}×
                    </option>
                  ))}
                </select>
              </label>

              <div
                className="flex h-10 items-center rounded-xl bg-white/10 px-3 text-xs font-bold text-slate-300"
                title="YouTube automatically selects stream quality in API-controlled players."
              >
                Quality: Auto
              </div>

              <button
                type="button"
                onClick={() => {
                  void toggleFullscreen();
                }}
                disabled={!isReady}
                className="ml-auto flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-black transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                <FullscreenIcon />
                <span className="hidden sm:inline">
                  {isFullscreen ? "Exit" : "Fullscreen"}
                </span>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          Quality is selected automatically by YouTube. The IFrame API no
          longer provides a working manual quality selector.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Watched
            </p>

            <p className="mt-2 text-lg font-black text-slate-950">
              {formatDuration(watchedSeconds)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Duration
            </p>

            <p className="mt-2 text-lg font-black text-slate-950">
              {durationSeconds > 0
                ? formatDuration(durationSeconds)
                : "Loading…"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              New views remaining
            </p>

            <p className="mt-2 text-lg font-black text-slate-950">
              {playbackSession.playback.newViewsRemaining}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-500">
          Use End viewing when finished. Refreshing this browser tab keeps the
          session available for resume. Closing the tab leaves it active until
          the server timeout.
        </p>
      </div>
    </section>
  );
}
