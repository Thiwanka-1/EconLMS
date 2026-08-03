import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router";

import {
  useAuth,
} from "../auth/useAuth.js";

import LoadingScreen from "../components/common/LoadingScreen.jsx";

import {
  getRoleHome,
} from "../utils/roleHome.js";

export default function RequireAuth({
  allowedRoles,
}) {
  const {
    user,
    status,
  } = useAuth();

  const location =
    useLocation();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(
      user.role
    )
  ) {
    return (
      <Navigate
        to={getRoleHome(user.role)}
        replace
      />
    );
  }

  return <Outlet />;
}
