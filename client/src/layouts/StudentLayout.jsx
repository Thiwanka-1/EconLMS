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
      ]}
    />
  );
}
