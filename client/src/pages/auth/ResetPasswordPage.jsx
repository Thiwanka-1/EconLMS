import {
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router";

import {
  resetUserPassword,
} from "../../api/authApi.js";

import AuthPageShell from "../../components/common/AuthPageShell.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";
import FormField from "../../components/forms/FormField.jsx";
import PasswordField from "../../components/forms/PasswordField.jsx";

import {
  clearPendingResetEmail,
  getPendingResetEmail,
  setPendingResetEmail,
} from "../../utils/authFlowStorage.js";

export default function ResetPasswordPage() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState(() => {
      return (
        location.state?.email ||
        getPendingResetEmail()
      );
    });

  const [otp, setOtp] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [message] = useState(
    location.state?.message || ""
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (
      password !== confirmPassword
    ) {
      setError(
        "Password and confirm password do not match."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedEmail =
        email.trim().toLowerCase();

      const result =
        await resetUserPassword({
          email: normalizedEmail,
          otp: otp.trim(),
          password,
          confirmPassword,
        });

      clearPendingResetEmail();

      navigate("/login", {
        replace: true,
        state: {
          email: normalizedEmail,
          message: result.message,
        },
      });
    } catch (requestError) {
      setError(
        requestError.message ||
          "Password reset failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter the code sent to your email and choose a new password."
      footer={
        <p>
          Need a new code?{" "}
          <Link
            to="/forgot-password"
            className="font-black text-brand-700 hover:text-brand-900"
          >
            Request another reset code
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {message && (
          <StatusMessage>
            {message}
          </StatusMessage>
        )}

        {error && (
          <StatusMessage variant="error">
            {error}
          </StatusMessage>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-7 max-w-xl space-y-5"
      >
        <FormField
          id="email"
          label="Account email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(
              event.target.value
            );

            setPendingResetEmail(
              event.target.value
            );
          }}
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={isSubmitting}
        />

        <FormField
          id="otp"
          label="Password-reset code"
          value={otp}
          onChange={(event) =>
            setOtp(event.target.value)
          }
          autoComplete="one-time-code"
          inputMode="numeric"
          placeholder="Enter the code"
          required
          disabled={isSubmitting}
          maxLength={12}
        />

        <PasswordField
          id="password"
          label="New password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value
            )
          }
          autoComplete="new-password"
          placeholder="Minimum 8 characters"
          disabled={isSubmitting}
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(
              event.target.value
            )
          }
          autoComplete="new-password"
          placeholder="Repeat the new password"
          disabled={isSubmitting}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Resetting password…"
            : "Reset password"}
        </button>
      </form>
    </AuthPageShell>
  );
}
