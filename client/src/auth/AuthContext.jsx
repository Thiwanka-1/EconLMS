import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  verifyEmailAddress,
} from "../api/authApi.js";

export const AuthContext =
  createContext(null);

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null);

  const [status, setStatus] =
    useState("loading");

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const result =
          await getCurrentUser();

        if (active) {
          setUser(result.user);
        }
      } catch (error) {
        if (
          active &&
          error.status !== 401 &&
          error.status !== 403
        ) {
          console.error(
            "Session restoration failed:",
            error
          );
        }

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setStatus("ready");
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async ({
      email,
      password,
    }) => {
      const result =
        await loginUser({
          email,
          password,
        });

      setUser(result.user);

      return result.user;
    },
    []
  );

  const verifyEmail = useCallback(
    async ({
      email,
      otp,
    }) => {
      const result =
        await verifyEmailAddress({
          email,
          otp,
        });

      setUser(result.user);

      return result.user;
    },
    []
  );

  const logout = useCallback(
    async () => {
      try {
        await logoutUser();
      } finally {
        setUser(null);
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated:
        Boolean(user),
      login,
      verifyEmail,
      logout,
    }),
    [
      user,
      status,
      login,
      verifyEmail,
      logout,
    ]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}
