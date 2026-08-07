import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router";

import {
  archiveAdminBillingPeriod,
  createAdminBillingPeriod,
  getAdminBillingPeriods,
  restoreAdminBillingPeriod,
  setAdminBillingPeriodStatus,
  updateAdminBillingPeriod,
} from "../../api/billingPeriodAdminApi.js";

import {
  deleteAdminCourse,
  getAdminCourse,
  setAdminCourseEnrollment,
  setAdminCoursePublication,
  updateAdminCourse,
} from "../../api/courseAdminApi.js";

import {
  archiveAdminLesson,
  createAdminLesson,
  getAdminLessons,
  restoreAdminLesson,
  setAdminLessonPublication,
  updateAdminLesson,
} from "../../api/lessonAdminApi.js";

import AdminPageHeader from "../../components/common/AdminPageHeader.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";
import FormField from "../../components/forms/FormField.jsx";

import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

import {
  formatCurrency,
  formatDateTime,
} from "../../utils/formatters.js";

const toDateTimeLocal = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);
};

const toIsoDate = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date.toISOString();
};

const createCourseForm = (
  course = {}
) => ({
  title:
    course.title || "",

  code:
    course.code || "",

  subject:
    course.subject || "Economics",

  academicLevel:
    course.academicLevel || "",

  category:
    course.category || "grade",

  paymentPlan:
    course.paymentPlan ||
    "monthly",

  price:
    String(
      course.price ?? ""
    ),

  currency:
    course.currency || "LKR",

  shortDescription:
    course.shortDescription || "",

  description:
    course.description || "",

  thumbnailUrl:
    course.thumbnailUrl || "",

  sortOrder:
    String(
      course.sortOrder ?? 0
    ),
});

const createDefaultPeriodForm =
  (course = {}) => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      now.getMonth() + 1;

    const accessStart =
      new Date(
        year,
        month - 1,
        1,
        0,
        0,
        0
      );

    const accessEnd =
      new Date(
        year,
        month,
        0,
        23,
        59,
        59
      );

    const label =
      accessStart.toLocaleDateString(
        "en",
        {
          month: "long",
          year: "numeric",
        }
      );

    return {
      year:
        String(year),

      month:
        String(month),

      label,

      amount:
        String(
          course.price ?? ""
        ),

      currency:
        course.currency || "LKR",

      accessStartsAt:
        toDateTimeLocal(
          accessStart
        ),

      accessEndsAt:
        toDateTimeLocal(
          accessEnd
        ),

      paymentDeadline:
        toDateTimeLocal(
          accessEnd
        ),

      isPublished: false,
      isPaymentOpen: true,
    };
  };

const createPeriodEditForm = (
  period
) => ({
  year:
    String(period.year),

  month:
    String(period.month),

  label:
    period.label || "",

  amount:
    String(period.amount ?? ""),

  currency:
    period.currency || "LKR",

  accessStartsAt:
    toDateTimeLocal(
      period.accessStartsAt
    ),

  accessEndsAt:
    toDateTimeLocal(
      period.accessEndsAt
    ),

  paymentDeadline:
    toDateTimeLocal(
      period.paymentDeadline
    ),

  isPublished:
    Boolean(
      period.isPublished
    ),

  isPaymentOpen:
    Boolean(
      period.isPaymentOpen
    ),
});

const createEmptyLessonForm = (
  defaultMaxViews = 2
) => ({
  title: "",
  description: "",
  youtubeVideo: "",
  billingPeriodId: "",
  lessonOrder: "0",
  maxViews: String(defaultMaxViews),
  publishAt: "",
  isPublished: false,
});

