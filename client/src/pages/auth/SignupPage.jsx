import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import {
  signupUser,
} from "../../api/authApi.js";

import {
  getPublicPlatformSettings,
} from "../../api/settingsApi.js";

import AuthPageShell from "../../components/common/AuthPageShell.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";
import FormField from "../../components/forms/FormField.jsx";
import PasswordField from "../../components/forms/PasswordField.jsx";

import {
  setPendingVerificationEmail,
} from "../../utils/authFlowStorage.js";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  zoomEmail: "",
  mobileNumber: "",
  nicNumber: "",
  school: "",
  city: "",
  address: "",
  password: "",
  confirmPassword: "",
};

export default function SignupPage() {
  const navigate =
    useNavigate();

  const [form, setForm] =
    useState(initialForm);

  const [error, setError] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isSettingsLoading,
    setIsSettingsLoading,
  ] = useState(true);

  const [
    registration,
    setRegistration,
  ] = useState(null);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        const result =
          await getPublicPlatformSettings();

        if (active) {
          setRegistration(
            result.settings
              ?.registration || null
          );
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.message ||
              "Registration settings could not be loaded."
          );
        }
      } finally {
        if (active) {
          setIsSettingsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  const registrationClosed =
    registration?.isOpen === false;

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

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        "Password and confirm password do not match."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedEmail =
        form.email.trim().toLowerCase();

      const result =
        await signupUser({
          firstName:
            form.firstName.trim(),
          lastName:
            form.lastName.trim(),
          email: normalizedEmail,
          zoomEmail:
            form.zoomEmail
              .trim()
              .toLowerCase(),
          mobileNumber:
            form.mobileNumber.trim(),
          nicNumber:
            form.nicNumber
              .trim()
              .toUpperCase(),
          school:
            form.school.trim(),
          city:
            form.city.trim(),
          address:
            form.address.trim(),
          password: form.password,
          confirmPassword:
            form.confirmPassword,
        });

      setPendingVerificationEmail(
        normalizedEmail
      );

      navigate("/verify-email", {
        replace: true,
        state: {
          email: normalizedEmail,
          message: result.message,
        },
      });
    } catch (requestError) {
      setError(
        requestError.message ||
          "Account creation failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formDisabled =
    isSubmitting ||
    isSettingsLoading ||
    registrationClosed;

  return (
    <AuthPageShell
      eyebrow="Student registration"
      title="Create your account"
      description="Register using your student and contact information. An email verification code will be sent before you can sign in."
      footer={
        <p>
          Already registered?{" "}
          <Link
            to="/login"
            className="font-black text-brand-700 hover:text-brand-900"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-5">
        {error && (
          <StatusMessage variant="error">
            {error}
          </StatusMessage>
        )}

        {registrationClosed && (
          <StatusMessage variant="warning">
            {registration.closedMessage ||
              "Student registration is currently closed."}
          </StatusMessage>
        )}

        {isSettingsLoading && (
          <StatusMessage>
            Checking registration
            availability…
          </StatusMessage>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-8"
      >
        <section>
          <h3 className="text-lg font-black text-slate-950">
            Personal details
          </h3>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FormField
              id="firstName"
              label="First name"
              value={form.firstName}
              onChange={handleChange}
              autoComplete="given-name"
              placeholder="First name"
              required
              disabled={formDisabled}
              minLength={2}
              maxLength={50}
            />

            <FormField
              id="lastName"
              label="Last name"
              value={form.lastName}
              onChange={handleChange}
              autoComplete="family-name"
              placeholder="Last name"
              required
              disabled={formDisabled}
              minLength={2}
              maxLength={50}
            />

            <FormField
              id="nicNumber"
              label="NIC number"
              value={form.nicNumber}
              onChange={handleChange}
              placeholder="NIC number"
              required
              disabled={formDisabled}
              maxLength={20}
            />

            <FormField
              id="mobileNumber"
              label="Mobile number"
              type="tel"
              value={form.mobileNumber}
              onChange={handleChange}
              autoComplete="tel"
              inputMode="tel"
              placeholder="Mobile number"
              required
              disabled={formDisabled}
              maxLength={20}
            />
          </div>
        </section>

        <section>
          <h3 className="text-lg font-black text-slate-950">
            Contact and education
          </h3>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FormField
              id="email"
              label="Account email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="you@example.com"
              required
              disabled={formDisabled}
              maxLength={254}
              helpText="Verification and account emails will be sent here."
            />

            <FormField
              id="zoomEmail"
              label="Zoom email"
              type="email"
              value={form.zoomEmail}
              onChange={handleChange}
              autoComplete="email"
              placeholder="zoom@example.com"
              required
              disabled={formDisabled}
              maxLength={254}
              helpText="Use the email connected to your Zoom account."
            />

            <FormField
              id="school"
              label="School"
              value={form.school}
              onChange={handleChange}
              autoComplete="organization"
              placeholder="School name"
              required
              disabled={formDisabled}
              maxLength={150}
            />

            <FormField
              id="city"
              label="City"
              value={form.city}
              onChange={handleChange}
              autoComplete="address-level2"
              placeholder="City"
              required
              disabled={formDisabled}
              maxLength={100}
            />

            <div className="sm:col-span-2">
              <FormField
                id="address"
                label="Address"
                value={form.address}
                onChange={handleChange}
                autoComplete="street-address"
                placeholder="Residential address"
                required
                disabled={formDisabled}
                maxLength={300}
                multiline
                rows={3}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-black text-slate-950">
            Password
          </h3>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <PasswordField
              id="password"
              label="Password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              disabled={formDisabled}
              helpText="Use at least 8 characters."
            />

            <PasswordField
              id="confirmPassword"
              label="Confirm password"
              value={
                form.confirmPassword
              }
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="Repeat password"
              disabled={formDisabled}
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={formDisabled}
          className="w-full rounded-2xl bg-brand-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Creating account…"
            : "Create student account"}
        </button>
      </form>
    </AuthPageShell>
  );
}
