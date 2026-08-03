import {
  Route,
  Routes,
} from "react-router";

import AdminLayout from "./layouts/AdminLayout.jsx";
import PublicLayout from "./layouts/PublicLayout.jsx";
import StudentLayout from "./layouts/StudentLayout.jsx";

import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage.jsx";
import SignupPage from "./pages/auth/SignupPage.jsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.jsx";
import HomePage from "./pages/public/HomePage.jsx";
import NotFoundPage from "./pages/public/NotFoundPage.jsx";
import StudentDashboardPage from "./pages/student/StudentDashboardPage.jsx";

import GuestOnly from "./routes/GuestOnly.jsx";
import RequireAuth from "./routes/RequireAuth.jsx";

export default function App() {
  return (
    <Routes>
      <Route
        element={<PublicLayout />}
      >
        <Route
          index
          element={<HomePage />}
        />

        <Route element={<GuestOnly />}>
          <Route
            path="login"
            element={<LoginPage />}
          />

          <Route
            path="signup"
            element={<SignupPage />}
          />

          <Route
            path="verify-email"
            element={<VerifyEmailPage />}
          />

          <Route
            path="forgot-password"
            element={
              <ForgotPasswordPage />
            }
          />

          <Route
            path="reset-password"
            element={
              <ResetPasswordPage />
            }
          />
        </Route>

        <Route
          path="*"
          element={<NotFoundPage />}
        />
      </Route>

      <Route
        element={
          <RequireAuth
            allowedRoles={[
              "student",
            ]}
          />
        }
      >
        <Route
          element={<StudentLayout />}
        >
          <Route
            path="/student"
            element={
              <StudentDashboardPage />
            }
          />
        </Route>
      </Route>

      <Route
        element={
          <RequireAuth
            allowedRoles={[
              "admin",
            ]}
          />
        }
      >
        <Route
          element={<AdminLayout />}
        >
          <Route
            path="/admin"
            element={
              <AdminDashboardPage />
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
