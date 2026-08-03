import {
  Link,
  Outlet,
} from "react-router";

import {
  useAuth,
} from "../auth/useAuth.js";

import {
  getRoleHome,
} from "../utils/roleHome.js";

export default function PublicLayout() {
  const {
    user,
    status,
  } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-sm font-black text-white shadow-sm">
              EL
            </span>

            <span>
              <span className="block text-lg font-black tracking-tight text-slate-950">
                EconLLS
              </span>

              <span className="hidden text-xs font-medium text-slate-500 sm:block">
                Economics Learning Portal
              </span>
            </span>
          </Link>

          {status !== "loading" && (
            <div className="flex items-center gap-2">
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
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <Outlet />
    </div>
  );
}