const createLessonEditForm = (
  lesson
) => ({
  title:
    lesson.title || "",

  description:
    lesson.description || "",

  youtubeVideo:
    lesson.youtubeVideoId || "",

  billingPeriodId:
    lesson.billingPeriod?._id ||
    lesson.billingPeriod ||
    "",

  lessonOrder:
    String(
      lesson.lessonOrder ?? 0
    ),

  maxViews:
    String(
      lesson.maxViews ?? 2
    ),

  publishAt:
    toDateTimeLocal(
      lesson.publishAt
    ),

  isPublished:
    Boolean(
      lesson.isPublished
    ),
});

export default function AdminCoursePage() {
  const navigate = useNavigate();
  const {
    courseId,
  } = useParams();

  const {
    settings,
  } = usePlatformSettings();

  const defaultLessonMaxViews =
    settings.learning
      .defaultLessonMaxViews;

  const [course, setCourse] =
    useState(null);

  const [
    courseForm,
    setCourseForm,
  ] = useState(
    createCourseForm()
  );

  const [
    billingPeriods,
    setBillingPeriods,
  ] = useState([]);

  const [lessons, setLessons] =
    useState([]);

  const [
    periodForm,
    setPeriodForm,
  ] = useState(
    createDefaultPeriodForm()
  );

  const [
    editingPeriodId,
    setEditingPeriodId,
  ] = useState("");

  const [
    lessonForm,
    setLessonForm,
  ] = useState(() =>
    createEmptyLessonForm(
      defaultLessonMaxViews
    )
  );

  const [
    editingLessonId,
    setEditingLessonId,
  ] = useState("");

  const [busyId, setBusyId] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const loadCourse =
    useCallback(async () => {
      setError("");
      setIsLoading(true);

      try {
        const courseResult =
          await getAdminCourse(
            courseId
          );

        const loadedCourse =
          courseResult.course;

        const [
          lessonResult,
          periodResult,
        ] = await Promise.all([
          getAdminLessons(
            courseId
          ),

          loadedCourse.paymentPlan ===
          "monthly"
            ? getAdminBillingPeriods(
                courseId
              )
            : Promise.resolve({
                billingPeriods: [],
              }),
        ]);

        setCourse(
          loadedCourse
        );

        setCourseForm(
          createCourseForm(
            loadedCourse
          )
        );

        setLessons(
          lessonResult.lessons ||
            []
        );

        const loadedPeriods =
          periodResult.billingPeriods ||
          [];

        setBillingPeriods(
          loadedPeriods
        );

        setPeriodForm(
          createDefaultPeriodForm(
            loadedCourse
          )
        );

        setLessonForm({
          ...createEmptyLessonForm(
            defaultLessonMaxViews
          ),

          billingPeriodId:
            loadedPeriods[0]?._id ||
            "",
        });
      } catch (requestError) {
        setError(
          requestError.message ||
            "Course management data could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      courseId,
      defaultLessonMaxViews,
    ]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const handleCourseChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setCourseForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  const handlePeriodChange = (
    event
  ) => {
    const {
      name,
      value,
      checked,
      type,
    } = event.target;

    setPeriodForm(
      (current) => ({
        ...current,

        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );
  };

  const handleLessonChange = (
    event
  ) => {
    const {
      name,
      value,
      checked,
      type,
    } = event.target;

    setLessonForm(
      (current) => ({
        ...current,

        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );
  };

  const showResult = (
    result
  ) => {
    setSuccess(
      result.message ||
        "Changes saved."
    );
  };

  const runAction = async (
    key,
    action
  ) => {
    setBusyId(key);
    setError("");
    setSuccess("");

    try {
      const result =
        await action();

      showResult(result);
      await loadCourse();
    } catch (requestError) {
      setError(
        requestError.message ||
          "The operation failed."
      );
    } finally {
      setBusyId("");
    }
  };

  const deleteCourse = async () => {
    const confirmation = window.prompt(
      `This permanently deletes the course and all related lessons, billing periods, live classes, enrolments, payments, playback history and notifications. Enter ${course.code} to confirm.`
    );

    if (confirmation === null) {
      return;
    }

    setBusyId("course-delete");
    setError("");
    setSuccess("");

    try {
      await deleteAdminCourse(courseId, confirmation);
      navigate("/admin/courses", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Course could not be permanently deleted.");
      setBusyId("");
    }
  };

  const saveCourse = async (
    event
  ) => {
    event.preventDefault();

    await runAction(
      "course-save",
      () =>
        updateAdminCourse(
          courseId,
          {
            title:
              courseForm.title.trim(),

            code:
              courseForm.code
                .trim()
                .toUpperCase(),

            subject:
              courseForm.subject.trim(),

            academicLevel:
              courseForm.academicLevel.trim(),

            category:
              courseForm.category,

            paymentPlan:
              courseForm.paymentPlan,

            price:
              Number(
                courseForm.price
              ),

            currency:
              courseForm.currency
                .trim()
                .toUpperCase(),

            shortDescription:
              courseForm.shortDescription.trim(),

            description:
              courseForm.description.trim(),

            thumbnailUrl:
              courseForm.thumbnailUrl.trim() ||
              null,

            sortOrder:
              Number(
                courseForm.sortOrder ||
                  0
              ),
          }
        )
    );
  };

  const savePeriod = async (
    event
  ) => {
    event.preventDefault();

    const fields = {
      year:
        Number(
          periodForm.year
        ),

      month:
        Number(
          periodForm.month
        ),

      label:
        periodForm.label.trim(),

      amount:
        Number(
          periodForm.amount
        ),

      currency:
        periodForm.currency
          .trim()
          .toUpperCase(),

      accessStartsAt:
        toIsoDate(
          periodForm.accessStartsAt
        ),

      accessEndsAt:
        toIsoDate(
          periodForm.accessEndsAt
        ),

      paymentDeadline:
        toIsoDate(
          periodForm.paymentDeadline
        ),
    };

    await runAction(
      editingPeriodId ||
        "period-create",
      () =>
        editingPeriodId
          ? updateAdminBillingPeriod(
              editingPeriodId,
              fields
            )
          : createAdminBillingPeriod(
              {
                ...fields,
                courseId,

                isPublished:
                  periodForm.isPublished,

                isPaymentOpen:
                  periodForm.isPaymentOpen,
              }
            )
    );

    setEditingPeriodId("");

    setPeriodForm(
      createDefaultPeriodForm(
        course
      )
    );
  };

  const saveLesson = async (
    event
  ) => {
    event.preventDefault();

    const fields = {
      title:
        lessonForm.title.trim(),

      description:
        lessonForm.description.trim(),

      youtubeVideo:
        lessonForm.youtubeVideo.trim(),

      lessonOrder:
        Number(
          lessonForm.lessonOrder ||
            0
        ),

      maxViews:
        Number(
          lessonForm.maxViews
        ),

      publishAt:
        toIsoDate(
          lessonForm.publishAt
        ),
    };

    if (
      course.paymentPlan ===
      "monthly"
    ) {
      fields.billingPeriodId =
        lessonForm.billingPeriodId;
    }

    await runAction(
      editingLessonId ||
        "lesson-create",
      () =>
        editingLessonId
          ? updateAdminLesson(
              editingLessonId,
              fields
            )
          : createAdminLesson({
              ...fields,
              courseId,

              isPublished:
                lessonForm.isPublished,
            })
    );

    setEditingLessonId("");

    setLessonForm({
      ...emptyLessonForm,

      billingPeriodId:
        billingPeriods[0]?._id ||
        "",
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-80 animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-8 h-[40rem] animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <StatusMessage variant="error">
          {error ||
            "Course not found."}
        </StatusMessage>

        <Link
          to="/admin/courses"
          className="mt-6 inline-flex rounded-2xl bg-brand-600 px-6 py-3 text-sm font-black text-white"
        >
          Return to courses
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/admin/courses"
        className="text-sm font-black text-brand-700 hover:text-brand-900"
      >
        ← Return to courses
      </Link>

      <div className="mt-6">
        <AdminPageHeader
          eyebrow={course.code}
          title={course.title}
          description="Manage course details, monthly billing periods and published lessons."
          action={
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                status={
                  course.isPublished
                    ? "active"
                    : "inactive"
                }
                label={
                  course.isPublished
                    ? "Published"
                    : "Unpublished"
                }
              />

              <StatusBadge
                status={
                  course.isEnrollmentOpen
                    ? "open"
                    : "closed"
                }
                label={
                  course.isEnrollmentOpen
                    ? "Enrolment open"
                    : "Enrolment closed"
                }
              />

              {course.isArchived && !course.isPublished && (
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => void deleteCourse()}
                  className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                >
                  {busyId === "course-delete" ? "Deleting…" : "Delete permanently"}
                </button>
              )}
            </div>
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
      </div>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-slate-950">
            Course settings
          </h2>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                Boolean(busyId) ||
                course.isArchived
              }
              onClick={() =>
                runAction(
                  "course-publication",
                  () =>
                    setAdminCoursePublication(
                      courseId,
                      !course.isPublished
                    )
                )
              }
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-40"
            >
              {course.isPublished
                ? "Unpublish"
                : "Publish"}
            </button>

            <button
              type="button"
              disabled={
                Boolean(busyId) ||
                course.isArchived
              }
              onClick={() =>
                runAction(
                  "course-enrolment",
                  () =>
                    setAdminCourseEnrollment(
                      courseId,
                      !course.isEnrollmentOpen
                    )
                )
              }
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-40"
            >
              {course.isEnrollmentOpen
                ? "Close enrolment"
                : "Open enrolment"}
            </button>
          </div>
        </div>

        <form
          onSubmit={saveCourse}
          className="mt-7"
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              id="title"
              label="Title"
              value={
                courseForm.title
              }
              onChange={
                handleCourseChange
              }
              required
              disabled={
                busyId ===
                "course-save"
              }
            />

            <FormField
              id="code"
              label="Course code"
              value={
                courseForm.code
              }
              onChange={
                handleCourseChange
              }
              required
              disabled={
                busyId ===
                "course-save"
              }
            />

            <FormField
              id="subject"
              label="Subject"
              value={
                courseForm.subject
              }
              onChange={
                handleCourseChange
              }
              required
              disabled={
                busyId ===
                "course-save"
              }
            />

            <FormField
              id="academicLevel"
              label="Academic level"
              value={
                courseForm.academicLevel
              }
              onChange={
                handleCourseChange
              }
              required
              disabled={
                busyId ===
                "course-save"
              }
            />

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800">
                Category
              </label>

              <select
                name="category"
                value={
                  courseForm.category
                }
                onChange={
                  handleCourseChange
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3.5"
              >
                <option value="grade">
                  Grade
                </option>

                <option value="revision">
                  Revision
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800">
                Payment plan
              </label>

              <select
                name="paymentPlan"
                value={
                  courseForm.paymentPlan
                }
                onChange={
                  handleCourseChange
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3.5"
              >
                <option value="monthly">
                  Monthly
                </option>

                <option value="one_time">
                  One-time
                </option>
              </select>
            </div>

            <FormField
              id="price"
              label="Price"
              type="number"
              value={
                courseForm.price
              }
              onChange={
                handleCourseChange
              }
              required
            />

            <FormField
              id="currency"
              label="Currency"
              value={
                courseForm.currency
              }
              onChange={
                handleCourseChange
              }
              required
            />

            <FormField
              id="sortOrder"
              label="Sort order"
              type="number"
              value={
                courseForm.sortOrder
              }
              onChange={
                handleCourseChange
              }
            />

            <div className="sm:col-span-2 lg:col-span-3">
              <FormField
                id="shortDescription"
                label="Short description"
                value={
                  courseForm.shortDescription
                }
                onChange={
                  handleCourseChange
                }
                multiline
                rows={2}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <FormField
                id="description"
                label="Description"
                value={
                  courseForm.description
                }
                onChange={
                  handleCourseChange
                }
                multiline
                rows={5}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <FormField
                id="thumbnailUrl"
                label="Thumbnail URL"
                type="url"
                value={
                  courseForm.thumbnailUrl
                }
                onChange={
                  handleCourseChange
                }
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={
              busyId ===
              "course-save"
            }
            className="mt-7 rounded-2xl bg-brand-600 px-7 py-3.5 text-sm font-black text-white disabled:opacity-50"
          >
            {busyId ===
            "course-save"
              ? "Saving…"
              : "Save course"}
          </button>
        </form>
      </section>

      {course.paymentPlan ===
        "monthly" && (
        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-950">
            Billing periods
          </h2>

          <form
            onSubmit={savePeriod}
            className="mt-7 rounded-2xl bg-slate-50 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-black text-slate-950">
                {editingPeriodId
                  ? "Edit billing period"
                  : "Create billing period"}
              </h3>

              {editingPeriodId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPeriodId(
                      ""
                    );

                    setPeriodForm(
                      createDefaultPeriodForm(
                        course
                      )
                    );
                  }}
                  className="text-sm font-black text-slate-600"
                >
                  Cancel editing
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                id="year"
                label="Year"
                type="number"
                value={
                  periodForm.year
                }
                onChange={
                  handlePeriodChange
                }
                required
              />

              <FormField
                id="month"
                label="Month"
                type="number"
                value={
                  periodForm.month
                }
                onChange={
                  handlePeriodChange
                }
                required
              />

              <FormField
                id="label"
                label="Label"
                value={
                  periodForm.label
                }
                onChange={
                  handlePeriodChange
                }
              />

              <FormField
                id="amount"
                label="Amount"
                type="number"
                value={
                  periodForm.amount
                }
                onChange={
                  handlePeriodChange
                }
                required
              />

              <FormField
                id="currency"
                label="Currency"
                value={
                  periodForm.currency
                }
                onChange={
                  handlePeriodChange
                }
                required
              />

              <FormField
                id="accessStartsAt"
                label="Access starts"
                type="datetime-local"
                value={
                  periodForm.accessStartsAt
                }
                onChange={
                  handlePeriodChange
                }
                required
              />

              <FormField
                id="accessEndsAt"
                label="Access ends"
                type="datetime-local"
                value={
                  periodForm.accessEndsAt
                }
                onChange={
                  handlePeriodChange
                }
                required
              />

              <FormField
                id="paymentDeadline"
                label="Payment deadline"
                type="datetime-local"
                value={
                  periodForm.paymentDeadline
                }
                onChange={
                  handlePeriodChange
                }
              />
            </div>

            {!editingPeriodId && (
              <div className="mt-5 flex flex-wrap gap-6">
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <input
                    name="isPublished"
                    type="checkbox"
                    checked={
                      periodForm.isPublished
                    }
                    onChange={
                      handlePeriodChange
                    }
                    className="h-5 w-5"
                  />

                  Published
                </label>

                <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <input
                    name="isPaymentOpen"
                    type="checkbox"
                    checked={
                      periodForm.isPaymentOpen
                    }
                    onChange={
                      handlePeriodChange
                    }
                    className="h-5 w-5"
                  />

                  Payment open
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={
                Boolean(busyId)
              }
              className="mt-6 rounded-xl bg-brand-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {editingPeriodId
                ? "Save period"
                : "Create period"}
            </button>
          </form>

          {billingPeriods.length ===
          0 ? (
            <div className="mt-6">
              <EmptyState
                title="No billing periods"
                description="No monthly billing periods were found."
              />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {billingPeriods.map(
                (period) => (
                  <article
                    key={period._id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            status={
                              period.isArchived
                                ? "closed"
                                : period.isPublished
                                  ? "active"
                                  : "inactive"
                            }
                            label={
                              period.isArchived
                                ? "Archived"
                                : period.isPublished
                                  ? "Published"
                                  : "Unpublished"
                            }
                          />

                          <StatusBadge
                            status={
                              period.isPaymentOpen
                                ? "open"
                                : "closed"
                            }
                            label={
                              period.isPaymentOpen
                                ? "Payment open"
                                : "Payment closed"
                            }
                          />
                        </div>

                        <h3 className="mt-3 text-lg font-black text-slate-950">
                          {period.label}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatCurrency(
                            period.amount,
                            period.currency
                          )}{" "}
                          · Deadline{" "}
                          {formatDateTime(
                            period.paymentDeadline
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPeriodId(
                              period._id
                            );

                            setPeriodForm(
                              createPeriodEditForm(
                                period
                              )
                            );
                          }}
                          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700"
                        >
                          Edit
                        </button>

                        {!period.isArchived && (
                          <>
                            <button
                              type="button"
                              disabled={
                                Boolean(
                                  busyId
                                )
                              }
                              onClick={() =>
                                runAction(
                                  `period-publish-${period._id}`,
                                  () =>
                                    setAdminBillingPeriodStatus(
                                      period._id,
                                      {
                                        isPublished:
                                          !period.isPublished,
                                      }
                                    )
                                )
                              }
                              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700"
                            >
                              {period.isPublished
                                ? "Unpublish"
                                : "Publish"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                Boolean(
                                  busyId
                                )
                              }
                              onClick={() =>
                                runAction(
                                  `period-open-${period._id}`,
                                  () =>
                                    setAdminBillingPeriodStatus(
                                      period._id,
                                      {
                                        isPaymentOpen:
                                          !period.isPaymentOpen,
                                      }
                                    )
                                )
                              }
                              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700"
                            >
                              {period.isPaymentOpen
                                ? "Close payments"
                                : "Open payments"}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Archive ${period.label}?`
                                  )
                                ) {
                                  void runAction(
                                    `period-archive-${period._id}`,
                                    () =>
                                      archiveAdminBillingPeriod(
                                        period._id
                                      )
                                  );
                                }
                              }}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700"
                            >
                              Archive
                            </button>
                          </>
                        )}

                        {period.isArchived && (
                          <button
                            type="button"
                            onClick={() =>
                              runAction(
                                `period-restore-${period._id}`,
                                () =>
                                  restoreAdminBillingPeriod(
                                    period._id
                                  )
                              )
                            }
                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      )}

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-black text-slate-950">
          Lessons
        </h2>

        <form
          onSubmit={saveLesson}
          className="mt-7 rounded-2xl bg-slate-50 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-black text-slate-950">
              {editingLessonId
                ? "Edit lesson"
                : "Create lesson"}
            </h3>

            {editingLessonId && (
              <button
                type="button"
                onClick={() => {
                  setEditingLessonId(
                    ""
                  );

                  setLessonForm({
                    ...createEmptyLessonForm(
            defaultLessonMaxViews
          ),

                    billingPeriodId:
                      billingPeriods[0]?._id ||
                      "",
                  });
                }}
                className="text-sm font-black text-slate-600"
              >
                Cancel editing
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FormField
              id="title"
              label="Lesson title"
              value={
                lessonForm.title
              }
              onChange={
                handleLessonChange
              }
              required
            />

            <FormField
              id="youtubeVideo"
              label="YouTube URL or video ID"
              value={
                lessonForm.youtubeVideo
              }
              onChange={
                handleLessonChange
              }
              required
            />

            {course.paymentPlan ===
              "monthly" && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">
                  Billing period
                </label>

                <select
                  name="billingPeriodId"
                  value={
                    lessonForm.billingPeriodId
                  }
                  onChange={
                    handleLessonChange
                  }
                  required
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3.5"
                >
                  <option value="">
                    Select period
                  </option>

                  {billingPeriods
                    .filter(
                      (period) =>
                        !period.isArchived
                    )
                    .map(
                      (period) => (
                        <option
                          key={
                            period._id
                          }
                          value={
                            period._id
                          }
                        >
                          {period.label}
                        </option>
                      )
                    )}
                </select>
              </div>
            )}

            <FormField
              id="lessonOrder"
              label="Lesson order"
              type="number"
              value={
                lessonForm.lessonOrder
              }
              onChange={
                handleLessonChange
              }
            />

            <FormField
              id="maxViews"
              label="Maximum views"
              type="number"
              value={
                lessonForm.maxViews
              }
              onChange={
                handleLessonChange
              }
              required
            />

            <FormField
              id="publishAt"
              label="Publish at"
              type="datetime-local"
              value={
                lessonForm.publishAt
              }
              onChange={
                handleLessonChange
              }
            />

            <div className="sm:col-span-2">
              <FormField
                id="description"
                label="Description"
                value={
                  lessonForm.description
                }
                onChange={
                  handleLessonChange
                }
                multiline
                rows={4}
              />
            </div>
          </div>

          {!editingLessonId && (
            <label className="mt-5 flex items-center gap-3 text-sm font-bold text-slate-700">
              <input
                name="isPublished"
                type="checkbox"
                checked={
                  lessonForm.isPublished
                }
                onChange={
                  handleLessonChange
                }
                className="h-5 w-5"
              />

              Publish immediately
            </label>
          )}

          <button
            type="submit"
            disabled={
              Boolean(busyId)
            }
            className="mt-6 rounded-xl bg-brand-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {editingLessonId
              ? "Save lesson"
              : "Create lesson"}
          </button>
        </form>

        {lessons.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No lessons"
              description="No lessons have been created for this course."
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {lessons.map(
              (lesson) => (
                <article
                  key={lesson._id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          status={
                            lesson.isArchived
                              ? "closed"
                              : lesson.isPublished
                                ? "active"
                                : "inactive"
                          }
                          label={
                            lesson.isArchived
                              ? "Archived"
                              : lesson.isPublished
                                ? "Published"
                                : "Unpublished"
                          }
                        />

                        {lesson.billingPeriod && (
                          <StatusBadge
                            status="active"
                            label={
                              lesson
                                .billingPeriod
                                .label
                            }
                          />
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-black text-slate-950">
                        {lesson.lessonOrder}.{" "}
                        {lesson.title}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        View limit:{" "}
                        {lesson.maxViews} ·
                        Publish time:{" "}
                        {formatDateTime(
                          lesson.publishAt
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLessonId(
                            lesson._id
                          );

                          setLessonForm(
                            createLessonEditForm(
                              lesson
                            )
                          );
                        }}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700"
                      >
                        Edit
                      </button>

                      {!lesson.isArchived && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              runAction(
                                `lesson-publish-${lesson._id}`,
                                () =>
                                  setAdminLessonPublication(
                                    lesson._id,
                                    !lesson.isPublished
                                  )
                              )
                            }
                            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700"
                          >
                            {lesson.isPublished
                              ? "Unpublish"
                              : "Publish"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Archive ${lesson.title}?`
                                )
                              ) {
                                void runAction(
                                  `lesson-archive-${lesson._id}`,
                                  () =>
                                    archiveAdminLesson(
                                      lesson._id
                                    )
                                );
                              }
                            }}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700"
                          >
                            Archive
                          </button>
                        </>
                      )}

                      {lesson.isArchived && (
                        <button
                          type="button"
                          onClick={() =>
                            runAction(
                              `lesson-restore-${lesson._id}`,
                              () =>
                                restoreAdminLesson(
                                  lesson._id
                                )
                            )
                          }
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
