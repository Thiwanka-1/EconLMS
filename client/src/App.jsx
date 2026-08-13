import {
  Route,
  Routes,
} from "react-router";

import AdminLayout from "./layouts/AdminLayout.jsx";
import PublicLayout from "./layouts/PublicLayout.jsx";
import StudentLayout from "./layouts/StudentLayout.jsx";

import AdminAuditLogsPage from "./pages/admin/AdminAuditLogsPage.jsx";
import AdminCoursePage from "./pages/admin/AdminCoursePage.jsx";
import AdminCoursesPage from "./pages/admin/AdminCoursesPage.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminEnrollmentsPage from "./pages/admin/AdminEnrollmentsPage.jsx";
import AdminLiveClassesPage from "./pages/admin/AdminLiveClassesPage.jsx";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage.jsx";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage.jsx";
import AdminStudentPage from "./pages/admin/AdminStudentPage.jsx";
import AdminStudentsPage from "./pages/admin/AdminStudentsPage.jsx";

import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage.jsx";
import SignupPage from "./pages/auth/SignupPage.jsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.jsx";

import HomePage from "./pages/public/HomePage.jsx";
import AboutPage from "./pages/public/AboutPage.jsx";
import ContactPage from "./pages/public/ContactPage.jsx";
import NotFoundPage from "./pages/public/NotFoundPage.jsx";

import NotificationsPage from "./pages/shared/NotificationsPage.jsx";
import AccountSecurityPage from "./pages/shared/AccountSecurityPage.jsx";

import StudentCoursePage from "./pages/student/StudentCoursePage.jsx";
import StudentCoursesPage from "./pages/student/StudentCoursesPage.jsx";
import StudentDashboardPage from "./pages/student/StudentDashboardPage.jsx";
import StudentLessonsPage from "./pages/student/StudentLessonsPage.jsx";
import StudentLiveClassesPage from "./pages/student/StudentLiveClassesPage.jsx";
import StudentNicPage from "./pages/student/StudentNicPage.jsx";
import StudentPaymentsPage from "./pages/student/StudentPaymentsPage.jsx";
import StudentProfilePage from "./pages/student/StudentProfilePage.jsx";

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

        <Route
          path="about"
          element={<AboutPage />}
        />

        <Route
          path="contact"
          element={<ContactPage />}
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

          <Route
            path="/student/courses"
            element={
              <StudentCoursesPage />
            }
          />

          <Route
            path="/student/courses/:identifier"
            element={
              <StudentCoursePage />
            }
          />

          <Route
            path="/student/lessons/:courseId"
            element={
              <StudentLessonsPage />
            }
          />

          <Route
            path="/student/live-classes"
            element={
              <StudentLiveClassesPage />
            }
          />

          <Route
            path="/student/payments"
            element={
              <StudentPaymentsPage />
            }
          />

          <Route
            path="/student/notifications"
            element={
              <NotificationsPage />
            }
          />

          <Route
            path="/student/profile"
            element={
              <StudentProfilePage />
            }
          />

          <Route
            path="/student/nic"
            element={
              <StudentNicPage />
            }
          />

          <Route
            path="/student/security"
            element={<AccountSecurityPage />}
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

          <Route
            path="/admin/courses"
            element={
              <AdminCoursesPage />
            }
          />

          <Route
            path="/admin/courses/:courseId"
            element={
              <AdminCoursePage />
            }
          />

          <Route
            path="/admin/enrollments"
            element={
              <AdminEnrollmentsPage />
            }
          />

          <Route
            path="/admin/live-classes"
            element={
              <AdminLiveClassesPage />
            }
          />

          <Route
            path="/admin/payments"
            element={
              <AdminPaymentsPage />
            }
          />

          <Route
            path="/admin/students"
            element={
              <AdminStudentsPage />
            }
          />

          <Route
            path="/admin/students/:studentId"
            element={
              <AdminStudentPage />
            }
          />

          <Route
            path="/admin/notifications"
            element={
              <NotificationsPage />
            }
          />

          <Route
            path="/admin/audit-logs"
            element={
              <AdminAuditLogsPage />
            }
          />

          <Route
            path="/admin/settings"
            element={
              <AdminSettingsPage />
            }
          />

          <Route
            path="/admin/security"
            element={<AccountSecurityPage />}
          />
        </Route>
      </Route>
    </Routes>
  );
}
