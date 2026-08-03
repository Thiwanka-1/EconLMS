import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import {
  requestPasswordReset,
} from "../../api/authApi.js";

import AuthPageShell from "../../components/common/AuthPageShell.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";
import FormField from "../../components/forms/FormField.jsx";

import {
  setPendingResetEmail,
} from "../../utils/authFlowStorage.js";

export default function ForgotPasswordPage() {
  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState("");

  const [error, setError] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const normalizedEmail =
        email.trim().toLowerCase();

      const result =
        await requestPasswordReset({
          email: normalizedEmail,
        });

      setPendingResetEmail(
        normalizedEmail
      );

      navigate("/reset-password", {
        state: {
          email: normalizedEmail,
          message: result.message,
        },
      });
    } catch (requestError) {
      setError(
        requestError.message ||
          "Password reset could not be requested."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Account recovery"
      title="Forgot your password?"
      description="Enter your registered email. If an eligible account exists, a password-reset code will be sent."
      footer={
        <p>
          Remembered your password?{" "}
          <Link
            to="/login"
            className="font-black text-brand-700 hover:text-brand-900"
          >
            Return to sign in
          </Link>
        </p>
      }
    >
      {error && (
        <StatusMessage variant="error">
          {error}
        </StatusMessage>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-7 max-w-xl space-y-5"
      >
        <FormField
          id="email"
          label="Account email"
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value
            )
          }
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={isSubmitting}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Requesting code…"
            : "Send password-reset code"}
        </button>
      </form>
    </AuthPageShell>
  );
}
