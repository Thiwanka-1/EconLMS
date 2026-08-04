import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  getAdminCourses,
} from "../../api/courseAdminApi.js";

import {
  getAdminEnrollments,
  updateAdminEnrollmentStatus,
} from "../../api/enrollmentAdminApi.js";

import AdminPageHeader from "../../components/common/AdminPageHeader.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";

import {
  formatDateTime,
} from "../../utils/formatters.js";

const statusOptions = [
  "active",
  "suspended",
  "cancelled",
];

export default function AdminEnrollmentsPage() {
  const [courses, setCourses] =
    useState([]);

  const [
    enrollments,
    setEnrollments,
  ] = useState([]);

  const [pagination, setPagination] =
    useState({
      currentPage: 1,
      totalPages: 1,
      totalEnrollments: 0,
    });

  const [filters, setFilters] =
    useState({
      courseId: "",
      status: "",
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(filters);

  const [
    statusDrafts,
    setStatusDrafts,
  ] = useState({});

  const [
    reasonDrafts,
    setReasonDrafts,
  ] = useState({});

  const [busyId, setBusyId] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const loadCourses =
    useCallback(async () => {
      try {
        const result =
          await getAdminCourses({
            page: 1,
            limit: 100,
            isArchived: "",
          });

        setCourses(
          result.courses || []
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "Course filters could not be loaded."
        );
      }
    }, []);

  const loadEnrollments =
    useCallback(
      async (page = 1) => {
        setError("");
        setIsLoading(true);

        try {
          const result =
            await getAdminEnrollments({
              ...appliedFilters,
              page,
              limit: 20,
            });

          const loaded =
            result.enrollments ||
            [];

          setEnrollments(loaded);

          setPagination(
            result.pagination || {
              currentPage: page,
              totalPages: 1,
              totalEnrollments: 0,
            }
          );

          setStatusDrafts(
            Object.fromEntries(
              loaded.map(
                (enrollment) => [
                  enrollment._id,
                  enrollment.status,
                ]
              )
            )
          );

          setReasonDrafts(
            Object.fromEntries(
              loaded.map(
                (enrollment) => [
                  enrollment._id,
                  enrollment.statusReason ||
                    "",
                ]
              )
            )
          );
        } catch (requestError) {
          setError(
            requestError.message ||
              "Enrolments could not be loaded."
          );
        } finally {
          setIsLoading(false);
        }
      },
      [appliedFilters]
    );

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadEnrollments(1);
  }, [loadEnrollments]);

  const saveStatus = async (
    enrollment
  ) => {
    const status =
      statusDrafts[
        enrollment._id
      ] || enrollment.status;

    const reason =
      (
        reasonDrafts[
          enrollment._id
        ] || ""
      ).trim();

    if (
      [
        "suspended",
        "cancelled",
      ].includes(status) &&
      !reason
    ) {
      setError(
        "Enter a reason before suspending or cancelling an enrolment."
      );

      return;
    }

    setBusyId(enrollment._id);
    setError("");
    setSuccess("");

    try {
      const result =
        await updateAdminEnrollmentStatus(
          {
            enrollmentId:
              enrollment._id,

            status,
            reason:
              status === "active"
                ? ""
                : reason,
          }
        );

      setSuccess(
        result.message ||
          "Enrolment status updated."
      );

      await loadEnrollments(
        pagination.currentPage
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Enrolment status could not be updated."
      );
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Access administration"
        title="Course enrolments"
        description="Review payment-derived course access and suspend, cancel or reactivate enrolments."
      />

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

      <StatusMessage
        variant="warning"
        className="mt-6"
      >
        Activating an enrolment does
        not create payment access. The
        backend permits activation only
        when a payment has already
        granted at least one billing
        period or one-time access.
      </StatusMessage>

      <form
        onSubmit={(event) => {
          event.preventDefault();

          setAppliedFilters({
            ...filters,
          });
        }}
        className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_200px_auto]"
      >
        <select
          value={filters.courseId}
          onChange={(event) =>
            setFilters(
              (current) => ({
                ...current,

                courseId:
                  event.target.value,
              })
            )
          }
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
        >
          <option value="">
            All courses
          </option>

          {courses.map(
            (course) => (
              <option
                key={course._id}
                value={course._id}
              >
                {course.code} —{" "}
                {course.title}
              </option>
            )
          )}
        </select>

        <select
          value={filters.status}
          onChange={(event) =>
            setFilters(
              (current) => ({
                ...current,

                status:
                  event.target.value,
              })
            )
          }
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
        >
          <option value="">
            All statuses
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="active">
            Active
          </option>

          <option value="suspended">
            Suspended
          </option>

          <option value="cancelled">
            Cancelled
          </option>
        </select>

        <button
          type="submit"
          className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white"
        >
          Apply filters
        </button>
      </form>

      <p className="mt-5 text-sm font-semibold text-slate-500">
        {pagination.totalEnrollments ||
          0}{" "}
        total enrolments
      </p>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {Array.from({
            length: 5,
          }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-3xl bg-slate-200"
            />
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No enrolments"
            description="No course enrolments match the selected filters."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {enrollments.map(
            (enrollment) => {
              const student =
                enrollment.student;

              const course =
                enrollment.course;

              const approvedPeriods =
                enrollment.approvedBillingPeriods ||
                [];

              const hasOneTimeAccess =
                Boolean(
                  enrollment
                    .oneTimeAccessGrantedAt
                );

              const hasAccess =
                hasOneTimeAccess ||
                approvedPeriods.length >
                  0;

              const draftStatus =
                statusDrafts[
                  enrollment._id
                ] ||
                enrollment.status;

              return (
                <article
                  key={enrollment._id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
                >
                  <div className="flex flex-col gap-7 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          status={
                            enrollment.status
                          }
                        />

                        <StatusBadge
                          status={
                            hasAccess
                              ? "active"
                              : "closed"
                          }
                          label={
                            hasAccess
                              ? "Payment access granted"
                              : "No approved access"
                          }
                        />

                        <StatusBadge
                          status="inactive"
                          label={
                            course
                              ?.paymentPlan ===
                            "monthly"
                              ? "Monthly"
                              : "One-time"
                          }
                        />
                      </div>

                      <h2 className="mt-4 text-xl font-black text-slate-950">
                        {student
                          ?.firstName ||
                          "Student"}{" "}
                        {student
                          ?.lastName ||
                          ""}
                      </h2>

                      <p className="mt-1 break-all text-sm text-slate-500">
                        {student?.email ||
                          "Email unavailable"}
                      </p>

                      <p className="mt-4 text-sm font-black text-brand-700">
                        {course?.code ||
                          "Course"}{" "}
                        —{" "}
                        {course?.title ||
                          "Course unavailable"}
                      </p>

                      <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <dt className="font-bold text-slate-500">
                            NIC
                          </dt>

                          <dd className="mt-1 font-black text-slate-950">
                            {student
                              ?.nicNumber ||
                              "—"}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-bold text-slate-500">
                            Phone
                          </dt>

                          <dd className="mt-1 font-black text-slate-950">
                            {student
                              ?.mobileNumber ||
                              "—"}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-bold text-slate-500">
                            Created
                          </dt>

                          <dd className="mt-1 font-black text-slate-950">
                            {formatDateTime(
                              enrollment.createdAt
                            )}
                          </dd>
                        </div>
                      </dl>

                      {course
                        ?.paymentPlan ===
                      "monthly" ? (
                        <div className="mt-5">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Approved billing
                            periods
                          </p>

                          {approvedPeriods.length ===
                          0 ? (
                            <p className="mt-2 text-sm text-slate-600">
                              No billing
                              periods approved.
                            </p>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {approvedPeriods.map(
                                (period) => (
                                  <StatusBadge
                                    key={
                                      period._id
                                    }
                                    status="active"
                                    label={
                                      period.label
                                    }
                                  />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-5 text-sm font-semibold text-slate-600">
                          One-time access:{" "}
                          {hasOneTimeAccess
                            ? `granted ${formatDateTime(
                                enrollment.oneTimeAccessGrantedAt
                              )}`
                            : "not granted"}
                        </p>
                      )}

                      {enrollment.statusReason && (
                        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                          <strong>
                            Current reason:
                          </strong>{" "}
                          {
                            enrollment.statusReason
                          }
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-3">
                        {student?._id && (
                          <Link
                            to={`/admin/students/${student._id}`}
                            className="text-sm font-black text-brand-700 hover:text-brand-900"
                          >
                            Review student
                          </Link>
                        )}

                        {course?._id && (
                          <Link
                            to={`/admin/courses/${course._id}`}
                            className="text-sm font-black text-brand-700 hover:text-brand-900"
                          >
                            Manage course
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="w-full shrink-0 rounded-2xl bg-slate-50 p-5 xl:w-80">
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
                        New status
                      </label>

                      <select
                        value={draftStatus}
                        onChange={(event) =>
                          setStatusDrafts(
                            (current) => ({
                              ...current,

                              [enrollment._id]:
                                event.target
                                  .value,
                            })
                          )
                        }
                        disabled={
                          busyId ===
                          enrollment._id
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                      >
                        {statusOptions.map(
                          (status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {status
                                .charAt(0)
                                .toUpperCase() +
                                status.slice(
                                  1
                                )}
                            </option>
                          )
                        )}
                      </select>

                      <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-500">
                        Administrative reason
                      </label>

                      <textarea
                        rows={4}
                        value={
                          reasonDrafts[
                            enrollment._id
                          ] || ""
                        }
                        onChange={(event) =>
                          setReasonDrafts(
                            (current) => ({
                              ...current,

                              [enrollment._id]:
                                event.target
                                  .value,
                            })
                          )
                        }
                        disabled={
                          busyId ===
                          enrollment._id
                        }
                        placeholder="Required for suspension or cancellation."
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                      />

                      <button
                        type="button"
                        disabled={
                          busyId ===
                            enrollment._id ||
                          draftStatus ===
                            enrollment.status
                        }
                        onClick={() =>
                          saveStatus(
                            enrollment
                          )
                        }
                        className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {busyId ===
                        enrollment._id
                          ? "Saving status…"
                          : "Save enrolment status"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}

      <Pagination
        currentPage={
          pagination.currentPage
        }
        totalPages={
          pagination.totalPages
        }
        disabled={isLoading}
        onPageChange={
          loadEnrollments
        }
      />
    </div>
  );
}