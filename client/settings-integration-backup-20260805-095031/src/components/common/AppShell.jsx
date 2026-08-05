import {
  useState,
} from "react";

import {
  Link,
  NavLink,
  Outlet,
} from "react-router";

import {
  useAuth,
} from "../../auth/useAuth.js";

const getInitials = (user) => {
  const first =
    user?.firstName?.[0] || "";

  const last =
    user?.lastName?.[0] || "";

  return (
    `${first}${last}`.toUpperCase() ||
    "U"
  );
};

export default function AppShell({
  portalLabel,
  navItems,
}) {
  const {
    user,
    logout,
  } = useAuth();

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-sm font-black text-white shadow-sm">
              EL
            </span>

            <span>
              <span className="block text-base font-black tracking-tight text-slate-950">
                EconLLS
              </span>

              <span className="block text-xs font-medium text-slate-500">
                {portalLabel}
              </span>
            </span>
          </Link>

          <nav className="order-3 flex w-full gap-1 overflow-x-auto border-t border-slate-100 pt-3 sm:order-2 sm:ml-5 sm:w-auto sm:border-0 sm:pt-0">
            {navItems.map(
              (item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({
                    isActive,
                  }) =>
                    [
                      "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              )
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-900">
                {user?.firstName}{" "}
                {user?.lastName}
              </p>

              <p className="text-xs text-slate-500">
                {user?.email}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {getInitials(user)}
            </div>

            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingOut
                ? "Signing out…"
                : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
