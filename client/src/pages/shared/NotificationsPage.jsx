import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  getMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "../../api/notificationApi.js";

import {
  useAuth,
} from "../../auth/useAuth.js";

import AdminPageHeader from "../../components/common/AdminPageHeader.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";

import {
  formatDateTime,
} from "../../utils/formatters.js";

const notificationTypes = [
  {
    value: "",
    label: "All notification types",
  },
  {
    value: "payment_approved",
    label: "Payment approved",
  },
  {
    value: "payment_rejected",
    label: "Payment rejected",
  },
  {
    value: "payment_submitted",
    label: "Payment submitted",
  },
  {
    value: "nic_verified",
    label: "NIC verified",
  },
  {
    value: "nic_rejected",
    label: "NIC rejected",
  },
  {
    value: "nic_submitted",
    label: "NIC submitted",
  },
  {
    value: "student_registered",
    label: "Student registered",
  },
  {
    value: "payment_reminder",
    label: "Payment reminder",
  },
  {
    value: "system",
    label: "System",
  },
];

const isSafeInternalPath = (
  value
) => {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  );
};

const getTypeLabel = (
  type
) => {
  return String(
    type || "system"
  )
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
};

const getNotificationActionUrl = ({ notification, role }) => {
  const type = notification?.type;

  if (role === "student") {
    if (["nic_verified", "nic_rejected", "nic_submitted"].includes(type)) {
      return "/student/nic";
    }

    if (
      [
        "payment_approved",
        "payment_rejected",
        "payment_submitted",
        "payment_reminder",
      ].includes(type)
    ) {
      return "/student/payments";
    }
  }

  if (role === "admin") {
    if (type === "payment_submitted") {
      return isSafeInternalPath(notification?.actionUrl) &&
        notification.actionUrl.startsWith("/admin/payments")
        ? notification.actionUrl
        : "/admin/payments";
    }

    if (["nic_submitted", "student_registered"].includes(type)) {
      const studentId = notification?.data?.studentId;

      return studentId
        ? `/admin/students/${encodeURIComponent(studentId)}`
        : "/admin/students";
    }
  }

  return isSafeInternalPath(notification?.actionUrl)
    ? notification.actionUrl
    : "";
};

