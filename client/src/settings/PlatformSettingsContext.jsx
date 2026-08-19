import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getPublicPlatformSettings,
  getStudentPlatformSettings,
} from "../api/settingsApi.js";

import {
  getAdminPlatformSettings,
} from "../api/platformSettingsAdminApi.js";

import {
  useAuth,
} from "../auth/useAuth.js";

const DEFAULT_SETTINGS = {
  branding: {
    platformName: "AccountingLMS",
    tagline: "Accounting Learning Portal",
  },

  contact: {
    supportEmail: "",
    supportPhone: "",
    whatsappNumber: "",
  },

  registration: {
    isOpen: true,
    closedMessage: "Student registration is temporarily closed.",
  },

  maintenanceNotice: {
    enabled: false,
    message: "AccountingLMS is currently undergoing maintenance.",
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
    defaultLessonMaxViews: 2,
  },

  liveClasses: {
    defaultJoinBeforeMinutes: 30,
    defaultJoinAfterMinutes: 15,
  },
};

const textValue = (value, fallback = "") => {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value).trim();
};

const integerValue = ({
  value,
  fallback,
  minimum,
  maximum,
}) => {
  const number = Number(value);

  return Number.isInteger(number) &&
    number >= minimum &&
    number <= maximum
    ? number
    : fallback;
};

export const normalizePlatformSettings = (settings = {}) => ({
  branding: {
    platformName:
      textValue(
        settings.branding?.platformName,
        DEFAULT_SETTINGS.branding.platformName
      ) || DEFAULT_SETTINGS.branding.platformName,

    tagline: textValue(
      settings.branding?.tagline,
      DEFAULT_SETTINGS.branding.tagline
    ),
  },

  contact: {
    supportEmail: textValue(settings.contact?.supportEmail),
    supportPhone: textValue(settings.contact?.supportPhone),
    whatsappNumber: textValue(settings.contact?.whatsappNumber),
  },

  registration: {
    isOpen: settings.registration?.isOpen !== false,

    closedMessage: textValue(
      settings.registration?.closedMessage,
      DEFAULT_SETTINGS.registration.closedMessage
    ),
  },

  maintenanceNotice: {
    enabled: Boolean(settings.maintenanceNotice?.enabled),

    message: textValue(
      settings.maintenanceNotice?.message,
      DEFAULT_SETTINGS.maintenanceNotice.message
    ),
  },

  paymentDetails: {
    bankName: textValue(settings.paymentDetails?.bankName),
    accountName: textValue(settings.paymentDetails?.accountName),
    accountNumber: textValue(settings.paymentDetails?.accountNumber),
    branchName: textValue(settings.paymentDetails?.branchName),
    instructions: textValue(settings.paymentDetails?.instructions),
    paymentReferenceNote: textValue(
      settings.paymentDetails?.paymentReferenceNote
    ),
  },

  learning: {
    defaultLessonMaxViews: integerValue({
      value: settings.learning?.defaultLessonMaxViews,
      fallback: DEFAULT_SETTINGS.learning.defaultLessonMaxViews,
      minimum: 1,
      maximum: 100,
    }),
  },

  liveClasses: {
    defaultJoinBeforeMinutes: integerValue({
      value: settings.liveClasses?.defaultJoinBeforeMinutes,
      fallback: DEFAULT_SETTINGS.liveClasses.defaultJoinBeforeMinutes,
      minimum: 0,
      maximum: 1440,
    }),

    defaultJoinAfterMinutes: integerValue({
      value: settings.liveClasses?.defaultJoinAfterMinutes,
      fallback: DEFAULT_SETTINGS.liveClasses.defaultJoinAfterMinutes,
      minimum: 0,
      maximum: 1440,
    }),
  },
});

const loadSettingsForRole = async (role) => {
  if (role === "admin") {
    return getAdminPlatformSettings();
  }

  if (role === "student") {
    return getStudentPlatformSettings();
  }

  return getPublicPlatformSettings();
};

export const PlatformSettingsContext = createContext(null);

export function PlatformSettingsProvider({
  children,
}) {
  const {
    user,
    status: authStatus,
  } = useAuth();

  const [settings, setSettings] = useState(() =>
    normalizePlatformSettings()
  );

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const requestSequenceRef = useRef(0);

  const role =
    authStatus === "ready"
      ? user?.role || "public"
      : "loading";

  const applySettings = useCallback((nextSettings) => {
    requestSequenceRef.current += 1;

    const normalized = normalizePlatformSettings(nextSettings);

    setSettings(normalized);
    setStatus("ready");
    setError("");

    return normalized;
  }, []);

  const refreshSettings = useCallback(async () => {
    if (role === "loading") {
      return null;
    }

    const requestSequence = ++requestSequenceRef.current;

    setStatus("loading");
    setError("");

    try {
      const result = await loadSettingsForRole(role);

      if (requestSequence !== requestSequenceRef.current) {
        return null;
      }

      const normalized = normalizePlatformSettings(result.settings);

      setSettings(normalized);
      setStatus("ready");

      return normalized;
    } catch (requestError) {
      if (requestSequence !== requestSequenceRef.current) {
        return null;
      }

      setStatus("error");
      setError(
        requestError.message ||
          "Platform settings could not be loaded."
      );

      console.error(
        "Platform settings loading failed:",
        requestError
      );

      return null;
    }
  }, [role]);

  useEffect(() => {
    if (role !== "loading") {
      void refreshSettings();
    }
  }, [role, refreshSettings]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = settings.branding.platformName;
    }
  }, [settings.branding.platformName]);

  const value = useMemo(
    () => ({
      settings,
      status,
      error,
      applySettings,
      refreshSettings,
    }),
    [
      settings,
      status,
      error,
      applySettings,
      refreshSettings,
    ]
  );

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}
