import {
  useState,
} from "react";

import {
  changeUserPassword,
} from "../../api/authApi.js";

import StatusMessage from "../../components/common/StatusMessage.jsx";
import PasswordField from "../../components/forms/PasswordField.jsx";

export default function StudentSecurityPage() {
  const [form, setForm] =
    useState({
      currentPassword: "",
      password: "",
      confirmPassword: "",
    });

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        "Password and confirm password do not match."
      );

      return;
    }

    if (
      form.currentPassword ===
      form.password
    ) {
      setError(
        "The new password must be different from the current password."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        await changeUserPassword({
          currentPassword:
            form.currentPassword,

          password:
            form.password,

          confirmPassword:
            form.confirmPassword,
        });

      setForm({
        currentPassword: "",
        password: "",
        confirmPassword: "",
      });

      setSuccess(
        result.message ||
          "Password changed successfully."
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "The password could not be changed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
          Account security
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Change password
        </h1>

        <p className="mt-3 leading-7 text-slate-600">
          Changing your password revokes
          your other existing login
          sessions.
        </p>
      </div>

      <div className="mt-8 space-y-4">
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
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <PasswordField
          id="currentPassword"
          label="Current password"
          value={
            form.currentPassword
          }
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
          value={
            form.confirmPassword
          }
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
          {isSubmitting
            ? "Changing password…"
            : "Change password"}
        </button>
      </form>
    </div>
  );
}
