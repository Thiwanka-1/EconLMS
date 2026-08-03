import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  apiRequest,
} from "../../api/http.js";

const StatCard = ({
  label,
  value,
}) => (
  <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <p className="text-sm font-semibold text-slate-500">
      {label}
    </p>

    <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
      {value}
    </p>
  </article>
);

const EmptyState = ({
  children,
}) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
    {children}
  </div>
);

export default function StudentDashboardPage() {
  const [dashboard, setDashboard] =
    useState(null);

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const loadDashboard =
    useCallback(async () => {
      setError("");
      setIsLoading(true);

      try {
        const result =
          await apiRequest(
            "/dashboard/student"
          );

        setDashboard(result);
      } catch (requestError) {
        setError(
          requestError.message ||
            "Dashboard could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-9 w-72 animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-3xl bg-slate-200"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
          <h1 className="text-xl font-black text-red-900">
            Dashboard unavailable
          </h1>

          <p className="mt-2 text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={loadDashboard}
            className="mt-5 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const summary =
    dashboard?.summary || {};

  const enrollments =
    dashboard?.enrollments || [];

  const notifications =
    dashboard?.recentNotifications || [];

  const upcomingClasses =
    dashboard?.upcomingLiveClasses || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
          Student dashboard
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Welcome,{" "}
          {dashboard?.student?.firstName}
        </h1>

        <p className="mt-3 text-slate-600">
          Your courses, payments and latest
          learning updates.
        </p>
      </div>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Enrolled courses"
          value={
            summary.enrolledCourseCount ??
            0
          }
        />

        <StatCard
          label="Active courses"
          value={
            summary.activeCourseCount ??
            0
          }
        />

        <StatCard
          label="Pending payments"
          value={
            summary.pendingPaymentCount ??
            0
          }
        />

        <StatCard
          label="Unread notifications"
          value={
            summary.unreadNotificationCount ??
            0
          }
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950">
              My courses
            </h2>

            <span className="text-sm font-semibold text-slate-500">
              {enrollments.length} total
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {enrollments.length === 0 ? (
              <EmptyState>
                No course enrollments were
                found.
              </EmptyState>
            ) : (
              enrollments.map(
                (enrollment) => (
                  <article
                    key={enrollment._id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-950">
                          {enrollment.course
                            ?.title ||
                            "Course unavailable"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {enrollment.course
                            ?.code ||
                            "No course code"}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
                        {enrollment.status}
                      </span>
                    </div>
                  </article>
                )
              )
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Notifications
          </h2>

          <div className="mt-5 space-y-3">
            {notifications.length === 0 ? (
              <EmptyState>
                You have no recent
                notifications.
              </EmptyState>
            ) : (
              notifications.map(
                (notification) => (
                  <article
                    key={notification._id}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <p className="font-bold text-slate-900">
                      {notification.title}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>
                  </article>
                )
              )
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">
          Upcoming live classes
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {upcomingClasses.length === 0 ? (
            <div className="md:col-span-2">
              <EmptyState>
                No upcoming live classes are
                currently available.
              </EmptyState>
            </div>
          ) : (
            upcomingClasses.map(
              (liveClass) => (
                <article
                  key={liveClass._id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <p className="font-black text-slate-950">
                    {liveClass.title}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    {new Date(
                      liveClass.startTime
                    ).toLocaleString()}
                  </p>
                </article>
              )
            )
          )}
        </div>
      </section>
    </div>
  );
}
