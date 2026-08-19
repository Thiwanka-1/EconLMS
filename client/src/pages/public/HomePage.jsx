import {
  Link,
} from "react-router";

import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

import masterAccountingBanner from "../../assets/master-accounting-banner.png";

export default function HomePage() {
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
    <main>
      <section className="relative overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(43,131,255,0.16),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.08),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-4xl">
            <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-brand-700">
              {tagline ||
                "Master accounting with clarity"}
            </span>

            <h1 className="mt-7 max-w-4xl text-5xl font-black tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
              Understand today.
              <span className="text-brand-600">
                {" "}Excel tomorrow.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Build clear accounting concepts,
              prepare confidently for exams and
              access every lesson, live class and
              learning resource through one secure
              student portal.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="rounded-2xl bg-brand-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
              >
                Sign in to {platformName}
              </Link>

              {registrationOpen && (
                <Link
                  to="/signup"
                  className="rounded-2xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-black text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Create student account
                </Link>
              )}

              <a
                href="#features"
                className="rounded-2xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-black text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Explore the portal
              </a>
            </div>
          </div>

          <a
            href={masterAccountingBanner}
            target="_blank"
            rel="noreferrer"
            aria-label="Open the Master Accounting programme banner at full size"
            className="group mt-14 block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 sm:rounded-[2rem]"
          >
            <img
              src={masterAccountingBanner}
              alt="Master Accounting with Udara Weerasinghe: clear concepts, exam focus, practical learning and achievement"
              fetchPriority="high"
              decoding="async"
              className="h-auto w-full transition duration-500 group-hover:scale-[1.005]"
            />
          </a>

          <p className="mt-3 text-center text-xs font-semibold text-slate-500 sm:hidden">
            Tap the banner to view it at full size.
          </p>
        </div>
      </section>

      <section
        id="features"
        className="border-t border-slate-200 bg-slate-50"
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            {
              title: "Recorded lessons",
              description:
                "Watch published accounting lessons through controlled student access.",
            },
            {
              title: "Live learning",
              description:
                "View upcoming classes and access registered live sessions securely.",
            },
            {
              title: "Clear updates",
              description:
                "Receive payment, NIC verification and course notifications in one place.",
            },
          ].map((feature) => (
            <article
              key={feature.title}
              className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <div className="h-11 w-11 rounded-2xl bg-brand-100" />

              <h2 className="mt-6 text-xl font-black text-slate-950">
                {feature.title}
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
