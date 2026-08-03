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

const formatRevenue = (rows) => {
  if (!rows?.length) {
    return "LKR 0";
  }

  return rows
    .map((row) =>
      new Intl.NumberFormat(
        "en-LK",
        {
          style: "currency",
          currency:
            row.currency || "LKR",
          maximumFractionDigits: 2,
        }
      ).format(row.amount || 0)
    )
    .join(" · ");
};

export default function AdminDashboardPage() {
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
            "/dashboard/admin"
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

  const students =
    dashboard?.students || {};

  const courses =
    dashboard?.courses || {};

  const payments =
    dashboard?.payments || {};

  const pendingPayments =
    dashboard?.pendingPayments || [];

  const recentAuditLogs =
    dashboard?.recentAuditLogs || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
          Administration
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Platform overview
        </h1>

        <p className="mt-3 text-slate-600">
          Current students, courses,
          payments and system activity.
        </p>
      </div>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Students"
          value={students.total ?? 0}
        />

        <StatCard
          label="Active students"
          value={students.active ?? 0}
        />

        <StatCard
          label="Published courses"
          value={courses.published ?? 0}
        />

        <StatCard
          label="Pending payments"
          value={payments.pending ?? 0}
        />
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
          <p className="text-sm font-semibold text-slate-400">
            All-time approved revenue
          </p>

          <p className="mt-3 text-3xl font-black">
            {formatRevenue(
              dashboard?.revenue?.allTime
            )}
          </p>
        </article>

        <article className="rounded-3xl bg-brand-600 p-7 text-white shadow-xl shadow-brand-600/20">
          <p className="text-sm font-semibold text-brand-100">
            Current month revenue
          </p>

          <p className="mt-3 text-3xl font-black">
            {formatRevenue(
              dashboard?.revenue
                ?.currentMonth
            )}
          </p>
        </article>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950">
              Pending payments
            </h2>

            <span className="text-sm font-semibold text-slate-500">
              Latest 10
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {pendingPayments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No pending payments.
              </div>
            ) : (
              pendingPayments.map(
                (payment) => (
                  <article
                    key={payment._id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <p className="font-bold text-slate-900">
                      {payment.student
                        ?.firstName}{" "}
                      {payment.student
                        ?.lastName}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {payment.course
                        ?.title ||
                        "Course unavailable"}
                    </p>
                  </article>
                )
              )
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950">
              Recent audit activity
            </h2>

            <span className="text-sm font-semibold text-slate-500">
              Latest 10
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {recentAuditLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No audit activity.
              </div>
            ) : (
              recentAuditLogs.map(
                (auditLog) => (
                  <article
                    key={auditLog._id}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <p className="font-bold text-slate-900">
                      {auditLog.action}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {auditLog.description}
                    </p>
                  </article>
                )
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
