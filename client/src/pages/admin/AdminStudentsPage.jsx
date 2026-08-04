import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  getAdminUsers,
  setAdminUserStatus,
} from "../../api/userAdminApi.js";

import AdminPageHeader from "../../components/common/AdminPageHeader.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";

export default function AdminStudentsPage() {
  const [students, setStudents] =
    useState([]);

  const [pagination, setPagination] =
    useState({
      currentPage: 1,
      totalPages: 1,
    });

  const [filters, setFilters] =
    useState({
      search: "",
      isActive: "",
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(filters);

  const [busyId, setBusyId] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const loadStudents =
    useCallback(
      async (page = 1) => {
        setError("");
        setIsLoading(true);

        try {
          const result =
            await getAdminUsers({
              ...appliedFilters,
              page,
              limit: 20,
              role: "student",
            });

          setStudents(
            result.users || []
          );

          setPagination(
            result.pagination || {
              currentPage: page,
              totalPages: 1,
            }
          );
        } catch (requestError) {
          setError(
            requestError.message ||
              "Students could not be loaded."
          );
        } finally {
          setIsLoading(false);
        }
      },
      [appliedFilters]
    );

  useEffect(() => {
    loadStudents(1);
  }, [loadStudents]);

  const toggleStudentStatus =
    async (student) => {
      setBusyId(student._id);
      setError("");
      setSuccess("");

      try {
        const result =
          await setAdminUserStatus(
            student._id,
            !student.isActive
          );

        setSuccess(
          result.message ||
            "Student status updated."
        );

        await loadStudents(
          pagination.currentPage
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "Student status could not be updated."
        );
      } finally {
        setBusyId("");
      }
    };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Student administration"
        title="Students"
        description="Search student accounts, review verification status and manage account access."
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

      <form
        onSubmit={(event) => {
          event.preventDefault();

          setAppliedFilters({
            ...filters,
          });
        }}
        className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_180px_auto]"
      >
        <input
          type="search"
          value={filters.search}
          onChange={(event) =>
            setFilters(
              (current) => ({
                ...current,

                search:
                  event.target.value,
              })
            )
          }
          placeholder="Search name, email, NIC, phone or school"
          className="rounded-2xl border border-slate-300 px-4 py-3"
        />

        <select
          value={filters.isActive}
          onChange={(event) =>
            setFilters(
              (current) => ({
                ...current,

                isActive:
                  event.target.value,
              })
            )
          }
          className="rounded-2xl border border-slate-300 px-4 py-3"
        >
          <option value="">
            All accounts
          </option>

          <option value="true">
            Active
          </option>

          <option value="false">
            Disabled
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
            length: 5,
          }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-3xl bg-slate-200"
            />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            title="No students found"
            description="No student accounts match the selected filters."
          />
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {students.map(
            (student) => (
              <article
                key={student._id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        status={
                          student.isActive
                            ? "active"
                            : "closed"
                        }
                        label={
                          student.isActive
                            ? "Active account"
                            : "Disabled account"
                        }
                      />

                      <StatusBadge
                        status={
                          student.nicVerificationStatus ||
                          "not_uploaded"
                        }
                        label={`NIC: ${String(
                          student.nicVerificationStatus ||
                            "not uploaded"
                        ).replace(
                          /_/g,
                          " "
                        )}`}
                      />
                    </div>

                    <h2 className="mt-4 text-xl font-black text-slate-950">
                      {student.firstName}{" "}
                      {student.lastName}
                    </h2>

                    <p className="mt-1 break-all text-sm text-slate-500">
                      {student.email}
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                      NIC:{" "}
                      {student.nicNumber ||
                        "—"}{" "}
                      · School:{" "}
                      {student.school ||
                        "—"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/admin/students/${student._id}`}
                      className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white"
                    >
                      Review student
                    </Link>

                    <button
                      type="button"
                      disabled={
                        busyId ===
                        student._id
                      }
                      onClick={() => {
                        const action =
                          student.isActive
                            ? "disable"
                            : "enable";

                        if (
                          window.confirm(
                            `${action} ${student.firstName} ${student.lastName}?`
                          )
                        ) {
                          void toggleStudentStatus(
                            student
                          );
                        }
                      }}
                      className={[
                        "rounded-xl border px-4 py-2.5 text-sm font-black disabled:opacity-50",
                        student.isActive
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700",
                      ].join(" ")}
                    >
                      {busyId ===
                      student._id
                        ? "Updating…"
                        : student.isActive
                          ? "Disable"
                          : "Enable"}
                    </button>
                  </div>
                </div>
              </article>
            )
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
          loadStudents
        }
      />
    </div>
  );
}