import {
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router";

import {
  resendVerificationCode,
} from "../../api/authApi.js";

import {
  useAuth,
} from "../../auth/useAuth.js";

import AuthPageShell from "../../components/common/AuthPageShell.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";
import FormField from "../../components/forms/FormField.jsx";

import {
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
  setPendingVerificationEmail,
} from "../../utils/authFlowStorage.js";

import {
  getRoleHome,
} from "../../utils/roleHome.js";

export default function VerifyEmailPage() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const {
    verifyEmail,
  } = useAuth();

  const [email, setEmail] =
    useState(() => {
      return (
        location.state?.email ||
        getPendingVerificationEmail()
      );
    });

  const [otp, setOtp] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState(
      location.state?.message || ""
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isResending,
    setIsResending,
  ] = useState(false);

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const normalizedEmail =
        email.trim().toLowerCase();

      const user =
        await verifyEmail({
          email: normalizedEmail,
          otp: otp.trim(),
        });

      clearPendingVerificationEmail();

      navigate(
        getRoleHome(user.role),
        {
          replace: true,
        }
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Email verification failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Enter your account email first."
      );

      return;
    }

    setError("");
    setMessage("");
    setIsResending(true);

    try {
      const result =
        await resendVerificationCode({
          email: normalizedEmail,
        });

      setPendingVerificationEmail(
        normalizedEmail
      );

      setMessage(result.message);
    } catch (requestError) {
      setError(
        requestError.message ||
          "A new verification code could not be requested."
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Email verification"
      title="Verify your email"
      description="Enter the verification code sent to your registered account email."
      footer={
        <p>
          Already verified?{" "}
          <Link
            to="/login"
            className="font-black text-brand-700 hover:text-brand-900"
          >
            Return to sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {message && (
          <StatusMessage variant="success">
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

            setPendingVerificationEmail(
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
          label="Verification code"
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

        <button
          type="submit"
          disabled={
            isSubmitting ||
            isResending
          }
          className="w-full rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Verifying…"
            : "Verify email"}
        </button>
      </form>

      <div className="mt-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold text-slate-800">
          Did not receive the code?
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Check the spam folder, confirm
          the email above, then request
          another code.
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={
            isResending ||
            isSubmitting
          }
          className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-black text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending
            ? "Requesting…"
            : "Resend verification code"}
        </button>
      </div>
    </AuthPageShell>
  );
}
