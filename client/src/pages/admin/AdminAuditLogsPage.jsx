import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getAdminAuditLog,
  getAdminAuditLogs,
} from "../../api/auditLogApi.js";

import AdminPageHeader from "../../components/common/AdminPageHeader.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";

import {
  formatDateTime,
} from "../../utils/formatters.js";

const emptyFilters = {
  action: "",
  entityType: "",
  outcome: "",
  actorId: "",
  targetUserId: "",
  entityId: "",
  from: "",
  to: "",
};

const getStartOfDayIso = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  return Number.isNaN(
    date.getTime()
  )
    ? ""
    : date.toISOString();
};

const getEndOfDayIso = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      `${value}T23:59:59.999`
    );

  return Number.isNaN(
    date.getTime()
  )
    ? ""
    : date.toISOString();
};

const formatJson = (
  value
) => {
  try {
    return JSON.stringify(
      value || {},
      null,
      2
    );
  } catch {
    return "{}";
  }
};

const getActorName = (
  auditLog
) => {
  const actor =
    auditLog.actor;

  if (actor) {
    const fullName =
      `${actor.firstName || ""} ${actor.lastName || ""}`.trim();

    return (
      fullName ||
      actor.email ||
      auditLog.actorEmail ||
      "Unknown actor"
    );
  }

  return (
    auditLog.actorEmail ||
    "System"
  );
};

