import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAdminPlatformSettings,
  updateAdminPlatformSettings,
} from "../../api/platformSettingsAdminApi.js";

import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

import AdminPageHeader from "../../components/common/AdminPageHeader.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";
import FormField from "../../components/forms/FormField.jsx";

import {
  formatDateTime,
} from "../../utils/formatters.js";

const emptyForm = {
  branding: {
    platformName: "",
    tagline: "",
  },

  contact: {
    supportEmail: "",
    supportPhone: "",
    whatsappNumber: "",
  },

  registration: {
    isOpen: true,
    closedMessage: "",
  },

  maintenanceNotice: {
    enabled: false,
    message: "",
  },

  paymentDetails: {
    bankName: "",
    accountName: "",
    accountNumber: "",
    branchName: "",
    instructions: "",
    paymentReferenceNote: "",
  },

  learning: {
    defaultLessonMaxViews: "2",
  },

  liveClasses: {
    defaultJoinBeforeMinutes:
      "30",

    defaultJoinAfterMinutes:
      "15",
  },
};

const normalizeSettings = (
  settings = {}
) => {
  return {
    branding: {
      platformName:
        settings.branding
          ?.platformName || "",

      tagline:
        settings.branding
          ?.tagline || "",
    },

    contact: {
      supportEmail:
        settings.contact
          ?.supportEmail || "",

      supportPhone:
        settings.contact
          ?.supportPhone || "",

      whatsappNumber:
        settings.contact
          ?.whatsappNumber || "",
    },

    registration: {
      isOpen:
        settings.registration
          ?.isOpen !== false,

      closedMessage:
        settings.registration
          ?.closedMessage || "",
    },

    maintenanceNotice: {
      enabled:
        Boolean(
          settings
            .maintenanceNotice
            ?.enabled
        ),

      message:
        settings
          .maintenanceNotice
          ?.message || "",
    },

    paymentDetails: {
      bankName:
        settings.paymentDetails
          ?.bankName || "",

      accountName:
        settings.paymentDetails
          ?.accountName || "",

      accountNumber:
        settings.paymentDetails
          ?.accountNumber || "",

      branchName:
        settings.paymentDetails
          ?.branchName || "",

      instructions:
        settings.paymentDetails
          ?.instructions || "",

      paymentReferenceNote:
        settings.paymentDetails
          ?.paymentReferenceNote ||
        "",
    },

    learning: {
      defaultLessonMaxViews:
        String(
          settings.learning
            ?.defaultLessonMaxViews ??
            2
        ),
    },

    liveClasses: {
      defaultJoinBeforeMinutes:
        String(
          settings.liveClasses
            ?.defaultJoinBeforeMinutes ??
            30
        ),

      defaultJoinAfterMinutes:
        String(
          settings.liveClasses
            ?.defaultJoinAfterMinutes ??
            15
        ),
    },
  };
};

const SettingsSection = ({
  title,
  description,
  children,
}) => {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-black text-slate-950">
        {title}
      </h2>

      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      )}

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
};

