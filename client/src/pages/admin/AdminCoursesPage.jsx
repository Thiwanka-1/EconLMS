import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  archiveAdminCourse,
  createAdminCourse,
  getAdminCourses,
  restoreAdminCourse,
  setAdminCourseEnrollment,
  setAdminCoursePublication,
} from "../../api/courseAdminApi.js";

import AdminPageHeader from "../../components/common/AdminPageHeader.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";
import FormField from "../../components/forms/FormField.jsx";

import {
  formatCurrency,
} from "../../utils/formatters.js";

const emptyCourseForm = {
  title: "",
  code: "",
  subject: "Accounting",
  academicLevel: "",
  category: "grade",
  paymentPlan: "monthly",
  price: "",
  currency: "LKR",
  shortDescription: "",
  description: "",
  thumbnailUrl: "",
  sortOrder: "0",
  isPublished: false,
  isEnrollmentOpen: true,
};

export default function AdminCoursesPage() {
  const [courses, setCourses] =
    useState([]);

  const [pagination, setPagination] =
    useState({
      currentPage: 1,
      totalPages: 1,
      totalCourses: 0,
    });

  const [filters, setFilters] =
    useState({
      search: "",
      category: "",
      paymentPlan: "",
      isPublished: "",
      isArchived: "false",
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(filters);

  const [form, setForm] =
    useState(emptyCourseForm);

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [busyId, setBusyId] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const loadCourses =
    useCallback(
      async (page = 1) => {
        setError("");
        setIsLoading(true);

        try {
          const result =
            await getAdminCourses({
              ...appliedFilters,
              page,
              limit: 20,
            });

          setCourses(
            result.courses || []
          );

          setPagination(
            result.pagination || {
              currentPage: page,
              totalPages: 1,
              totalCourses: 0,
            }
          );
        } catch (requestError) {
          setError(
            requestError.message ||
              "Courses could not be loaded."
          );
        } finally {
          setIsLoading(false);
        }
      },
      [appliedFilters]
    );

  useEffect(() => {
    loadCourses(1);
  }, [loadCourses]);

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

  const handleFormChange = (
    event
  ) => {
    const {
      name,
      value,
      checked,
      type,
    } = event.target;

    setForm((current) => ({
      ...current,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const runCourseAction =
    async (
      courseId,
      action
    ) => {
      setError("");
      setSuccess("");
      setBusyId(courseId);

      try {
        const result =
          await action();

        setSuccess(
          result.message ||
            "Course updated."
        );

        await loadCourses(
          pagination.currentPage
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "The course could not be updated."
        );
      } finally {
        setBusyId("");
      }
    };

  const handleCreate = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setBusyId("create");

    try {
      const result =
        await createAdminCourse({
          title:
            form.title.trim(),

          code:
            form.code
              .trim()
              .toUpperCase(),

          subject:
            form.subject.trim(),

          academicLevel:
            form.academicLevel.trim(),

          category:
            form.category,

          paymentPlan:
            form.paymentPlan,

          price:
            Number(form.price),

          currency:
            form.currency
              .trim()
              .toUpperCase(),

          shortDescription:
            form.shortDescription.trim(),

          description:
            form.description.trim(),

          thumbnailUrl:
            form.thumbnailUrl.trim() ||
            null,

          sortOrder:
            Number(
              form.sortOrder || 0
            ),

          isPublished:
            form.isPublished,

          isEnrollmentOpen:
            form.isEnrollmentOpen,
        });

      setSuccess(
        result.message ||
          "Course created."
      );

      setForm(emptyCourseForm);
      setShowCreateForm(false);

      await loadCourses(1);
    } catch (requestError) {
      setError(
        requestError.message ||
          "The course could not be created."
      );
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Course administration"
        title="Courses"
        description="Create and manage published, unpublished and archived courses."
        action={
          <button
            type="button"
            onClick={() =>
              setShowCreateForm(
                (current) => !current
              )
            }
            className="rounded-2xl bg-brand-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
          >
            {showCreateForm
              ? "Close form"
              : "Create course"}
          </button>
        }
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

      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="text-xl font-black text-slate-950">
            New course
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              id="title"
              label="Title"
              value={form.title}
              onChange={
                handleFormChange
              }
              required
              disabled={
                busyId === "create"
              }
            />

            <FormField
              id="code"
              label="Course code"
              value={form.code}
              onChange={
                handleFormChange
              }
              required
              disabled={
                busyId === "create"
              }
            />

            <FormField
              id="subject"
              label="Subject"
              value={form.subject}
              onChange={
                handleFormChange
              }
              required
              disabled={
                busyId === "create"
              }
            />

            <FormField
              id="academicLevel"
              label="Academic level"
              value={
                form.academicLevel
              }
              onChange={
                handleFormChange
              }
              required
              disabled={
                busyId === "create"
              }
            />

            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Category
              </label>

              <select
                id="category"
                name="category"
                value={form.category}
                onChange={
                  handleFormChange
                }
                disabled={
                  busyId === "create"
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950"
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
              <label
                htmlFor="paymentPlan"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Payment plan
              </label>

              <select
                id="paymentPlan"
                name="paymentPlan"
                value={
                  form.paymentPlan
                }
                onChange={
                  handleFormChange
                }
                disabled={
                  busyId === "create"
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950"
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
              value={form.price}
              onChange={
                handleFormChange
              }
              required
              disabled={
                busyId === "create"
              }
            />

            <FormField
              id="currency"
              label="Currency"
              value={form.currency}
              onChange={
                handleFormChange
              }
              required
              disabled={
                busyId === "create"
              }
            />

            <FormField
              id="sortOrder"
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={
                handleFormChange
              }
              disabled={
                busyId === "create"
              }
            />

            <div className="sm:col-span-2 lg:col-span-3">
              <FormField
                id="shortDescription"
                label="Short description"
                value={
                  form.shortDescription
                }
                onChange={
                  handleFormChange
                }
                disabled={
                  busyId === "create"
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
                  form.description
                }
                onChange={
                  handleFormChange
                }
                disabled={
                  busyId === "create"
                }
                multiline
                rows={5}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <FormField
                id="thumbnailUrl"
                label="Thumbnail URL"
                value={
                  form.thumbnailUrl
                }
                onChange={
                  handleFormChange
                }
                placeholder="/course-thumbnails/example.webp or https://..."
                helpText="Use a same-site path beginning with / or a complete HTTPS image URL."
                disabled={
                  busyId === "create"
                }
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-6">
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
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
                  busyId === "create"
                }
                className="h-5 w-5 rounded border-slate-300"
              />

              Publish immediately
            </label>

            <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <input
                name="isEnrollmentOpen"
                type="checkbox"
                checked={
                  form.isEnrollmentOpen
                }
                onChange={
                  handleFormChange
                }
                disabled={
                  busyId === "create"
                }
                className="h-5 w-5 rounded border-slate-300"
              />

              Enrolment open
            </label>
          </div>

          <button
            type="submit"
            disabled={
              busyId === "create"
            }
            className="mt-7 rounded-2xl bg-brand-600 px-7 py-3.5 text-sm font-black text-white disabled:opacity-50"
          >
            {busyId === "create"
              ? "Creating…"
              : "Create course"}
          </button>
        </form>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();

          setAppliedFilters({
            ...filters,
          });
        }}
        className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-[1fr_160px_160px_150px_150px_auto]"
      >
        <input
          name="search"
          type="search"
          value={filters.search}
          onChange={
            handleFilterChange
          }
          placeholder="Search courses"
          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
        />

        <select
          name="category"
          value={filters.category}
          onChange={
            handleFilterChange
          }
          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
        >
          <option value="">
            All categories
          </option>

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

        <select
          name="paymentPlan"
          value={
            filters.paymentPlan
          }
          onChange={
            handleFilterChange
          }
          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
        >
          <option value="">
            All plans
          </option>

          <option value="monthly">
            Monthly
          </option>

          <option value="one_time">
            One-time
          </option>
        </select>

        <select
          name="isPublished"
          value={
            filters.isPublished
          }
          onChange={
            handleFilterChange
          }
          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
        >
          <option value="">
            All publication
          </option>

          <option value="true">
            Published
          </option>

          <option value="false">
            Unpublished
          </option>
        </select>

        <select
          name="isArchived"
          value={
            filters.isArchived
          }
          onChange={
            handleFilterChange
          }
          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
        >
          <option value="">
            All archive states
          </option>

          <option value="false">
            Active
          </option>

          <option value="true">
            Archived
          </option>
        </select>

        <button
          type="submit"
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Apply
        </button>
      </form>

      {isLoading ? (
        <div className="mt-7 space-y-4">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-3xl bg-slate-200"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            title="No courses found"
            description="No courses match the selected filters."
          />
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {courses.map((course) => (
            <article
              key={course._id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      status={
                        course.isArchived
                          ? "closed"
                          : course.isPublished
                            ? "active"
                            : "inactive"
                      }
                      label={
                        course.isArchived
                          ? "Archived"
                          : course.isPublished
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
                  </div>

                  <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-brand-700">
                    {course.code}
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    {course.title}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {course.academicLevel} ·{" "}
                    {course.paymentPlan ===
                    "monthly"
                      ? "Monthly"
                      : "One-time"}{" "}
                    ·{" "}
                    {formatCurrency(
                      course.price,
                      course.currency
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 xl:max-w-xl xl:justify-end">
                  <Link
                    to={`/admin/courses/${course._id}`}
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white"
                  >
                    Manage
                  </Link>

                  {!course.isArchived && (
                    <>
                      <button
                        type="button"
                        disabled={
                          busyId ===
                          course._id
                        }
                        onClick={() =>
                          runCourseAction(
                            course._id,
                            () =>
                              setAdminCoursePublication(
                                course._id,
                                !course.isPublished
                              )
                          )
                        }
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50"
                      >
                        {course.isPublished
                          ? "Unpublish"
                          : "Publish"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          busyId ===
                          course._id
                        }
                        onClick={() =>
                          runCourseAction(
                            course._id,
                            () =>
                              setAdminCourseEnrollment(
                                course._id,
                                !course.isEnrollmentOpen
                              )
                          )
                        }
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50"
                      >
                        {course.isEnrollmentOpen
                          ? "Close enrolment"
                          : "Open enrolment"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          busyId ===
                          course._id
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              `Archive ${course.title}?`
                            )
                          ) {
                            void runCourseAction(
                              course._id,
                              () =>
                                archiveAdminCourse(
                                  course._id
                                )
                            );
                          }
                        }}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 disabled:opacity-50"
                      >
                        Archive
                      </button>
                    </>
                  )}

                  {course.isArchived && (
                    <button
                      type="button"
                      disabled={
                        busyId ===
                        course._id
                      }
                      onClick={() =>
                        runCourseAction(
                          course._id,
                          () =>
                            restoreAdminCourse(
                              course._id
                            )
                        )
                      }
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
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
          loadCourses
        }
      />
    </div>
  );
}
