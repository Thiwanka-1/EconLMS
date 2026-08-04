import AppShell from "../components/common/AppShell.jsx";

export default function AdminLayout() {
  return (
    <AppShell
      portalLabel="Administration"
      navItems={[
        {
          to: "/admin",
          label: "Dashboard",
          end: true,
        },
        {
          to: "/admin/courses",
          label: "Courses",
        },
        {
          to: "/admin/enrollments",
          label: "Enrolments",
        },
        {
          to: "/admin/live-classes",
          label: "Live classes",
        },
        {
          to: "/admin/payments",
          label: "Payments",
        },
        {
          to: "/admin/students",
          label: "Students",
        },
        {
          to: "/admin/notifications",
          label: "Notifications",
        },
        {
          to: "/admin/audit-logs",
          label: "Audit logs",
        },
        {
          to: "/admin/settings",
          label: "Settings",
        },
      ]}
    />
  );
}