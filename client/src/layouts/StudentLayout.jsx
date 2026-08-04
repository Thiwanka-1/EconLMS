import AppShell from "../components/common/AppShell.jsx";

export default function StudentLayout() {
  return (
    <AppShell
      portalLabel="Student portal"
      navItems={[
        {
          to: "/student",
          label: "Dashboard",
          end: true,
        },
        {
          to: "/student/courses",
          label: "Courses",
        },
        {
          to: "/student/payments",
          label: "Payments",
        },
        {
          to: "/student/profile",
          label: "Profile",
        },
        {
          to: "/student/nic",
          label: "NIC document",
        },
        {
          to: "/student/security",
          label: "Security",
        },
      ]}
    />
  );
}
