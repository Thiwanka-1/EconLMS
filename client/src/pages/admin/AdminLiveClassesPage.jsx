import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getAdminBillingPeriods,
} from "../../api/billingPeriodAdminApi.js";

import {
  getAdminCourses,
} from "../../api/courseAdminApi.js";

import {
  createAdminLiveClass,
  getAdminLiveClasses,
  refreshAdminLiveClass,
  syncAdminLiveClass,
  updateAdminLiveClassStatus,
} from "../../api/liveClassAdminApi.js";

import AdminPageHeader from "../../components/common/AdminPageHeader.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";
import FormField from "../../components/forms/FormField.jsx";

import {
  formatDateTime,
} from "../../utils/formatters.js";

const emptyForm = {
  courseId: "",
  billingPeriodId: "",
  zoomMeetingId: "",
  title: "",
  description: "",
  joinWindowMinutesBefore: "",
  joinWindowMinutesAfter: "",
  isPublished: true,
};

const getSyncMessage = (
  result
) => {
  const sync =
    result.registrationSync;

  if (!sync) {
    return (
      result.message ||
      "Operation completed."
    );
  }

  const successCount =
    Number(
      sync.successCount || 0
    );

  const failureCount =
    Number(
      sync.failureCount || 0
    );

  return `${result.message || "Zoom synchronization completed."} ${successCount} succeeded, ${failureCount} failed.`;
};