export default function AdminSettingsPage() {
  const {
    applySettings,
  } = usePlatformSettings();

  const [form, setForm] =
    useState(emptyForm);

  const [
    settingsMetadata,
    setSettingsMetadata,
  ] = useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const loadSettings =
    useCallback(async () => {
      setError("");
      setIsLoading(true);

      try {
        const result =
          await getAdminPlatformSettings();

        applySettings(
          result.settings
        );

        setForm(
          normalizeSettings(
            result.settings
          )
        );

        setSettingsMetadata(
          result.settings
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "Platform settings could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }, [applySettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateField = (
    section,
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,

      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const handleInputChange = (
    section
  ) => {
    return (event) => {
      const {
        name,
        value,
        checked,
        type,
      } = event.target;

      updateField(
        section,
        name,
        type === "checkbox"
          ? checked
          : value
      );
    };
  };

  const handleSave = async (
    event
  ) => {
    event.preventDefault();

    const defaultMaxViews =
      Number(
        form.learning
          .defaultLessonMaxViews
      );

    const joinBefore =
      Number(
        form.liveClasses
          .defaultJoinBeforeMinutes
      );

    const joinAfter =
      Number(
        form.liveClasses
          .defaultJoinAfterMinutes
      );

    if (
      !Number.isInteger(
        defaultMaxViews
      ) ||
      defaultMaxViews < 1 ||
      defaultMaxViews > 100
    ) {
      setError(
        "Default lesson views must be a whole number between 1 and 100."
      );

      return;
    }

    if (
      !Number.isInteger(
        joinBefore
      ) ||
      joinBefore < 0 ||
      joinBefore > 1440
    ) {
      setError(
        "Default join-before time must be a whole number between 0 and 1440."
      );

      return;
    }

    if (
      !Number.isInteger(
        joinAfter
      ) ||
      joinAfter < 0 ||
      joinAfter > 1440
    ) {
      setError(
        "Default join-after time must be a whole number between 0 and 1440."
      );

      return;
    }

    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const result =
        await updateAdminPlatformSettings(
          {
            branding: {
              platformName:
                form.branding
                  .platformName
                  .trim(),

              tagline:
                form.branding
                  .tagline
                  .trim(),
            },

            contact: {
              supportEmail:
                form.contact
                  .supportEmail
                  .trim(),

              supportPhone:
                form.contact
                  .supportPhone
                  .trim(),

              whatsappNumber:
                form.contact
                  .whatsappNumber
                  .trim(),
            },

            registration: {
              isOpen:
                form.registration
                  .isOpen,

              closedMessage:
                form.registration
                  .closedMessage
                  .trim(),
            },

            maintenanceNotice: {
              enabled:
                form
                  .maintenanceNotice
                  .enabled,

              message:
                form
                  .maintenanceNotice
                  .message
                  .trim(),
            },

            paymentDetails: {
              bankName:
                form.paymentDetails
                  .bankName
                  .trim(),

              accountName:
                form.paymentDetails
                  .accountName
                  .trim(),

              accountNumber:
                form.paymentDetails
                  .accountNumber
                  .trim(),

              branchName:
                form.paymentDetails
                  .branchName
                  .trim(),

              instructions:
                form.paymentDetails
                  .instructions
                  .trim(),

              paymentReferenceNote:
                form.paymentDetails
                  .paymentReferenceNote
                  .trim(),
            },

            learning: {
              defaultLessonMaxViews:
                defaultMaxViews,
            },

            liveClasses: {
              defaultJoinBeforeMinutes:
                joinBefore,

              defaultJoinAfterMinutes:
                joinAfter,
            },
          }
        );

      applySettings(
        result.settings
      );

      setForm(
        normalizeSettings(
          result.settings
        )
      );

      setSettingsMetadata(
        result.settings
      );

      setSuccess(
        result.message ||
          "Platform settings were updated."
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Platform settings could not be saved."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-80 animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-8 h-[50rem] animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <AdminPageHeader
        eyebrow="Platform administration"
        title="Platform settings"
        description="Manage public branding, registration, maintenance notices, student payment instructions and learning defaults."
        action={
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-2xl bg-brand-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving
              ? "Saving settings…"
              : "Save all settings"}
          </button>
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

      {settingsMetadata
        ?.updatedAt && (
        <p className="mt-5 text-sm text-slate-500">
          Last updated{" "}
          {formatDateTime(
            settingsMetadata.updatedAt
          )}
          {settingsMetadata.updatedBy
            ? ` by ${settingsMetadata.updatedBy.firstName || ""} ${settingsMetadata.updatedBy.lastName || ""}`
            : ""}
        </p>
      )}

      <div className="mt-8 space-y-7">
        <SettingsSection
          title="Branding"
          description="These values are displayed on public and authenticated AccountingLMS pages."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="platformName"
              label="Platform name"
              value={
                form.branding
                  .platformName
              }
              onChange={handleInputChange(
                "branding"
              )}
              required
              disabled={isSaving}
            />

            <FormField
              id="tagline"
              label="Tagline"
              value={
                form.branding
                  .tagline
              }
              onChange={handleInputChange(
                "branding"
              )}
              disabled={isSaving}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Support contacts"
          description="Public support channels shown to students and visitors."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              id="supportEmail"
              label="Support email"
              type="email"
              value={
                form.contact
                  .supportEmail
              }
              onChange={handleInputChange(
                "contact"
              )}
              disabled={isSaving}
            />

            <FormField
              id="supportPhone"
              label="Support phone"
              value={
                form.contact
                  .supportPhone
              }
              onChange={handleInputChange(
                "contact"
              )}
              disabled={isSaving}
            />

            <FormField
              id="whatsappNumber"
              label="WhatsApp number"
              value={
                form.contact
                  .whatsappNumber
              }
              onChange={handleInputChange(
                "contact"
              )}
              disabled={isSaving}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Student registration"
          description="Closing registration prevents new student signups while leaving existing accounts available."
        >
          <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <input
              name="isOpen"
              type="checkbox"
              checked={
                form.registration
                  .isOpen
              }
              onChange={handleInputChange(
                "registration"
              )}
              disabled={isSaving}
              className="h-5 w-5 rounded border-slate-300"
            />

            Student registration is
            open
          </label>

          <div className="mt-5">
            <FormField
              id="closedMessage"
              label="Registration closed message"
              value={
                form.registration
                  .closedMessage
              }
              onChange={handleInputChange(
                "registration"
              )}
              multiline
              rows={3}
              disabled={isSaving}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Maintenance notice"
          description="Display a platform-wide informational notice without disabling access."
        >
          <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <input
              name="enabled"
              type="checkbox"
              checked={
                form
                  .maintenanceNotice
                  .enabled
              }
              onChange={handleInputChange(
                "maintenanceNotice"
              )}
              disabled={isSaving}
              className="h-5 w-5 rounded border-slate-300"
            />

            Show maintenance notice
          </label>

          <div className="mt-5">
            <FormField
              id="message"
              label="Maintenance message"
              value={
                form
                  .maintenanceNotice
                  .message
              }
              onChange={handleInputChange(
                "maintenanceNotice"
              )}
              multiline
              rows={3}
              disabled={isSaving}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Payment details"
          description="These private bank details are available to authenticated students, not public visitors."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="bankName"
              label="Bank name"
              value={
                form.paymentDetails
                  .bankName
              }
              onChange={handleInputChange(
                "paymentDetails"
              )}
              disabled={isSaving}
            />

            <FormField
              id="accountName"
              label="Account name"
              value={
                form.paymentDetails
                  .accountName
              }
              onChange={handleInputChange(
                "paymentDetails"
              )}
              disabled={isSaving}
            />

            <FormField
              id="accountNumber"
              label="Account number"
              value={
                form.paymentDetails
                  .accountNumber
              }
              onChange={handleInputChange(
                "paymentDetails"
              )}
              disabled={isSaving}
            />

            <FormField
              id="branchName"
              label="Branch"
              value={
                form.paymentDetails
                  .branchName
              }
              onChange={handleInputChange(
                "paymentDetails"
              )}
              disabled={isSaving}
            />

            <div className="sm:col-span-2">
              <FormField
                id="instructions"
                label="Payment instructions"
                value={
                  form.paymentDetails
                    .instructions
                }
                onChange={handleInputChange(
                  "paymentDetails"
                )}
                multiline
                rows={5}
                disabled={isSaving}
              />
            </div>

            <div className="sm:col-span-2">
              <FormField
                id="paymentReferenceNote"
                label="Payment-reference note"
                value={
                  form.paymentDetails
                    .paymentReferenceNote
                }
                onChange={handleInputChange(
                  "paymentDetails"
                )}
                multiline
                rows={3}
                disabled={isSaving}
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Learning defaults"
          description="Default viewing limits apply when new lessons are created."
        >
          <div className="max-w-sm">
            <FormField
              id="defaultLessonMaxViews"
              label="Default maximum lesson views"
              type="number"
              value={
                form.learning
                  .defaultLessonMaxViews
              }
              onChange={handleInputChange(
                "learning"
              )}
              min="1"
              max="100"
              required
              disabled={isSaving}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Live-class defaults"
          description="Default Zoom joining-window values used when a live class does not provide custom values."
        >
          <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
            <FormField
              id="defaultJoinBeforeMinutes"
              label="Join opens before"
              type="number"
              value={
                form.liveClasses
                  .defaultJoinBeforeMinutes
              }
              onChange={handleInputChange(
                "liveClasses"
              )}
              min="0"
              max="1440"
              required
              disabled={isSaving}
              helpText="Minutes before the scheduled start."
            />

            <FormField
              id="defaultJoinAfterMinutes"
              label="Join closes after"
              type="number"
              value={
                form.liveClasses
                  .defaultJoinAfterMinutes
              }
              onChange={handleInputChange(
                "liveClasses"
              )}
              min="0"
              max="1440"
              required
              disabled={isSaving}
              helpText="Minutes after the scheduled meeting end."
            />
          </div>
        </SettingsSection>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-2xl bg-brand-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-brand-600/20 disabled:opacity-50"
        >
          {isSaving
            ? "Saving settings…"
            : "Save all settings"}
        </button>
      </div>
    </form>
  );
}
