import {
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router";

import {
  useAuth,
} from "../../auth/useAuth.js";

import AuthPageShell from "../../components/common/AuthPageShell.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";
import FormField from "../../components/forms/FormField.jsx";
import PasswordField from "../../components/forms/PasswordField.jsx";

import {
  setPendingVerificationEmail,
} from "../../utils/authFlowStorage.js";

import {
  getRoleHome,
} from "../../utils/roleHome.js";

export default function LoginPage() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const {
    login,
  } = useAuth();

  const [form, setForm] =
    useState({
      email:
        location.state?.email || "",
      password: "",
    });

  const [error, setError] =
    useState("");

  const [
    requiresVerification,
    setRequiresVerification,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const successMessage =
    location.state?.message || "";

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
    setRequiresVerification(false);
    setIsSubmitting(true);

    try {
      const user = await login({
        email:
          form.email
            .trim()
            .toLowerCase(),
        password: form.password,
      });

      navigate(
        getRoleHome(user.role),
        {
          replace: true,
        }
      );
    } catch (requestError) {
      const requestMessage =
        requestError.message ||
        "Sign in failed.";

      setError(requestMessage);

      if (
        requestError.status === 403 &&
        /verify your email/i.test(
          requestMessage
        )
      ) {
        setPendingVerificationEmail(
          form.email
            .trim()
            .toLowerCase()
        );

        setRequiresVerification(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Welcome back"
      title="Sign in"
      description="Enter your registered email and password to access EconLLS."
      footer={
        <p>
          New to EconLLS?{" "}
          <Link
            to="/signup"
            className="font-black text-brand-700 hover:text-brand-900"
          >
            Create a student account
          </Link>
        </p>
      }
    >
      <div className="max-w-xl space-y-4">
        {successMessage && (
          <StatusMessage variant="success">
            {successMessage}
          </StatusMessage>
        )}

        {error && (
          <StatusMessage variant="error">
            {error}
          </StatusMessage>
        )}

        {requiresVerification && (
          <StatusMessage>
            <Link
              to="/verify-email"
              className="font-black underline underline-offset-2"
            >
              Open email verification
            </Link>
          </StatusMessage>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-7 max-w-xl space-y-5"
      >
        <FormField
          id="email"
          label="Email address"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={isSubmitting}
        />

        <PasswordField
          id="password"
          label="Password"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          placeholder="Enter your password"
          disabled={isSubmitting}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-black text-brand-700 transition hover:text-brand-900"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-brand-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Signing in…"
            : "Sign in"}
        </button>
      </form>
    </AuthPageShell>
  );
}
