import {
  Link,
} from "react-router";

import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

import {
  getBrandInitials,
} from "../../utils/branding.js";

export default function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}) {
  const {
    settings,
  } = usePlatformSettings();

  const {
    platformName,
    tagline,
  } = settings.branding;

  return (
    <main className="grid min-h-[calc(100vh-77px)] bg-slate-50 lg:grid-cols-[0.82fr_1.18fr]">
      <section className="hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link
          to="/"
          className="w-fit text-sm font-bold text-brand-300 transition hover:text-brand-200"
        >
          ← Return home
        </Link>

        <div className="max-w-lg">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-300">
            {platformName}
          </p>

          <h1 className="mt-6 text-5xl font-black tracking-[-0.04em]">
            Learn accounting through one
            secure platform.
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            Manage lessons, payments,
            verification, live classes and
            learning updates through your
            personal portal.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          {platformName}
          {tagline
            ? ` · ${tagline}`
            : ""}
        </p>
      </section>

      <section className="flex items-start justify-center px-4 py-12 sm:px-8 lg:py-16">
        <div className="w-full max-w-3xl">
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-3 lg:hidden"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-sm font-black text-white">
              {getBrandInitials(
                platformName
              )}
            </span>

            <span className="font-black text-slate-950">
              {platformName}
            </span>
          </Link>

          <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
            {eyebrow}
          </p>

          <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] text-slate-950">
            {title}
          </h2>

          {description && (
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              {description}
            </p>
          )}

          <div className="mt-8">
            {children}
          </div>

          {footer && (
            <div className="mt-8 border-t border-slate-200 pt-6 text-sm text-slate-600">
              {footer}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
