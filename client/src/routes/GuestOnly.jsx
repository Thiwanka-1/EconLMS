import {
  Navigate,
  Outlet,
} from "react-router";

import {
  useAuth,
} from "../auth/useAuth.js";

import LoadingScreen from "../components/common/LoadingScreen.jsx";

import {
  getRoleHome,
} from "../utils/roleHome.js";

export default function GuestOnly() {
  const {
    user,
    status,
  } = useAuth();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (user) {
    return (
      <Navigate
        to={getRoleHome(user.role)}
        replace
      />
    );
  }

  return <Outlet />;
}