export default function NotificationsPage() {
  const {
    user,
  } = useAuth();

  const navigate =
    useNavigate();

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [pagination, setPagination] =
    useState({
      page: 1,
      totalPages: 1,
      total: 0,
    });

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [filters, setFilters] =
    useState({
      unreadOnly: false,
      type: "",
    });

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState("");

  const loadNotifications =
    useCallback(
      async (page = 1) => {
        setError("");
        setIsLoading(true);

        try {
          const result =
            await getMyNotifications({
              page,
              limit: 20,

              unreadOnly:
                filters.unreadOnly,

              type:
                filters.type,
            });

          setNotifications(
            result.notifications ||
              []
          );

          setPagination(
            result.pagination || {
              page,
              totalPages: 1,
              total: 0,
            }
          );

          setUnreadCount(
            Number(
              result.unreadCount || 0
            )
          );
        } catch (requestError) {
          setError(
            requestError.message ||
              "Notifications could not be loaded."
          );
        } finally {
          setIsLoading(false);
        }
      },
      [filters]
    );

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  const markRead =
    async (notification) => {
      if (notification.isRead) {
        return notification;
      }

      setBusyId(notification._id);
      setError("");

      try {
        const result =
          await markMyNotificationRead(
            notification._id
          );

        const updated =
          result.notification;

        setNotifications(
          (current) =>
            current.map(
              (item) =>
                item._id ===
                updated._id
                  ? updated
                  : item
            )
        );

        setUnreadCount(
          (current) =>
            Math.max(
              current - 1,
              0
            )
        );

        return updated;
      } catch (requestError) {
        setError(
          requestError.message ||
            "The notification could not be marked as read."
        );

        return null;
      } finally {
        setBusyId("");
      }
    };

  const openNotification =
    async (notification) => {
      const updated =
        await markRead(
          notification
        );

      if (!updated) {
        return;
      }

      const destination = getNotificationActionUrl({
        notification: updated,
        role: user?.role,
      });

      if (destination) {
        navigate(destination);
      }
    };

  const markAllRead =
    async () => {
      setBusyId("read-all");
      setError("");
      setSuccess("");

      try {
        const result =
          await markAllMyNotificationsRead();

        setSuccess(
          result.message ||
            "All notifications were marked as read."
        );

        await loadNotifications(
          pagination.page
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "Notifications could not be updated."
        );
      } finally {
        setBusyId("");
      }
    };

  const isAdmin =
    user?.role === "admin";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow={
          isAdmin
            ? "Administrator account"
            : "Student account"
        }
        title="Notifications"
        description="Review payment, NIC and system notifications associated with your account."
        action={
          <div className="flex items-center gap-3">
            <StatusBadge
              status={
                unreadCount > 0
                  ? "pending"
                  : "active"
              }
              label={`${unreadCount} unread`}
            />

            <button
              type="button"
              disabled={
                unreadCount === 0 ||
                busyId ===
                  "read-all"
              }
              onClick={markAllRead}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busyId ===
              "read-all"
                ? "Updating…"
                : "Mark all read"}
            </button>
          </div>
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

      <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            checked={
              filters.unreadOnly
            }
            onChange={(event) =>
              setFilters(
                (current) => ({
                  ...current,

                  unreadOnly:
                    event.target
                      .checked,
                })
              )
            }
            className="h-5 w-5 rounded border-slate-300"
          />

          Unread only
        </label>

        <select
          value={filters.type}
          onChange={(event) =>
            setFilters(
              (current) => ({
                ...current,
                type:
                  event.target.value,
              })
            )
          }
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800"
        >
          {notificationTypes.map(
            (option) => (
              <option
                key={
                  option.value ||
                  "all"
                }
                value={option.value}
              >
                {option.label}
              </option>
            )
          )}
        </select>
      </section>

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
      ) : notifications.length ===
        0 ? (
        <div className="mt-7">
          <EmptyState
            title="No notifications"
            description={
              filters.unreadOnly
                ? "There are no unread notifications matching the selected type."
                : "There are no notifications matching the selected type."
            }
          />
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {notifications.map(
            (notification) => {
              const hasAction =
                Boolean(
                  getNotificationActionUrl({
                    notification,
                    role: user?.role,
                  })
                );

              return (
                <article
                  key={
                    notification._id
                  }
                  className={[
                    "rounded-3xl border bg-white p-6 shadow-sm transition sm:p-7",
                    notification.isRead
                      ? "border-slate-200"
                      : "border-brand-300 ring-4 ring-brand-50",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          status={
                            notification.isRead
                              ? "inactive"
                              : "pending"
                          }
                          label={
                            notification.isRead
                              ? "Read"
                              : "Unread"
                          }
                        />

                        <StatusBadge
                          status="active"
                          label={getTypeLabel(
                            notification.type
                          )}
                        />
                      </div>

                      <h2 className="mt-4 text-xl font-black text-slate-950">
                        {
                          notification.title
                        }
                      </h2>

                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {
                          notification.message
                        }
                      </p>

                      <p className="mt-4 text-xs font-semibold text-slate-500">
                        {formatDateTime(
                          notification.createdAt
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!notification.isRead && (
                        <button
                          type="button"
                          disabled={
                            busyId ===
                            notification._id
                          }
                          onClick={() =>
                            markRead(
                              notification
                            )
                          }
                          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50"
                        >
                          {busyId ===
                          notification._id
                            ? "Updating…"
                            : "Mark read"}
                        </button>
                      )}

                      {hasAction && (
                        <button
                          type="button"
                          disabled={
                            busyId ===
                            notification._id
                          }
                          onClick={() =>
                            openNotification(
                              notification
                            )
                          }
                          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                        >
                          Open
                        </button>
                      )}
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
          pagination.page
        }
        totalPages={
          pagination.totalPages
        }
        disabled={isLoading}
        onPageChange={
          loadNotifications
        }
      />
    </div>
  );
}
