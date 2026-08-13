import {
  Link,
  NavLink,
  Outlet,
} from "react-router";

import {
  useAuth,
} from "../auth/useAuth.js";

import MaintenanceBanner from "../components/common/MaintenanceBanner.jsx";
import SupportFooter from "../components/common/SupportFooter.jsx";

import {
  usePlatformSettings,
} from "../settings/usePlatformSettings.js";

import {
  getBrandInitials,
} from "../utils/branding.js";

import {
  getRoleHome,
} from "../utils/roleHome.js";

export default function PublicLayout() {
  const {
    user,
    status,
  } = useAuth();

  const {
    settings,
  } = usePlatformSettings();

  const {
    platformName,
    tagline,
  } = settings.branding;

  const registrationOpen =
    settings.registration.isOpen;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-sm font-black text-white shadow-sm">
              {getBrandInitials(
                platformName
              )}
            </span>

            <span>
              <span className="block text-lg font-black tracking-tight text-slate-950">
                {platformName}
              </span>

              {tagline && (
                <span className="hidden text-xs font-medium text-slate-500 sm:block">
                  {tagline}
                </span>
              )}
            </span>
          </Link>

          <nav className="order-3 flex w-full items-center gap-1 border-t border-slate-100 pt-3 sm:order-2 sm:ml-4 sm:w-auto sm:border-0 sm:pt-0" aria-label="Public navigation">
            {[
              ["/", "Home", true],
              ["/about", "About", false],
              ["/contact", "Contact", false],
            ].map(([to, label, end]) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => [
                  "rounded-xl px-3 py-2 text-sm font-bold transition sm:px-4",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {status !== "loading" && (
            <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
              {user ? (
                <Link
                  to={getRoleHome(
                    user.role
                  )}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Open portal
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                  >
                    Sign in
                  </Link>

                  <Link
                    to="/signup"
                    className={[
                      "rounded-xl px-4 py-2.5 text-sm font-bold transition",
                      registrationOpen
                        ? "bg-slate-950 text-white hover:bg-slate-800"
                        : "bg-amber-100 text-amber-900 hover:bg-amber-200",
                    ].join(" ")}
                  >
                    {registrationOpen
                      ? "Create account"
                      : "Registration closed"}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <MaintenanceBanner />

      <div className="flex-1">
        <Outlet />
      </div>

      <SupportFooter />
    </div>
  );
}
