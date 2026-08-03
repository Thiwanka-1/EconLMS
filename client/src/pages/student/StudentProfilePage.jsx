import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getUserById,
  updateUserById,
} from "../../api/userApi.js";

import {
  useAuth,
} from "../../auth/useAuth.js";

import StatusMessage from "../../components/common/StatusMessage.jsx";
import FormField from "../../components/forms/FormField.jsx";

const createProfileForm = (
  user = {}
) => ({
  firstName:
    user.firstName || "",

  lastName:
    user.lastName || "",

  school:
    user.school || "",

  mobileNumber:
    user.mobileNumber || "",

  city:
    user.city || "",

  address:
    user.address || "",

  zoomEmail:
    user.zoomEmail || "",
});

export default function StudentProfilePage() {
  const {
    user,
    refreshUser,
  } = useAuth();

  const [profile, setProfile] =
    useState(null);

  const [form, setForm] =
    useState(
      createProfileForm(user)
    );

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const loadProfile =
    useCallback(async () => {
      if (!user?._id) {
        return;
      }

      setError("");
      setIsLoading(true);

      try {
        const result =
          await getUserById(
            user._id
          );

        setProfile(result.user);

        setForm(
          createProfileForm(
            result.user
          )
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "Your profile could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }, [user?._id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
    setIsSubmitting(true);

    try {
      const result =
        await updateUserById(
          user._id,
          {
            firstName:
              form.firstName.trim(),

            lastName:
              form.lastName.trim(),

            school:
              form.school.trim(),

            mobileNumber:
              form.mobileNumber.trim(),

            city:
              form.city.trim(),

            address:
              form.address.trim(),

            zoomEmail:
              form.zoomEmail
                .trim()
                .toLowerCase(),
          }
        );

      setProfile(result.user);

      setForm(
        createProfileForm(
          result.user
        )
      );

      await refreshUser();

      setSuccess(
        result.message ||
          "Profile updated successfully."
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Your profile could not be updated."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-8 h-96 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
          Student account
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Profile details
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Keep your contact, school and
          Zoom information accurate.
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

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Account email
            </p>

            <p className="mt-2 break-all font-bold text-slate-950">
              {profile?.email || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              NIC number
            </p>

            <p className="mt-2 font-bold text-slate-950">
              {profile?.nicNumber ||
                "—"}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-500">
          Account email and NIC number
          cannot be changed from the
          student profile.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="firstName"
            label="First name"
            value={form.firstName}
            onChange={handleChange}
            autoComplete="given-name"
            required
            minLength={2}
            maxLength={50}
            disabled={isSubmitting}
          />

          <FormField
            id="lastName"
            label="Last name"
            value={form.lastName}
            onChange={handleChange}
            autoComplete="family-name"
            required
            minLength={2}
            maxLength={50}
            disabled={isSubmitting}
          />

          <FormField
            id="school"
            label="School"
            value={form.school}
            onChange={handleChange}
            autoComplete="organization"
            required
            maxLength={150}
            disabled={isSubmitting}
          />

          <FormField
            id="mobileNumber"
            label="Mobile number"
            type="tel"
            value={form.mobileNumber}
            onChange={handleChange}
            autoComplete="tel"
            inputMode="tel"
            required
            maxLength={20}
            disabled={isSubmitting}
          />

          <FormField
            id="city"
            label="City"
            value={form.city}
            onChange={handleChange}
            autoComplete="address-level2"
            required
            maxLength={100}
            disabled={isSubmitting}
          />

          <FormField
            id="zoomEmail"
            label="Zoom email"
            type="email"
            value={form.zoomEmail}
            onChange={handleChange}
            autoComplete="email"
            required
            maxLength={254}
            disabled={isSubmitting}
            helpText="Changing this may be restricted while registered live classes exist."
          />

          <div className="sm:col-span-2">
            <FormField
              id="address"
              label="Address"
              value={form.address}
              onChange={handleChange}
              autoComplete="street-address"
              required
              maxLength={300}
              disabled={isSubmitting}
              multiline
              rows={4}
            />
          </div>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-brand-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving profile…"
              : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