export default function AdminLiveClassesPage() {
  const [courses, setCourses] =
    useState([]);

  const [
    billingPeriods,
    setBillingPeriods,
  ] = useState([]);

  const [
    liveClasses,
    setLiveClasses,
  ] = useState([]);

  const [filters, setFilters] =
    useState({
      courseId: "",
      status: "",
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState({
    courseId: "",
    status: "",
  });

  const [form, setForm] =
    useState(emptyForm);

  const [
    statusDrafts,
    setStatusDrafts,
  ] = useState({});

  const [busyKey, setBusyKey] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isLoadingPeriods,
    setIsLoadingPeriods,
  ] = useState(false);

  const selectedCourse =
    useMemo(() => {
      return courses.find(
        (course) =>
          course._id ===
          form.courseId
      );
    }, [
      courses,
      form.courseId,
    ]);

  const loadCourses =
    useCallback(async () => {
      const result =
        await getAdminCourses({
          page: 1,
          limit: 100,
          isArchived: "false",
        });

      setCourses(
        result.courses || []
      );
    }, []);

  const loadLiveClasses =
    useCallback(async () => {
      setError("");
      setIsLoading(true);

      try {
        const result =
          await getAdminLiveClasses(
            appliedFilters
          );

        const loadedClasses =
          result.liveClasses || [];

        setLiveClasses(
          loadedClasses
        );

        setStatusDrafts(
          Object.fromEntries(
            loadedClasses.map(
              (liveClass) => [
                liveClass._id,
                liveClass.status,
              ]
            )
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
    }, [appliedFilters]);

  useEffect(() => {
    const loadInitialData =
      async () => {
        try {
          await loadCourses();
        } catch (requestError) {
          setError(
            requestError.message ||
              "Courses could not be loaded."
          );
        }
      };

    loadInitialData();
  }, [loadCourses]);

  useEffect(() => {
    loadLiveClasses();
  }, [loadLiveClasses]);

  useEffect(() => {
    let active = true;

    const loadPeriods =
      async () => {
        if (
          !selectedCourse ||
          selectedCourse.paymentPlan !==
            "monthly"
        ) {
          setBillingPeriods([]);

          setForm((current) => ({
            ...current,
            billingPeriodId: "",
          }));

          return;
        }

        setIsLoadingPeriods(true);

        try {
          const result =
            await getAdminBillingPeriods(
              selectedCourse._id
            );

          if (!active) {
            return;
          }

          const periods =
            (
              result.billingPeriods ||
              []
            ).filter(
              (period) =>
                !period.isArchived
            );

          setBillingPeriods(
            periods
          );

          setForm((current) => {
            const selectedPeriodExists =
              periods.some(
                (period) =>
                  period._id ===
                  current.billingPeriodId
              );

            return {
              ...current,

              billingPeriodId:
                selectedPeriodExists
                  ? current.billingPeriodId
                  : periods[0]?._id ||
                    "",
            };
          });
        } catch (requestError) {
          if (active) {
            setBillingPeriods([]);

            setError(
              requestError.message ||
                "Billing periods could not be loaded."
            );
          }
        } finally {
          if (active) {
            setIsLoadingPeriods(
              false
            );
          }
        }
      };

    loadPeriods();

    return () => {
      active = false;
    };
  }, [selectedCourse]);

  const handleFormChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((current) => ({
      ...current,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const handleFilterChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const runAction = async ({
    key,
    action,
    successFormatter,
  }) => {
    setBusyKey(key);
    setError("");
    setSuccess("");

    try {
      const result =
        await action();

      setSuccess(
        successFormatter
          ? successFormatter(result)
          : result.message ||
              "Live class updated."
      );

      await loadLiveClasses();
    } catch (requestError) {
      setError(
        requestError.message ||
          "The live-class operation failed."
      );
    } finally {
      setBusyKey("");
    }
  };

  const handleCreate = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedCourse) {
      setError(
        "Select a course."
      );

      return;
    }

    if (
      selectedCourse.paymentPlan ===
        "monthly" &&
      !form.billingPeriodId
    ) {
      setError(
        "Select a billing period for the monthly course."
      );

      return;
    }

    setBusyKey("create");
    setError("");
    setSuccess("");

    try {
      const requestBody = {
        courseId:
          selectedCourse._id,

        zoomMeetingId:
          form.zoomMeetingId.trim(),

        title:
          form.title.trim(),

        description:
          form.description.trim(),

        isPublished:
          form.isPublished,
      };

      if (
        selectedCourse.paymentPlan ===
        "monthly"
      ) {
        requestBody.billingPeriodId =
          form.billingPeriodId;
      }

      if (
        form.joinWindowMinutesBefore !==
        ""
      ) {
        requestBody.joinWindowMinutesBefore =
          Number(
            form.joinWindowMinutesBefore
          );
      }

      if (
        form.joinWindowMinutesAfter !==
        ""
      ) {
        requestBody.joinWindowMinutesAfter =
          Number(
            form.joinWindowMinutesAfter
          );
      }

      const result =
        await createAdminLiveClass(
          requestBody
        );

      setSuccess(
        getSyncMessage(result)
      );

      setForm(emptyForm);
      setBillingPeriods([]);

      await loadLiveClasses();
    } catch (requestError) {
      setError(
        requestError.message ||
          "The Zoom meeting could not be connected."
      );
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Live-class administration"
        title="Zoom live classes"
        description="Connect scheduled Zoom meetings, select the exact course billing period and synchronize eligible paid students."
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

      <section className="mt-8 min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-slate-950">
          Connect a Zoom meeting
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Create the meeting in Zoom
          first. It must be a scheduled,
          non-recurring meeting with
          registration enabled.
        </p>

        <form
          onSubmit={handleCreate}
          className="mt-7"
        >
          <div className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <label
                htmlFor="courseId"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Course
              </label>

              <select
                id="courseId"
                name="courseId"
                value={form.courseId}
                onChange={
                  handleFormChange
                }
                required
                disabled={
                  busyKey === "create"
                }
                className="w-full min-w-0 max-w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950"
              >
                <option value="">
                  Select course
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
            </div>

            {selectedCourse
              ?.paymentPlan ===
              "monthly" && (
              <div className="min-w-0">
                <label
                  htmlFor="billingPeriodId"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Billing period
                </label>

                <select
                  id="billingPeriodId"
                  name="billingPeriodId"
                  value={
                    form.billingPeriodId
                  }
                  onChange={
                    handleFormChange
                  }
                  required
                  disabled={
                    isLoadingPeriods ||
                    busyKey === "create"
                  }
                  className="w-full min-w-0 max-w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 disabled:opacity-50"
                >
                  <option value="">
                    {isLoadingPeriods
                      ? "Loading periods…"
                      : "Select period"}
                  </option>

                  {billingPeriods.map(
                    (period) => (
                      <option
                        key={period._id}
                        value={period._id}
                      >
                        {period.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            <FormField
              id="zoomMeetingId"
              label="Zoom meeting ID"
              value={
                form.zoomMeetingId
              }
              onChange={
                handleFormChange
              }
              required
              disabled={
                busyKey === "create"
              }
              helpText="Spaces and hyphens are accepted."
            />

            <FormField
              id="title"
              label="Custom title"
              value={form.title}
              onChange={
                handleFormChange
              }
              disabled={
                busyKey === "create"
              }
              helpText="Leave blank to use the Zoom topic."
            />

            <FormField
              id="joinWindowMinutesBefore"
              label="Join opens before"
              type="number"
              value={
                form.joinWindowMinutesBefore
              }
              onChange={
                handleFormChange
              }
              min="0"
              max="1440"
              disabled={
                busyKey === "create"
              }
              helpText="Minutes. Leave blank for the platform default."
            />

            <FormField
              id="joinWindowMinutesAfter"
              label="Join closes after"
              type="number"
              value={
                form.joinWindowMinutesAfter
              }
              onChange={
                handleFormChange
              }
              min="0"
              max="1440"
              disabled={
                busyKey === "create"
              }
              helpText="Minutes after the meeting ends."
            />

            <div className="sm:col-span-2 lg:col-span-3">
              <FormField
                id="description"
                label="Description"
                value={
                  form.description
                }
                onChange={
                  handleFormChange
                }
                multiline
                rows={4}
                disabled={
                  busyKey === "create"
                }
                helpText="Leave blank to use the Zoom meeting agenda."
              />
            </div>
          </div>

          <label className="mt-6 flex items-center gap-3 text-sm font-bold text-slate-700">
            <input
              name="isPublished"
              type="checkbox"
              checked={
                form.isPublished
              }
              onChange={
                handleFormChange
              }
              disabled={
                busyKey === "create"
              }
              className="h-5 w-5 rounded border-slate-300"
            />

            Publish and synchronize
            eligible students immediately
          </label>

          <button
            type="submit"
            disabled={
              busyKey === "create"
            }
            className="mt-7 rounded-2xl bg-brand-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyKey === "create"
              ? "Connecting Zoom meeting…"
              : "Connect Zoom meeting"}
          </button>
        </form>
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();

          setAppliedFilters({
            ...filters,
          });
        }}
        className="mt-8 grid min-w-0 gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[minmax(0,1fr)_190px_auto]"
      >
        <select
          name="courseId"
          value={filters.courseId}
          onChange={
            handleFilterChange
          }
          className="w-full min-w-0 max-w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
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
          name="status"
          value={filters.status}
          onChange={
            handleFilterChange
          }
          className="w-full min-w-0 max-w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
        >
          <option value="">
            All statuses
          </option>

          <option value="scheduled">
            Scheduled
          </option>

          <option value="completed">
            Completed
          </option>

          <option value="cancelled">
            Cancelled
          </option>
        </select>

        <button
          type="submit"
          className="w-full rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white sm:w-auto"
        >
          Apply filters
        </button>
      </form>

      {isLoading ? (
        <div className="mt-7 space-y-4">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-3xl bg-slate-200"
            />
          ))}
        </div>
      ) : liveClasses.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            title="No live classes"
            description="No Zoom live classes match the selected filters."
          />
        </div>
      ) : (
        <div className="mt-7 space-y-5">
          {liveClasses.map(
            (liveClass) => {
              const busy =
                busyKey.includes(
                  liveClass._id
                );

              return (
                <article
                  key={liveClass._id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
                >
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          status={
                            liveClass.status ===
                            "scheduled"
                              ? "active"
                              : liveClass.status ===
                                  "cancelled"
                                ? "closed"
                                : "inactive"
                          }
                          label={
                            liveClass.status
                          }
                        />

                        <StatusBadge
                          status={
                            liveClass.isPublished
                              ? "active"
                              : "inactive"
                          }
                          label={
                            liveClass.isPublished
                              ? "Published"
                              : "Unpublished"
                          }
                        />

                        {liveClass.billingPeriod && (
                          <StatusBadge
                            status="open"
                            label={
                              liveClass
                                .billingPeriod
                                .label
                            }
                          />
                        )}
                      </div>

                      <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-brand-700">
                        {liveClass.course
                          ?.code ||
                          "Course"}
                      </p>

                      <h2 className="mt-2 text-2xl font-black text-slate-950">
                        {liveClass.title}
                      </h2>

                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        {liveClass.course
                          ?.title ||
                          "Course unavailable"}
                      </p>

                      {liveClass.description && (
                        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {
                            liveClass.description
                          }
                        </p>
                      )}

                      <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
                            {liveClass.durationMinutes}{" "}
                            minutes
                          </dd>
                        </div>

                        <div>
                          <dt className="font-bold text-slate-500">
                            Timezone
                          </dt>

                          <dd className="mt-1 font-black text-slate-950">
                            {liveClass.timezone ||
                              "—"}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-bold text-slate-500">
                            Zoom meeting ID
                          </dt>

                          <dd className="mt-1 break-all font-black text-slate-950">
                            {liveClass.zoomMeetingId ||
                              "—"}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-bold text-slate-500">
                            Join opens
                          </dt>

                          <dd className="mt-1 font-black text-slate-950">
                            {liveClass.joinWindowMinutesBefore}{" "}
                            minutes before
                          </dd>
                        </div>

                        <div>
                          <dt className="font-bold text-slate-500">
                            Join closes
                          </dt>

                          <dd className="mt-1 font-black text-slate-950">
                            {liveClass.joinWindowMinutesAfter}{" "}
                            minutes after
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="w-full shrink-0 xl:w-80">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
                          Class status
                        </label>

                        <select
                          value={
                            statusDrafts[
                              liveClass._id
                            ] ||
                            liveClass.status
                          }
                          onChange={(event) =>
                            setStatusDrafts(
                              (current) => ({
                                ...current,

                                [liveClass._id]:
                                  event.target.value,
                              })
                            )
                          }
                          disabled={busy}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                        >
                          <option value="scheduled">
                            Scheduled
                          </option>

                          <option value="completed">
                            Completed
                          </option>

                          <option value="cancelled">
                            Cancelled
                          </option>
                        </select>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            runAction({
                              key:
                                `status-${liveClass._id}`,

                              action: () =>
                                updateAdminLiveClassStatus({
                                  liveClassId:
                                    liveClass._id,

                                  status:
                                    statusDrafts[
                                      liveClass._id
                                    ] ||
                                    liveClass.status,
                                }),
                            })
                          }
                          className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                        >
                          Save status
                        </button>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            runAction({
                              key:
                                `publication-${liveClass._id}`,

                              action: () =>
                                updateAdminLiveClassStatus({
                                  liveClassId:
                                    liveClass._id,

                                  isPublished:
                                    !liveClass.isPublished,
                                }),
                            })
                          }
                          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50"
                        >
                          {liveClass.isPublished
                            ? "Unpublish"
                            : "Publish"}
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            runAction({
                              key:
                                `refresh-${liveClass._id}`,

                              action: () =>
                                refreshAdminLiveClass({
                                  liveClassId:
                                    liveClass._id,

                                  keepCustomTitle:
                                    true,
                                }),
                            })
                          }
                          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50"
                        >
                          Refresh from Zoom
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            runAction({
                              key:
                                `sync-${liveClass._id}`,

                              action: () =>
                                syncAdminLiveClass(
                                  liveClass._id
                                ),

                              successFormatter:
                                getSyncMessage,
                            })
                          }
                          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                        >
                          Synchronize students
                        </button>
                      </div>

                      {busy && (
                        <p className="mt-3 text-center text-xs font-bold text-slate-500">
                          Processing…
                        </p>
                      )}
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