export default function AdminAuditLogsPage() {
  const [auditLogs, setAuditLogs] =
    useState([]);

  const [pagination, setPagination] =
    useState({
      page: 1,
      totalPages: 1,
      total: 0,
    });

  const [filters, setFilters] =
    useState(emptyFilters);

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(emptyFilters);

  const [
    selectedAuditLog,
    setSelectedAuditLog,
  ] = useState(null);

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isLoadingDetail,
    setIsLoadingDetail,
  ] = useState(false);

  const detailSectionRef =
    useRef(null);

  const loadAuditLogs =
    useCallback(
      async (page = 1) => {
        setError("");
        setIsLoading(true);

        try {
          const result =
            await getAdminAuditLogs({
              page,
              limit: 25,

              action:
                appliedFilters.action
                  .trim()
                  .toUpperCase(),

              entityType:
                appliedFilters.entityType
                  .trim(),

              outcome:
                appliedFilters.outcome,

              actorId:
                appliedFilters.actorId
                  .trim(),

              targetUserId:
                appliedFilters.targetUserId
                  .trim(),

              entityId:
                appliedFilters.entityId
                  .trim(),

              from:
                getStartOfDayIso(
                  appliedFilters.from
                ),

              to:
                getEndOfDayIso(
                  appliedFilters.to
                ),
            });

          setAuditLogs(
            result.auditLogs ||
              []
          );

          setPagination(
            result.pagination || {
              page,
              totalPages: 1,
              total: 0,
            }
          );
        } catch (requestError) {
          setError(
            requestError.message ||
              "Audit logs could not be loaded."
          );
        } finally {
          setIsLoading(false);
        }
      },
      [appliedFilters]
    );

  useEffect(() => {
    loadAuditLogs(1);
  }, [loadAuditLogs]);

  const openAuditLog =
    async (auditLogId) => {
      setError("");
      setIsLoadingDetail(true);

      try {
        const result =
          await getAdminAuditLog(
            auditLogId
          );

        setSelectedAuditLog(
          result.auditLog
        );

        window.setTimeout(() => {
          detailSectionRef.current
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        }, 50);
      } catch (requestError) {
        setError(
          requestError.message ||
            "Audit-log details could not be loaded."
        );
      } finally {
        setIsLoadingDetail(false);
      }
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

  const resetFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(
      emptyFilters
    );
    setSelectedAuditLog(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Security and operations"
        title="Audit logs"
        description="Inspect administrative actions, outcomes, affected entities and sanitized request metadata."
      />

      {error && (
        <div className="mt-7">
          <StatusMessage variant="error">
            {error}
          </StatusMessage>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();

          setSelectedAuditLog(
            null
          );

          setAppliedFilters({
            ...filters,
          });
        }}
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="action"
            value={filters.action}
            onChange={
              handleFilterChange
            }
            placeholder="Action, e.g. PAYMENT_APPROVED"
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />

          <input
            name="entityType"
            value={
              filters.entityType
            }
            onChange={
              handleFilterChange
            }
            placeholder="Entity type"
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />

          <select
            name="outcome"
            value={filters.outcome}
            onChange={
              handleFilterChange
            }
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
          >
            <option value="">
              All outcomes
            </option>

            <option value="success">
              Success
            </option>

            <option value="failure">
              Failure
            </option>
          </select>

          <input
            name="entityId"
            value={filters.entityId}
            onChange={
              handleFilterChange
            }
            placeholder="Entity ObjectId"
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />

          <input
            name="actorId"
            value={filters.actorId}
            onChange={
              handleFilterChange
            }
            placeholder="Actor ObjectId"
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />

          <input
            name="targetUserId"
            value={
              filters.targetUserId
            }
            onChange={
              handleFilterChange
            }
            placeholder="Target-user ObjectId"
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
              From
            </label>

            <input
              name="from"
              type="date"
              value={filters.from}
              onChange={
                handleFilterChange
              }
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
              To
            </label>

            <input
              name="to"
              type="date"
              value={filters.to}
              onChange={
                handleFilterChange
              }
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white"
          >
            Apply filters
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700"
          >
            Clear filters
          </button>
        </div>
      </form>

      <p className="mt-5 text-sm font-semibold text-slate-500">
        {pagination.total || 0}{" "}
        audit records
      </p>

      <div className="mt-6 grid gap-7 xl:grid-cols-[0.9fr_1.1fr]">
        <section>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-44 animate-pulse rounded-3xl bg-slate-200"
                />
              ))}
            </div>
          ) : auditLogs.length ===
            0 ? (
            <EmptyState
              title="No audit records"
              description="No audit records match the selected filters."
            />
          ) : (
            <div className="space-y-4">
              {auditLogs.map(
                (auditLog) => (
                  <button
                    key={auditLog._id}
                    type="button"
                    onClick={() =>
                      openAuditLog(
                        auditLog._id
                      )
                    }
                    className={[
                      "w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md",
                      selectedAuditLog
                        ?._id ===
                      auditLog._id
                        ? "border-brand-400 ring-4 ring-brand-100"
                        : "border-slate-200",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="break-all text-sm font-black text-slate-950">
                          {auditLog.action}
                        </p>

                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-brand-700">
                          {
                            auditLog.entityType
                          }
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          auditLog.outcome
                        }
                      />
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                      {
                        auditLog.description
                      }
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {getActorName(
                          auditLog
                        )}
                      </span>

                      <span>
                        {formatDateTime(
                          auditLog.createdAt
                        )}
                      </span>
                    </div>
                  </button>
                )
              )}
            </div>
          )}

          <Pagination
            currentPage={
              pagination.page
            }
            totalPages={
              pagination.totalPages
            }
            disabled={isLoading}
            onPageChange={
              loadAuditLogs
            }
          />
        </section>

        <section
          ref={detailSectionRef}
          className="h-fit scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {isLoadingDetail ? (
            <div className="h-[38rem] animate-pulse rounded-2xl bg-slate-200" />
          ) : !selectedAuditLog ? (
            <EmptyState
              title="Select an audit record"
              description="Choose an audit record to inspect its sanitized details."
            />
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-700">
                    Audit record
                  </p>

                  <h2 className="mt-2 break-all text-2xl font-black text-slate-950">
                    {
                      selectedAuditLog.action
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedAuditLog(
                      null
                    )
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-600"
                >
                  Close
                </button>
              </div>

              <div className="mt-5">
                <StatusBadge
                  status={
                    selectedAuditLog.outcome
                  }
                />
              </div>

              <p className="mt-5 whitespace-pre-line text-sm leading-6 text-slate-700">
                {
                  selectedAuditLog.description
                }
              </p>

              <dl className="mt-7 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Actor
                  </dt>

                  <dd className="mt-2 break-all font-bold text-slate-950">
                    {getActorName(
                      selectedAuditLog
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Actor role
                  </dt>

                  <dd className="mt-2 font-bold text-slate-950">
                    {selectedAuditLog
                      .actor?.role ||
                      selectedAuditLog.actorRole ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Entity type
                  </dt>

                  <dd className="mt-2 font-bold text-slate-950">
                    {
                      selectedAuditLog.entityType
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Entity ID
                  </dt>

                  <dd className="mt-2 break-all font-mono text-sm font-bold text-slate-950">
                    {selectedAuditLog.entityId ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Target user
                  </dt>

                  <dd className="mt-2 break-all font-bold text-slate-950">
                    {selectedAuditLog
                      .targetUser?.email ||
                      selectedAuditLog
                        .targetUser?._id ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Created
                  </dt>

                  <dd className="mt-2 font-bold text-slate-950">
                    {formatDateTime(
                      selectedAuditLog.createdAt
                    )}
                  </dd>
                </div>
              </dl>

              <div className="mt-7">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
                  Request
                </h3>

                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold text-slate-500">
                      Method
                    </dt>

                    <dd className="mt-1 break-all font-mono text-sm text-slate-950">
                      {selectedAuditLog
                        .request?.method ||
                        "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-bold text-slate-500">
                      Path
                    </dt>

                    <dd className="mt-1 break-all font-mono text-sm text-slate-950">
                      {selectedAuditLog
                        .request?.path ||
                        "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-bold text-slate-500">
                      Request ID
                    </dt>

                    <dd className="mt-1 break-all font-mono text-sm text-slate-950">
                      {selectedAuditLog
                        .request?.requestId ||
                        "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-bold text-slate-500">
                      IP address
                    </dt>

                    <dd className="mt-1 break-all font-mono text-sm text-slate-950">
                      {selectedAuditLog
                        .request?.ipAddress ||
                        "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-7">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
                  Sanitized metadata
                </h3>

                <pre className="mt-3 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-5 text-xs leading-6 text-slate-100">
                  {formatJson(
                    selectedAuditLog.metadata
                  )}
                </pre>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}