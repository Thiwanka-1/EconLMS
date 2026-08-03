const VERIFICATION_EMAIL_KEY =
  "econlls.pendingVerificationEmail";

const RESET_EMAIL_KEY =
  "econlls.pendingResetEmail";

const getSessionStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
};

const readValue = (key) => {
  try {
    return (
      getSessionStorage()?.getItem(key) ||
      ""
    );
  } catch {
    return "";
  }
};

const writeValue = (
  key,
  value
) => {
  try {
    const storage =
      getSessionStorage();

    if (!storage) {
      return;
    }

    const normalizedValue =
      String(value || "").trim();

    if (normalizedValue) {
      storage.setItem(
        key,
        normalizedValue
      );
    } else {
      storage.removeItem(key);
    }
  } catch {
    // The authentication flow still works
    // when browser storage is unavailable.
  }
};

export const getPendingVerificationEmail =
  () => {
    return readValue(
      VERIFICATION_EMAIL_KEY
    );
  };

export const setPendingVerificationEmail =
  (email) => {
    writeValue(
      VERIFICATION_EMAIL_KEY,
      email
    );
  };

export const clearPendingVerificationEmail =
  () => {
    writeValue(
      VERIFICATION_EMAIL_KEY,
      ""
    );
  };

export const getPendingResetEmail =
  () => {
    return readValue(
      RESET_EMAIL_KEY
    );
  };

export const setPendingResetEmail = (
  email
) => {
  writeValue(
    RESET_EMAIL_KEY,
    email
  );
};

export const clearPendingResetEmail =
  () => {
    writeValue(
      RESET_EMAIL_KEY,
      ""
    );
  };
