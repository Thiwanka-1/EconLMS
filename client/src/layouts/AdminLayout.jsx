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
      ]}
    />
  );
}
