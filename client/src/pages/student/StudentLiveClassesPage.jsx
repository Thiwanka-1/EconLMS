import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import {
  getPublishedCourse,
} from "../../api/courseApi.js";

import {
  getMyEnrollments,
} from "../../api/enrollmentApi.js";

import {
  getStudentLiveClasses,
  joinStudentLiveClass,
} from "../../api/liveClassApi.js";

import EmptyState from "../../components/common/EmptyState.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";

import {
  formatDateTime,
} from "../../utils/formatters.js";

const getJoinState = (
  liveClass,
  currentTime
) => {
  const opensAt =
    new Date(
      liveClass.joinWindow
        ?.opensAt
    ).getTime();

  const closesAt =
    new Date(
      liveClass.joinWindow
        ?.closesAt
    ).getTime();

  if (
    !Number.isFinite(opensAt) ||
    !Number.isFinite(closesAt)
  ) {
    return {
      status: "closed",
      label:
        "Join window unavailable",
      canJoin: false,
    };
  }

  if (
    currentTime < opensAt
  ) {
    return {
      status: "pending",
      label: `Opens ${formatDateTime(
        opensAt
      )}`,
      canJoin: false,
    };
  }

  if (
    currentTime > closesAt
  ) {
    return {
      status: "closed",
      label: "Join window ended",
      canJoin: false,
    };
  }

  return {
    status: "open",
    label: "Join window open",
    canJoin:
      Boolean(
        liveClass.access
          ?.hasAccess
      ),
  };
};

const prepareJoinWindow = (
  popup
) => {
  if (!popup) {
    return;
  }

  try {
    popup.opener = null;

    popup.document.title =
      "Opening Accounting With Udara Live Class";

    popup.document.body.style.margin =
      "0";

    popup.document.body.style.fontFamily =
      "system-ui, sans-serif";

    popup.document.body.innerHTML = `
      <main style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#f8fafc;
        color:#0f172a;
        padding:24px;
        text-align:center;
      ">
        <div>
          <h1 style="font-size:22px;margin:0;">
            Preparing your live class
          </h1>

          <p style="
            margin:12px 0 0;
            color:#64748b;
          ">
            Accounting With Udara is requesting your
            secure Zoom link.
          </p>
        </div>
      </main>
    `;
  } catch {
    // The window can still be redirected.
  }
};

