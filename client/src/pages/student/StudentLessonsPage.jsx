import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router";

import {
  getStudentLessons,
} from "../../api/lessonApi.js";

import {
  startLessonPlayback,
} from "../../api/playbackApi.js";

import EmptyState from "../../components/common/EmptyState.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";
import YouTubePlaybackPlayer from "../../components/learning/YouTubePlaybackPlayer.jsx";

import {
  clearStoredPlaybackSessionId,
  getStoredPlaybackSessionId,
  setStoredPlaybackSessionId,
} from "../../utils/playbackSessionStorage.js";

import {
  loadYouTubeIframeApi,
} from "../../utils/youtubeApi.js";

export default function StudentLessonsPage() {
  const {
    courseId,
  } = useParams();

  const [course, setCourse] =
    useState(null);

  const [
    billingPeriod,
    setBillingPeriod,
  ] = useState(null);

  const [access, setAccess] =
    useState(null);

  const [lessons, setLessons] =
    useState([]);

  const [
    activePlayback,
    setActivePlayback,
  ] = useState(null);

  const [
    startingLessonId,
    setStartingLessonId,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const playerSectionRef =
    useRef(null);

  const loadLessons =
    useCallback(
      async ({
        showLoading = true,
      } = {}) => {
        setError("");

        if (showLoading) {
          setIsLoading(true);
        }

        try {
          const result =
            await getStudentLessons(
              courseId
            );

          setCourse(
            result.course
          );

          setBillingPeriod(
            result.billingPeriod ||
              null
          );

          setAccess(
            result.access || null
          );

          setLessons(
            result.lessons || []
          );
        } catch (requestError) {
          setError(
            requestError.message ||
              "Lessons could not be loaded."
          );
        } finally {
          if (showLoading) {
            setIsLoading(false);
          }
        }
      },
      [courseId]
    );

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  const handleStartPlayback =
    async (lesson) => {
      if (
        activePlayback &&
        activePlayback.lesson._id !==
          lesson._id
      ) {
        setError(
          "End the current viewing session before starting another lesson."
        );

        playerSectionRef.current
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

        return;
      }

      setError("");
      setSuccess("");

      setStartingLessonId(
        lesson._id
      );

      const storedSessionId =
        getStoredPlaybackSessionId(
          lesson._id
        );

      try {
        await loadYouTubeIframeApi();

        const result =
          await startLessonPlayback({
            lessonId:
              lesson._id,

            sessionId:
              storedSessionId,
          });

        setStoredPlaybackSessionId(
          lesson._id,
          result.sessionId
        );

        setActivePlayback(
          result
        );

        window.setTimeout(() => {
          playerSectionRef.current
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        }, 50);
      } catch (requestError) {
        if (
          requestError.status ===
            409 &&
          /active playback session/i.test(
            requestError.message
          )
        ) {
          clearStoredPlaybackSessionId(
            lesson._id
          );
        }

        setError(
          requestError.message ||
            "Lesson playback could not be started."
        );
      } finally {
        setStartingLessonId("");
      }
    };

  const handlePlaybackFinished =
    useCallback(
      async (result) => {
        setActivePlayback(
          (current) => {
            if (
              current?.lesson?._id
            ) {
              clearStoredPlaybackSessionId(
                current.lesson._id
              );
            }

            return null;
          }
        );

        setSuccess(
          result?.message ||
            "The playback session ended."
        );

        await loadLessons({
          showLoading: false,
        });
      },
      [loadLessons]
    );

  const handleSessionInvalid =
    useCallback(
      async (requestError) => {
        setActivePlayback(
          (current) => {
            if (
              current?.lesson?._id
            ) {
              clearStoredPlaybackSessionId(
                current.lesson._id
              );
            }

            return null;
          }
        );

        setError(
          requestError.message ||
            "The playback session expired."
        );

        await loadLessons({
          showLoading: false,
        });
      },
      [loadLessons]
    );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-8 h-96 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to={`/student/courses/${encodeURIComponent(
          courseId
        )}`}
        className="text-sm font-black text-brand-700 transition hover:text-brand-900"
      >
        ← Return to course
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
            {course?.code ||
              "Course lessons"}
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {course?.title ||
              "Lessons"}
          </h1>

          {billingPeriod && (
            <p className="mt-3 text-slate-600">
              Lessons for{" "}
              <strong>
                {billingPeriod.label}
              </strong>
            </p>
          )}
        </div>

        <StatusBadge
          status={
            access?.hasAccess
              ? "active"
              : "closed"
          }
          label={
            access?.hasAccess
              ? "Course access active"
              : "Course access required"
          }
        />
      </div>

      <div className="mt-7 space-y-4">
        {error && (
          <StatusMessage variant="error">
            {error}
          </StatusMessage>
        )}

        {success && (
          <StatusMessage variant="success">
            {success}
          </StatusMessage>
        )}

        <StatusMessage
          variant={
            access?.hasAccess
              ? "success"
              : "warning"
          }
        >
          {access?.reason ||
            "Course access information is unavailable."}
        </StatusMessage>
      </div>

      {activePlayback && (
        <div
          ref={playerSectionRef}
          className="mt-8 scroll-mt-6"
        >
          <YouTubePlaybackPlayer
            playbackSession={
              activePlayback
            }
            onFinished={
              handlePlaybackFinished
            }
            onSessionInvalid={
              handleSessionInvalid
            }
          />
        </div>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-black text-slate-950">
            Published lessons
          </h2>

          <span className="text-sm font-semibold text-slate-500">
            {lessons.length}{" "}
            {lessons.length === 1
              ? "lesson"
              : "lessons"}
          </span>
        </div>

        {lessons.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="No lessons available"
              description="There are no published lessons for this course period."
            />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {lessons.map(
              (
                lesson,
                index
              ) => {
                const playback =
                  lesson.playback ||
                  {};

                const isCurrentLesson =
                  activePlayback
                    ?.lesson?._id ===
                  lesson._id;

                const isStarting =
                  startingLessonId ===
                  lesson._id;

                const storedSessionId =
                  getStoredPlaybackSessionId(
                    lesson._id
                  );

                const canResumeHere =
                  Boolean(
                    playback.hasActiveSession &&
                      storedSessionId
                  );

                const canStartHere =
                  Boolean(
                    access?.hasAccess &&
                      (
                        playback.hasActiveSession
                          ? canResumeHere
                          : playback.canStart
                      )
                  );

                const disabledByAnotherSession =
                  Boolean(
                    activePlayback &&
                      !isCurrentLesson
                  );

                let buttonLabel =
                  "Access required";

                if (isStarting) {
                  buttonLabel =
                    "Starting…";
                } else if (
                  isCurrentLesson
                ) {
                  buttonLabel =
                    "Playing above";
                } else if (
                  !access?.hasAccess
                ) {
                  buttonLabel =
                    "Access required";
                } else if (
                  playback.hasActiveSession &&
                  canResumeHere
                ) {
                  buttonLabel =
                    "Resume lesson";
                } else if (
                  playback.hasActiveSession
                ) {
                  buttonLabel =
                    "Active in another tab";
                } else if (
                  playback.canStart
                ) {
                  buttonLabel =
                    "Start lesson";
                } else if (
                  Number(
                    playback.viewsRemaining
                  ) <= 0
                ) {
                  buttonLabel =
                    "View limit reached";
                }

                return (
                  <article
                    key={lesson._id}
                    className={[
                      "rounded-3xl border bg-white p-6 shadow-sm transition sm:p-7",
                      isCurrentLesson
                        ? "border-brand-300 ring-4 ring-brand-100"
                        : "border-slate-200",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-black text-brand-700">
                          {String(
                            lesson.lessonOrder ??
                              index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap gap-2">
                            {playback.hasActiveSession && (
                              <StatusBadge
                                status="pending"
                                label="Session active"
                              />
                            )}

                            {!access?.hasAccess && (
                              <StatusBadge
                                status="closed"
                                label="Locked"
                              />
                            )}
                          </div>

                          <h3 className="mt-3 text-xl font-black text-slate-950">
                            {lesson.title}
                          </h3>

                          {lesson.description && (
                            <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-600">
                              {
                                lesson.description
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 lg:w-72">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-slate-50 p-3 text-center">
                            <p className="text-xs font-bold text-slate-500">
                              Used
                            </p>

                            <p className="mt-1 font-black text-slate-950">
                              {playback.viewsUsed ??
                                0}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 text-center">
                            <p className="text-xs font-bold text-slate-500">
                              Limit
                            </p>

                            <p className="mt-1 font-black text-slate-950">
                              {playback.totalAllowedViews ??
                                lesson.maxViews ??
                                0}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 text-center">
                            <p className="text-xs font-bold text-slate-500">
                              New
                            </p>

                            <p className="mt-1 font-black text-slate-950">
                              {playback.newViewsRemaining ??
                                0}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (
                              isCurrentLesson
                            ) {
                              playerSectionRef.current
                                ?.scrollIntoView(
                                  {
                                    behavior:
                                      "smooth",

                                    block:
                                      "start",
                                  }
                                );

                              return;
                            }

                            void handleStartPlayback(
                              lesson
                            );
                          }}
                          disabled={
                            isStarting ||
                            disabledByAnotherSession ||
                            !canStartHere
                          }
                          className="mt-3 w-full rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          {buttonLabel}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}