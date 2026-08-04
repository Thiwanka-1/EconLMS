import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  getPublishedCourses,
} from "../../api/courseApi.js";

import {
  getMyEnrollments,
} from "../../api/enrollmentApi.js";

import EmptyState from "../../components/common/EmptyState.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";

import {
  formatCurrency,
} from "../../utils/formatters.js";

const CourseThumbnail = ({
  course,
}) => {
  if (course.thumbnailUrl) {
    return (
      <img
        src={course.thumbnailUrl}
        alt=""
        className="h-48 w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-48 items-center justify-center bg-gradient-to-br from-brand-100 via-brand-50 to-slate-100">
      <span className="text-4xl font-black text-brand-700">
        {String(
          course.code ||
            course.title ||
            "EL"
        )
          .slice(0, 3)
          .toUpperCase()}
      </span>
    </div>
  );
};

export default function StudentCoursesPage() {
  const [courses, setCourses] =
    useState([]);

  const [
    enrollments,
    setEnrollments,
  ] = useState([]);

  const [
    payments,
    setPayments,
  ] = useState([]);

  const [filters, setFilters] =
    useState({
      search: "",
      category: "",
      paymentPlan: "",
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState({
    search: "",
    category: "",
    paymentPlan: "",
  });

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const loadCourses =
    useCallback(async () => {
      setError("");
      setIsLoading(true);

      try {
        const [
          courseResult,
          enrollmentResult,
        ] = await Promise.all([
          getPublishedCourses(
            appliedFilters
          ),

          getMyEnrollments(),
        ]);

        setCourses(
          courseResult.courses || []
        );

        setEnrollments(
          enrollmentResult
            .enrollments || []
        );

        setPayments(
          enrollmentResult
            .paymentSubmissions || []
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "Courses could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }, [appliedFilters]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const enrollmentByCourseId =
    useMemo(() => {
      return new Map(
        enrollments
          .filter(
            (enrollment) =>
              enrollment.course?._id
          )
          .map((enrollment) => [
            enrollment.course._id,
            enrollment,
          ])
      );
    }, [enrollments]);

  const latestPaymentByCourseId =
    useMemo(() => {
      const result =
        new Map();

      for (const payment of payments) {
        const courseId =
          payment.course?._id ||
          payment.course;

        if (
          courseId &&
          !result.has(courseId)
        ) {
          result.set(
            courseId,
            payment
          );
        }
      }

      return result;
    }, [payments]);

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

  const handleFilterSubmit = (
    event
  ) => {
    event.preventDefault();

    setAppliedFilters({
      search:
        filters.search.trim(),

      category:
        filters.category,

      paymentPlan:
        filters.paymentPlan,
    });
  };

  const clearFilters = () => {
    const emptyFilters = {
      search: "",
      category: "",
      paymentPlan: "",
    };

    setFilters(emptyFilters);
    setAppliedFilters(
      emptyFilters
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
          Course catalogue
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Economics courses
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Browse published courses,
          review payment requirements
          and open your approved
          learning content.
        </p>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_180px_180px_auto]"
      >
        <div>
          <label
            htmlFor="search"
            className="sr-only"
          >
            Search courses
          </label>

          <input
            id="search"
            name="search"
            type="search"
            value={filters.search}
            onChange={
              handleFilterChange
            }
            placeholder="Search by title, code, subject or level"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-brand-500"
          />
        </div>

        <div>
          <label
            htmlFor="category"
            className="sr-only"
          >
            Category
          </label>

          <select
            id="category"
            name="category"
            value={filters.category}
            onChange={
              handleFilterChange
            }
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 focus:border-brand-500"
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
        </div>

        <div>
          <label
            htmlFor="paymentPlan"
            className="sr-only"
          >
            Payment plan
          </label>

          <select
            id="paymentPlan"
            name="paymentPlan"
            value={
              filters.paymentPlan
            }
            onChange={
              handleFilterChange
            }
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 focus:border-brand-500"
          >
            <option value="">
              All payment plans
            </option>

            <option value="monthly">
              Monthly
            </option>

            <option value="one_time">
              One-time
            </option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white transition hover:bg-brand-700"
          >
            Search
          </button>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6">
          <StatusMessage variant="error">
            {error}
          </StatusMessage>
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="h-[28rem] animate-pulse rounded-3xl bg-slate-200"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No courses found"
            description="No published courses match the selected filters."
            action={
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="rounded-2xl bg-brand-600 px-6 py-3 text-sm font-black text-white"
              >
                Clear filters
              </button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const enrollment =
              enrollmentByCourseId.get(
                course._id
              );

            const latestPayment =
              latestPaymentByCourseId.get(
                course._id
              );

            const identifier =
              course.slug ||
              course._id;

            return (
              <article
                key={course._id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <CourseThumbnail
                  course={course}
                />

                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      status={
                        enrollment
                          ?.status ||
                        "not_enrolled"
                      }
                    />

                    {latestPayment && (
                      <StatusBadge
                        status={
                          latestPayment.status
                        }
                        label={`Payment ${latestPayment.status}`}
                      />
                    )}
                  </div>

                  <p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-brand-700">
                    {course.code}
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    {course.title}
                  </h2>

                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {course.subject ||
                      "Economics"}{" "}
                    ·{" "}
                    {course.academicLevel}
                  </p>

                  <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">
                    {course.shortDescription ||
                      course.description ||
                      "Course information is available on the course page."}
                  </p>

                  <div className="mt-5 flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {course.paymentPlan ===
                        "monthly"
                          ? "Monthly fee"
                          : "Course fee"}
                      </p>

                      <p className="mt-1 text-lg font-black text-slate-950">
                        {formatCurrency(
                          course.price,
                          course.currency
                        )}
                      </p>
                    </div>

                    <Link
                      to={`/student/courses/${encodeURIComponent(
                        identifier
                      )}`}
                      className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      View course
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