export default function StudentLiveClassesPage() {
  const [searchParams] =
    useSearchParams();

  const requestedCourseId =
    searchParams.get(
      "courseId"
    ) || "";

  const [
    courseContext,
    setCourseContext,
  ] = useState(null);

  const [
    liveClasses,
    setLiveClasses,
  ] = useState([]);

  const [
    joiningClassId,
    setJoiningClassId,
  ] = useState("");

  const [
    currentTime,
    setCurrentTime,
  ] = useState(Date.now());

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const loadLiveClasses =
    useCallback(async () => {
      setError("");
      setIsLoading(true);

      try {
        if (requestedCourseId) {
          const [
            courseResult,
            liveClassResult,
          ] = await Promise.all([
            getPublishedCourse(
              requestedCourseId
            ),

            getStudentLiveClasses(
              requestedCourseId
            ),
          ]);

          const course =
            courseResult.course;

          setCourseContext(
            course
          );

          setLiveClasses(
            (
              liveClassResult
                .liveClasses || []
            ).map(
              (liveClass) => ({
                ...liveClass,

                courseSummary: {
                  _id: course._id,
                  title:
                    course.title,
                  code: course.code,
                },
              })
            )
          );

          return;
        }

        const enrollmentResult =
          await getMyEnrollments();

        const courseMap =
          new Map();

        for (
          const enrollment of
          enrollmentResult.enrollments ||
          []
        ) {
          const course =
            enrollment.course;

          if (
            course?._id &&
            course.isPublished &&
            !course.isArchived
          ) {
            courseMap.set(
              course._id,
              course
            );
          }
        }

        const courses =
          Array.from(
            courseMap.values()
          );

        const responses =
          await Promise.all(
            courses.map(
              async (course) => {
                const result =
                  await getStudentLiveClasses(
                    course._id
                  );

                return (
                  result.liveClasses ||
                  []
                ).map(
                  (liveClass) => ({
                    ...liveClass,

                    courseSummary: {
                      _id:
                        course._id,
                      title:
                        course.title,
                      code:
                        course.code,
                    },
                  })
                );
              }
            )
          );

        const uniqueClasses =
          new Map();

        for (
          const liveClass of
          responses.flat()
        ) {
          uniqueClasses.set(
            liveClass._id,
            liveClass
          );
        }

        setCourseContext(null);

        setLiveClasses(
          Array.from(
            uniqueClasses.values()
          ).sort(
            (
              first,
              second
            ) =>
              new Date(
                first.startTime
              ).getTime() -
              new Date(
                second.startTime
              ).getTime()
          )
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "Live classes could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }, [requestedCourseId]);

  useEffect(() => {
    loadLiveClasses();
  }, [loadLiveClasses]);

  useEffect(() => {
    const clock =
      window.setInterval(
        () => {
          setCurrentTime(
            Date.now()
          );
        },
        15_000
      );

    return () => {
      window.clearInterval(
        clock
      );
    };
  }, []);

  const classesWithJoinState =
    useMemo(() => {
      return liveClasses.map(
        (liveClass) => ({
          ...liveClass,

          clientJoinState:
            getJoinState(
              liveClass,
              currentTime
            ),
        })
      );
    }, [
      liveClasses,
      currentTime,
    ]);

  const handleJoin = async (
    liveClass
  ) => {
    setError("");
    setSuccess("");
    setJoiningClassId(
      liveClass._id
    );

    const popup =
      window.open(
        "about:blank",
        "_blank"
      );

    prepareJoinWindow(popup);

    try {
      const result =
        await joinStudentLiveClass(
          liveClass._id
        );

      if (!result.joinUrl) {
        throw new Error(
          "The Zoom join link was not returned."
        );
      }

      setSuccess(
        result.message ||
          "Your secure Zoom link was generated."
      );

      if (
        popup &&
        !popup.closed
      ) {
        popup.location.replace(
          result.joinUrl
        );
      } else {
        window.location.assign(
          result.joinUrl
        );
      }
    } catch (requestError) {
      try {
        popup?.close();
      } catch {
        // The popup may already be closed.
      }

      setError(
        requestError.message ||
          "The live class could not be opened."
      );
    } finally {
      setJoiningClassId("");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {courseContext && (
        <Link
          to={`/student/courses/${encodeURIComponent(
            courseContext.slug ||
              courseContext._id
          )}`}
          className="text-sm font-black text-brand-700 transition hover:text-brand-900"
        >
          ← Return to course
        </Link>
      )}

      <div
        className={
          courseContext
            ? "mt-6"
            : ""
        }
      >
        <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
          Live learning
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {courseContext
            ? `${courseContext.title} live classes`
            : "Upcoming live classes"}
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Secure Zoom links become
          available only during each
          class joining window.
        </p>
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
      </div>

      <div className="mt-7 flex justify-end">
        <button
          type="button"
          onClick={loadLiveClasses}
          disabled={isLoading}
          className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Refresh classes
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {Array.from({
            length: 3,
          }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-3xl bg-slate-200"
            />
          ))}
        </div>
      ) : classesWithJoinState.length ===
        0 ? (
        <div className="mt-6">
          <EmptyState
            title="No live classes scheduled"
            description="There are no published upcoming live classes available for the selected courses."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {classesWithJoinState.map(
            (liveClass) => {
              const joinState =
                liveClass.clientJoinState;

              const canJoin =
                joinState.canJoin &&
                liveClass.access
                  ?.hasAccess;

              const isJoining =
                joiningClassId ===
                liveClass._id;

              return (
                <article
                  key={liveClass._id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          status={
                            joinState.status
                          }
                          label={
                            joinState.label
                          }
                        />

                        <StatusBadge
                          status={
                            liveClass
                              .access
                              ?.hasAccess
                              ? "active"
                              : "closed"
                          }
                          label={
                            liveClass
                              .access
                              ?.hasAccess
                              ? "Access approved"
                              : "Access required"
                          }
                        />

                        <StatusBadge
                          status={
                            liveClass.zoomRegistrationStatus
                          }
                          label={`Zoom: ${String(
                            liveClass.zoomRegistrationStatus ||
                              "not registered"
                          ).replace(
                            /_/g,
                            " "
                          )}`}
                        />
                      </div>

                      <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-brand-700">
                        {liveClass
                          .courseSummary
                          ?.code ||
                          "Live class"}
                      </p>

                      <h2 className="mt-2 text-2xl font-black text-slate-950">
                        {liveClass.title}
                      </h2>

                      {liveClass.description && (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {
                            liveClass.description
                          }
                        </p>
                      )}

                      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="font-bold text-slate-500">
                            Starts
                          </dt>

                          <dd className="mt-1 font-black text-slate-950">
                            {formatDateTime(
                              liveClass.startTime
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-bold text-slate-500">
                            Duration
                          </dt>

                          <dd className="mt-1 font-black text-slate-950">
                            {liveClass.durationMinutes ||
                              0}{" "}
                            minutes
                          </dd>
                        </div>

                        <div>
                          <dt className="font-bold text-slate-500">
                            Billing period
                          </dt>

                          <dd className="mt-1 font-black text-slate-950">
                            {liveClass.billingPeriod
                              ?.label ||
                              "One-time course"}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-bold text-slate-500">
                            Course
                          </dt>

                          <dd className="mt-1 font-black text-slate-950">
                            {liveClass
                              .courseSummary
                              ?.title ||
                              "Course"}
                          </dd>
                        </div>
                      </dl>

                      {!liveClass.access
                        ?.hasAccess && (
                        <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                          {liveClass.access
                            ?.reason ||
                            "Course payment approval is required."}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 lg:w-60">
                      <button
                        type="button"
                        onClick={() => {
                          void handleJoin(
                            liveClass
                          );
                        }}
                        disabled={
                          !canJoin ||
                          isJoining
                        }
                        className="w-full rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                      >
                        {isJoining
                          ? "Preparing Zoom…"
                          : canJoin
                            ? "Join live class"
                            : joinState.label}
                      </button>

                      <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                        Your unique Zoom
                        URL is requested
                        only when you
                        press Join.
                      </p>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
