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

import { useAuth } from "../../auth/useAuth.js";

import { loadYouTubeIframeApi } from "../../utils/youtubeApi.js";
import { setStoredPlaybackProgress } from "../../utils/playbackSessionStorage.js";
import {
  getPlaybackRewindAvailable,
  getPlaybackRewindFloor,
  getPlaybackRewindTarget,
  PLAYBACK_REWIND_LIMIT_SECONDS,
  resolvePlaybackRewindLock,
} from "../../utils/playbackRewind.js";

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

const WATERMARK_POSITIONS = [
  "left-[4%] top-[24%]",
  "right-[4%] top-[24%]",
  "left-[4%] top-1/2 -translate-y-1/2",
  "right-[4%] top-1/2 -translate-y-1/2",
  "bottom-[7%] left-[4%]",
  "bottom-[7%] right-[4%]",
];

const getShortIdentifier = (value, { fromEnd = false } = {}) => {
  const normalizedValue = String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  if (!normalizedValue) {
    return "UNAVAILABLE";
  }

  return fromEnd
    ? normalizedValue.slice(-8)
    : normalizedValue.slice(0, 8);
};

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
  const { user } = useAuth();
  const reactId = useId();

  const playerElementId = useMemo(
    () => `econlls-youtube-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactId],
  );

  const initialWatchedSeconds = Number(
    playbackSession.playback?.activeSession?.watchedSeconds || 0,
  );

  const initialCurrentPositionSeconds = Number(
    playbackSession.playback?.activeSession?.currentPositionSeconds ??
      initialWatchedSeconds,
  );

  const initialDurationSeconds = Number(
    playbackSession.playback?.activeSession?.durationSeconds || 0,
  );

  const initialRewindLockedUntilSeconds =
    playbackSession.playback?.activeSession?.rewindLockedUntilSeconds ?? null;

  const playerRef = useRef(null);
  const fullscreenContainerRef = useRef(null);
  const closedRef = useRef(false);
  const heartbeatInFlightRef = useRef(false);
  const endingPromiseRef = useRef(null);
  const currentPositionSecondsRef = useRef(initialCurrentPositionSeconds);
  const furthestWatchedSecondsRef = useRef(initialWatchedSeconds);
  const rewindLockedUntilSecondsRef = useRef(
    initialRewindLockedUntilSeconds,
  );
  const durationSecondsRef = useRef(initialDurationSeconds);

  const [isReady, setIsReady] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(100);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [availablePlaybackRates, setAvailablePlaybackRates] = useState([1]);
  const [error, setError] = useState("");
  const [rewindNotice, setRewindNotice] = useState("");
  const [watchedSeconds, setWatchedSeconds] = useState(
    initialWatchedSeconds,
  );
  const [currentPositionSeconds, setCurrentPositionSeconds] = useState(
    initialCurrentPositionSeconds,
  );
  const [rewindLockedUntilSeconds, setRewindLockedUntilSeconds] = useState(
    initialRewindLockedUntilSeconds,
  );
  const [durationSeconds, setDurationSeconds] = useState(
    initialDurationSeconds,
  );
  const [watermarkPositionIndex, setWatermarkPositionIndex] = useState(0);

  const watermarkName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "Student";
  const watermarkEmail =
    String(user?.email || "Email unavailable").trim().toLowerCase();
  const watermarkStudentId = getShortIdentifier(user?._id, {
    fromEnd: true,
  });
  const watermarkSessionId = getShortIdentifier(playbackSession.sessionId);

  useEffect(() => {
    if (!isReady) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setWatermarkPositionIndex(
        (currentIndex) => (currentIndex + 1) % WATERMARK_POSITIONS.length,
      );
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isReady]);

  const updateStoredMetrics = useCallback(({
    watched,
    currentPosition,
    duration,
    rewindLockedUntil,
  }) => {
    const nextWatchedSeconds = Math.max(
      furthestWatchedSecondsRef.current,
      Number(watched) || 0,
      0,
    );
    const nextDurationSeconds = Math.max(
      durationSecondsRef.current,
      Number(duration) || 0,
      0,
    );
    const requestedCurrentPosition = Number(currentPosition);
    const nextCurrentPositionSeconds = Number.isFinite(requestedCurrentPosition)
      ? clamp(
          requestedCurrentPosition,
          0,
          nextDurationSeconds > 0
            ? nextDurationSeconds
            : Number.MAX_SAFE_INTEGER,
        )
      : currentPositionSecondsRef.current;
    const lockCandidate =
      rewindLockedUntil === undefined
        ? rewindLockedUntilSecondsRef.current
        : rewindLockedUntil;
    const nextRewindLockedUntilSeconds = resolvePlaybackRewindLock({
      currentPositionSeconds: nextCurrentPositionSeconds,
      furthestWatchedSeconds: nextWatchedSeconds,
      existingLockSeconds: lockCandidate,
    });
    const wasRewindLocked = rewindLockedUntilSecondsRef.current !== null;

    furthestWatchedSecondsRef.current = nextWatchedSeconds;
    currentPositionSecondsRef.current = nextCurrentPositionSeconds;
    rewindLockedUntilSecondsRef.current = nextRewindLockedUntilSeconds;
    durationSecondsRef.current = nextDurationSeconds;

    setWatchedSeconds(nextWatchedSeconds);
    setCurrentPositionSeconds(nextCurrentPositionSeconds);
    setRewindLockedUntilSeconds(nextRewindLockedUntilSeconds);
    setDurationSeconds(nextDurationSeconds);

    if (wasRewindLocked && nextRewindLockedUntilSeconds === null) {
      setRewindNotice("");
    }

    setStoredPlaybackProgress({
      lessonId: playbackSession.lesson._id,
      sessionId: playbackSession.sessionId,
      watchedSeconds: nextWatchedSeconds,
      currentPositionSeconds: nextCurrentPositionSeconds,
      rewindLockedUntilSeconds: nextRewindLockedUntilSeconds,
    });
  }, [playbackSession.lesson._id, playbackSession.sessionId]);

  const getPlayerMetrics = useCallback(() => {
    let currentTime = currentPositionSecondsRef.current;
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
      watched: Math.max(
        currentTime,
        furthestWatchedSecondsRef.current,
        0,
      ),
      currentPosition: Math.max(currentTime, 0),
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
        currentPositionSeconds: metrics.currentPosition,
        rewindLockedUntilSeconds: rewindLockedUntilSecondsRef.current,
        durationSeconds: Math.floor(metrics.duration),
      });
      const latestMetrics = getPlayerMetrics();

      updateStoredMetrics({
        watched: Number(
          result.playback?.watchedSeconds ?? latestMetrics.watched,
        ),
        currentPosition: latestMetrics.currentPosition,
        rewindLockedUntil:
          result.playback?.rewindLockedUntilSeconds ??
          rewindLockedUntilSecondsRef.current,
        duration: Number(
          result.playback?.durationSeconds ?? latestMetrics.duration,
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

  const seekForwardBy = useCallback(
    (seconds) => {
      if (!isReady || closedRef.current) {
        return;
      }

      try {
        const forwardSeconds = Math.max(Number(seconds) || 0, 0);
        const current = Math.max(
          Number(playerRef.current?.getCurrentTime?.()) ||
            currentPositionSecondsRef.current,
          0,
        );
        const duration = Number(playerRef.current?.getDuration?.()) || 0;
        const nextTime =
          duration > 0
            ? clamp(current + forwardSeconds, 0, duration)
            : Math.max(current + forwardSeconds, 0);

        playerRef.current?.seekTo?.(nextTime, true);
        updateStoredMetrics({
          watched: Math.max(nextTime, furthestWatchedSecondsRef.current),
          currentPosition: nextTime,
          duration,
        });
        setRewindNotice("");
      } catch {
        setError("The video position could not be changed.");
      }
    },
    [isReady, updateStoredMetrics],
  );

  const rewindTenSeconds = useCallback(() => {
    if (!isReady || closedRef.current) {
      return;
    }

    try {
      const playerCurrentTime = Number(playerRef.current?.getCurrentTime?.());
      const current = Number.isFinite(playerCurrentTime)
        ? Math.max(playerCurrentTime, 0)
        : currentPositionSecondsRef.current;
      const existingLock = resolvePlaybackRewindLock({
        currentPositionSeconds: current,
        furthestWatchedSeconds: furthestWatchedSecondsRef.current,
        existingLockSeconds: rewindLockedUntilSecondsRef.current,
      });

      if (existingLock !== null) {
        setRewindNotice(
          `The full two-minute rewind has been used. Watch forward or use +10s until ${formatDuration(existingLock)} before rewinding again.`,
        );
        return;
      }

      const rewind = getPlaybackRewindTarget({
        currentPositionSeconds: current,
        furthestWatchedSeconds: furthestWatchedSecondsRef.current,
      });

      if (!rewind.canRewind || rewind.actualStepSeconds < 0.1) {
        setRewindNotice(
          rewind.floorSeconds <= 0 && current <= 0.1
            ? "You are already at the beginning of the video."
            : "You have reached the two-minute rewind limit. Watch forward or use +10s before rewinding again.",
        );
        return;
      }

      const duration = Number(playerRef.current?.getDuration?.()) || 0;
      const nextRewindLock = resolvePlaybackRewindLock({
        currentPositionSeconds: rewind.targetSeconds,
        furthestWatchedSeconds: furthestWatchedSecondsRef.current,
        reachedRewindFloor:
          rewind.targetSeconds <= rewind.floorSeconds + 0.1,
      });
      playerRef.current?.seekTo?.(rewind.targetSeconds, true);
      updateStoredMetrics({
        watched: furthestWatchedSecondsRef.current,
        currentPosition: rewind.targetSeconds,
        rewindLockedUntil: nextRewindLock,
        duration,
      });
      setRewindNotice("");
    } catch {
      setError("The video position could not be changed.");
    }
  }, [isReady, updateStoredMetrics]);

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
            start:
              playbackSession.resumed
                ? Math.floor(
                    initialCurrentPositionSeconds
                  )
                : 0,
            origin: window.location.origin,
          },

          events: {
            onReady: (event) => {
              if (cancelled) {
                return;
              }

              const resumePosition = Number(
                playbackSession.playback?.activeSession?.currentPositionSeconds ??
                  playbackSession.playback?.activeSession?.watchedSeconds ??
                  0,
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
                const currentTime = Math.max(
                  Number(event.target.getCurrentTime?.()) || 0,
                  playbackSession.resumed ? resumePosition : 0,
                );
                const currentVolume = Number(event.target.getVolume?.());
                const rates = event.target.getAvailablePlaybackRates?.() || [1];
                const currentRate = Number(event.target.getPlaybackRate?.()) || 1;
                const iframe = event.target.getIframe?.();

                updateStoredMetrics({
                  watched: Math.max(currentTime, initialWatchedSeconds),
                  currentPosition: currentTime,
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

              if (event.data === YT.PlayerState.PAUSED) {
                updateStoredMetrics(getPlayerMetrics());
                void sendHeartbeatNow();
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
    playbackSession.playback?.activeSession?.currentPositionSeconds,
    playbackSession.playback?.activeSession?.watchedSeconds,
    playbackSession.resumed,
    getPlayerMetrics,
    initialCurrentPositionSeconds,
    initialWatchedSeconds,
    sendHeartbeatNow,
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
      if (closedRef.current) {
        return;
      }

      const metrics = getPlayerMetrics();

      try {
        const currentTime = Number(
          playerRef.current?.getCurrentTime?.()
        );

        const rewindFloor = getPlaybackRewindFloor(
          furthestWatchedSecondsRef.current,
        );

        if (
          isReady &&
          Number.isFinite(currentTime) &&
          currentTime + 0.5 < rewindFloor
        ) {
          playerRef.current?.seekTo?.(
            rewindFloor,
            true
          );
          metrics.currentPosition = rewindFloor;
        }
      } catch {
        // The next timer tick will retry.
      }

      updateStoredMetrics(metrics);
    }, 500);

    return () => {
      window.clearInterval(displayTimer);
    };
  }, [getPlayerMetrics, isReady, updateStoredMetrics]);

  useEffect(() => {
    const persistCurrentPosition = () => {
      updateStoredMetrics(
        getPlayerMetrics()
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistCurrentPosition();
        void sendHeartbeatNow();
      }
    };

    window.addEventListener(
      "pagehide",
      persistCurrentPosition
    );
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        "pagehide",
        persistCurrentPosition
      );
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      persistCurrentPosition();
    };
  }, [getPlayerMetrics, sendHeartbeatNow, updateStoredMetrics]);

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

        case "arrowright":
          event.preventDefault();
          seekForwardBy(5);
          break;

        case "l":
          event.preventDefault();
          seekForwardBy(10);
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
    }, [seekForwardBy, toggleFullscreen, toggleMute, togglePlayback],
  );

  const rewindAvailableSeconds = getPlaybackRewindAvailable({
    currentPositionSeconds,
    furthestWatchedSeconds: watchedSeconds,
  });
  const isRewindLocked =
    rewindLockedUntilSeconds !== null &&
    currentPositionSeconds < rewindLockedUntilSeconds - 0.1;
  const displayedRewindAvailableSeconds = isRewindLocked
    ? 0
    : rewindAvailableSeconds;
  const canRewind =
    isReady && !isRewindLocked && rewindAvailableSeconds >= 0.1;

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

      {rewindNotice && (
        <div className="px-5 pt-5 sm:px-7">
          <StatusMessage variant="warning">{rewindNotice}</StatusMessage>
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

            {isReady && (
              <>
                {/* Keep YouTube's external title/channel link from receiving clicks. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-auto absolute inset-x-0 top-0 z-20 h-[clamp(52px,18%,96px)] cursor-default touch-none bg-transparent"
                />

                {/* Share moves to the lower-left on compact YouTube layouts. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-auto absolute bottom-0 left-0 z-20 h-[clamp(64px,32%,160px)] w-[55%] cursor-default touch-none bg-transparent"
                />

                {/* Keep the Watch on YouTube link from receiving clicks. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-auto absolute bottom-0 right-0 z-20 h-[clamp(64px,32%,160px)] w-[55%] cursor-default touch-none bg-transparent"
                />
              </>
            )}

            {isReady && (
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute z-[25] max-w-[72%] select-none px-1 py-0.5 text-white opacity-40 [text-shadow:0_1px_3px_rgb(0_0_0/1),0_0_1px_rgb(0_0_0/1)] ${WATERMARK_POSITIONS[watermarkPositionIndex]}`}
              >
                <p className="truncate text-[11px] font-black leading-tight sm:text-xs lg:text-sm">
                  {watermarkName}
                </p>
                <p className="break-all text-[10px] font-bold leading-tight sm:text-[11px] lg:text-xs">
                  {watermarkEmail}
                </p>
                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide sm:text-[9px] lg:text-[10px]">
                  ID {watermarkStudentId} · Session {watermarkSessionId}
                </p>
              </div>
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
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-bold tabular-nums text-slate-300">
              <span>
                Position {formatDuration(currentPositionSeconds)}
              </span>

              <span>
                Watched {formatDuration(watchedSeconds)}
              </span>

              <span>
                {isRewindLocked
                  ? `Rewind locked until ${formatDuration(rewindLockedUntilSeconds)}`
                  : `Rewind ${formatDuration(displayedRewindAvailableSeconds)} / ${formatDuration(PLAYBACK_REWIND_LIMIT_SECONDS)}`}
              </span>

              <span>
                Duration {formatDuration(durationSeconds)}
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
                onClick={rewindTenSeconds}
                disabled={!isReady}
                aria-disabled={!canRewind}
                title={
                  canRewind
                    ? `Go back up to ${formatDuration(
                        Math.min(10, displayedRewindAvailableSeconds),
                      )}`
                    : isRewindLocked
                      ? `Watch or move forward to ${formatDuration(rewindLockedUntilSeconds)} to unlock rewind`
                      : "Two-minute rewind limit reached"
                }
                className={`h-10 rounded-xl bg-white/10 px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  canRewind
                    ? "hover:bg-white/20"
                    : "cursor-not-allowed opacity-40"
                }`}
                aria-label="Go back up to 10 seconds"
              >
                -10s
              </button>

              <button
                type="button"
                onClick={() => seekForwardBy(10)}
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

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              Rewind available
            </p>

            <p className="mt-2 text-lg font-black text-slate-950">
              {isRewindLocked
                ? `Locked until ${formatDuration(rewindLockedUntilSeconds)}`
                : `${formatDuration(displayedRewindAvailableSeconds)} / ${formatDuration(PLAYBACK_REWIND_LIMIT_SECONDS)}`}
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
          You can rewind within the previous two minutes of your furthest
          watched point. Watching forward or using +10s restores that rewind
          allowance. You cannot move behind the two-minute boundary.
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Use End viewing when finished. Refreshing this browser tab keeps the
          session available for resume. Closing the tab leaves it active until
          the server timeout.
        </p>
      </div>
    </section>
  );
}
