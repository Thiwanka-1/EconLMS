import {
  apiRequest,
} from "./http.js";

export const getCurrentUser = () => {
  return apiRequest("/auth/me");
};

export const signupUser = ({
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
  school,
  mobileNumber,
  nicNumber,
  city,
  address,
  zoomEmail,
}) => {
  return apiRequest("/auth/signup", {
    method: "POST",
    body: {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      school,
      mobileNumber,
      nicNumber,
      city,
      address,
      zoomEmail,
    },
  });
};

export const verifyEmailAddress = ({
  email,
  otp,
}) => {
  return apiRequest("/auth/verify-email", {
    method: "POST",
    body: {
      email,
      otp,
    },
  });
};

export const resendVerificationCode = ({
  email,
}) => {
  return apiRequest(
    "/auth/resend-verification-otp",
    {
      method: "POST",
      body: {
        email,
      },
    }
  );
};

export const loginUser = ({
  email,
  password,
}) => {
  return apiRequest("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
  });
};

export const logoutUser = () => {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
};

export const requestPasswordReset = ({
  email,
}) => {
  return apiRequest(
    "/auth/forgot-password",
    {
      method: "POST",
      body: {
        email,
      },
    }
  );
};

export const resetUserPassword = ({
  email,
  otp,
  password,
  confirmPassword,
}) => {
  return apiRequest(
    "/auth/reset-password",
    {
      method: "POST",
      body: {
        email,
        otp,
        password,
        confirmPassword,
      },
    }
  );
};

export const changeUserPassword = ({
  currentPassword,
  password,
  confirmPassword,
}) => {
  return apiRequest(
    "/auth/change-password",
    {
      method: "PATCH",
      body: {
        currentPassword,
        password,
        confirmPassword,
      },
    }
  );
};

export const getMyAuthSessions = () => {
  return apiRequest("/auth/sessions");
};

export const revokeAuthSession = (sessionId) => {
  return apiRequest(`/auth/sessions/${sessionId}`, {
    method: "DELETE",
  });
};

export const revokeOtherAuthSessions = () => {
  return apiRequest("/auth/sessions/others", {
    method: "DELETE",
  });
};
