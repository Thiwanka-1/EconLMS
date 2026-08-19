import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  Outlet,
  useLocation,
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

const navigation = [
  {
    to: "/",
    label: "Home",
  },
  {
    to: "/#courses",
    label: "Courses",
  },
  {
    to: "/about",
    label: "About us",
  },
  {
    to: "/contact",
    label: "Contact",
  },
];

export default function PublicLayout() {
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

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

  useEffect(() => {
    setIsMenuOpen(false);

    if (!location.hash) {
      return undefined;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      document
        .getElementById(location.hash.slice(1))
        ?.scrollIntoView();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [location.pathname, location.hash]);

  const isNavigationItemActive = (to) => {
    if (to === "/#courses") {
      return (
        location.pathname === "/" &&
        location.hash === "#courses"
      );
    }

    if (to === "/") {
      return (
        location.pathname === "/" &&
        location.hash !== "#courses"
      );
    }

    return location.pathname === to;
  };

  const navigationLinks = navigation.map((item) => {
    const isActive = isNavigationItemActive(item.to);

    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={isActive ? "page" : undefined}
        className={[
          "relative rounded-xl px-4 py-2.5 text-sm font-bold transition",
          isActive
            ? "bg-white/10 text-white"
            : "text-slate-300 hover:bg-white/5 hover:text-white",
        ].join(" ")}
      >
        {item.label}
        {isActive && (
          <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-amber-400" />
        )}
      </Link>
    );
  });

  const accountActions = status !== "loading" && (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {user ? (
        <Link
          to={getRoleHome(user.role)}
          className="rounded-xl bg-amber-400 px-5 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-amber-300"
        >
          Open portal
        </Link>
      ) : (
        <>
          <Link
            to="/login"
            className="rounded-xl border border-white/20 px-5 py-3 text-center text-sm font-black text-white transition hover:border-white/40 hover:bg-white/5"
          >
            Sign in
          </Link>

          <Link
            to={registrationOpen ? "/signup" : "/contact"}
            className={[
              "rounded-xl px-5 py-3 text-center text-sm font-black transition",
              registrationOpen
                ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                : "bg-amber-100 text-amber-950 hover:bg-amber-200",
            ].join(" ")}
          >
            {registrationOpen
              ? "Join now"
              : "Registration closed"}
          </Link>
        </>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061225]/95 text-white shadow-xl shadow-slate-950/10 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.75rem] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
            aria-label={`${platformName} home`}
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-300/30 bg-gradient-to-br from-brand-500 to-brand-950 text-sm font-black text-white shadow-lg shadow-brand-950/40">
              <span className="absolute -right-3 -top-3 h-7 w-7 rounded-full bg-amber-400/80 blur-sm" />
              <span className="relative">
                {getBrandInitials(platformName)}
              </span>
            </span>

            <span className="min-w-0">
              <span className="block truncate text-lg font-black tracking-tight text-white">
                {platformName}
              </span>

              {tagline && (
                <span className="hidden truncate text-[0.65rem] font-bold uppercase tracking-[0.18em] text-amber-300 sm:block">
                  {tagline}
                </span>
              )}
            </span>
          </Link>

          <nav
            className="ml-auto hidden items-center gap-1 lg:flex"
            aria-label="Public navigation"
          >
            {navigationLinks}
          </nav>

          <div className="ml-3 hidden lg:block">
            {accountActions}
          </div>

          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="public-mobile-navigation"
            aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setIsMenuOpen((current) => !current)}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-white transition hover:bg-white/10 lg:hidden"
          >
            {isMenuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {isMenuOpen && (
          <div
            id="public-mobile-navigation"
            className="border-t border-white/10 px-4 pb-5 pt-3 lg:hidden"
          >
            <nav
              className="mx-auto grid max-w-7xl gap-1"
              aria-label="Mobile public navigation"
            >
              {navigationLinks}
            </nav>

            <div className="mx-auto mt-4 max-w-7xl border-t border-white/10 pt-4">
              {accountActions}
            </div>
          </div>
        )}
      </header>

      <MaintenanceBanner />

      <div className="flex-1">
        <Outlet />
      </div>

      <SupportFooter />
    </div>
  );
}
