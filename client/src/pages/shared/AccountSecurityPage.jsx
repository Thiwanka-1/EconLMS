import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  changeUserPassword,
  getMyAuthSessions,
  revokeAuthSession,
  revokeOtherAuthSessions,
} from "../../api/authApi.js";

import StatusMessage from "../../components/common/StatusMessage.jsx";
import PasswordField from "../../components/forms/PasswordField.jsx";

const formatDateTime = (value) => {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getSessionIcon = (operatingSystem = "") => {
  return /android|ios/i.test(operatingSystem) ? "M" : "D";
};

export default function AccountSecurityPage() {
  const [form, setForm] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });

  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState("");

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);

    try {
      const result = await getMyAuthSessions();
      setSessions(result.sessions || []);
    } catch (requestError) {
      setError(requestError.message || "Login sessions could not be loaded.");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    if (form.currentPassword === form.password) {
      setError("The new password must be different from the current password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await changeUserPassword(form);
      setForm({ currentPassword: "", password: "", confirmPassword: "" });
      setSuccess(result.message || "Password changed successfully.");
      await loadSessions();
    } catch (requestError) {
      setError(requestError.message || "The password could not be changed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeSession = async (session) => {
    if (!window.confirm(`Sign out ${session.deviceName || "this device"}?`)) {
      return;
    }

    setError("");
    setSuccess("");
    setRevokingSessionId(session._id);

    try {
      const result = await revokeAuthSession(session._id);
      setSuccess(result.message);
      setSessions((current) => current.filter((item) => item._id !== session._id));
    } catch (requestError) {
      setError(requestError.message || "The device could not be signed out.");
    } finally {
      setRevokingSessionId("");
    }
  };

  const handleRevokeOthers = async () => {
    if (!window.confirm("Sign out every other device connected to this account?")) {
      return;
    }

    setError("");
    setSuccess("");
    setRevokingSessionId("all");

    try {
      const result = await revokeOtherAuthSessions();
      setSuccess(result.message);
      setSessions((current) => current.filter((session) => session.isCurrent));
    } catch (requestError) {
      setError(requestError.message || "Other devices could not be signed out.");
    } finally {
      setRevokingSessionId("");
    }
  };

  const otherSessionCount = sessions.filter((session) => !session.isCurrent).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
          Account security
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Password and devices
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Update your password and review every device currently signed in to your account.
        </p>
      </div>

      <div className="mt-8 space-y-4" aria-live="polite">
        {error && <StatusMessage variant="error">{error}</StatusMessage>}
        {success && <StatusMessage variant="success">{success}</StatusMessage>}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <h2 className="text-xl font-black text-slate-950">Change password</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Changing it signs out every other device while keeping this one active.
            </p>
          </div>

          <PasswordField
            id="currentPassword"
            label="Current password"
            value={form.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
            placeholder="Enter current password"
            disabled={isSubmitting}
          />

          <PasswordField
            id="password"
            label="New password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            disabled={isSubmitting}
            helpText="Use at least 8 characters and do not reuse your current password."
          />

          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="Repeat new password"
            disabled={isSubmitting}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Changing password…" : "Change password"}
          </button>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Logged-in devices</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                If you do not recognize a device, sign it out and change your password.
              </p>
            </div>

            {otherSessionCount > 0 && (
              <button
                type="button"
                onClick={handleRevokeOthers}
                disabled={Boolean(revokingSessionId)}
                className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                {revokingSessionId === "all" ? "Signing out…" : "Sign out others"}
              </button>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {sessionsLoading ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                Loading your devices…
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                No active login sessions were found.
              </div>
            ) : (
              sessions.map((session) => (
                <article
                  key={session._id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                    {getSessionIcon(session.operatingSystem)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">
                        {session.deviceName || "Unknown device"}
                      </h3>
                      {session.isCurrent && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Last active {formatDateTime(session.lastSeenAt)} · Signed in {formatDateTime(session.createdAt)}
                    </p>
                  </div>

                  {!session.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session)}
                      disabled={Boolean(revokingSessionId)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      {revokingSessionId === session._id ? "Signing out…" : "Sign out"}
                    </button>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
