import {
  Link,
} from "react-router";

import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

import masterAccountingBanner from "../../assets/master-accounting-banner.png";

const features = [
  {
    title: "Recorded lessons",
    description:
      "Watch published accounting lessons through controlled student access.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="m10 9 5 3-5 3V9Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Live learning",
    description:
      "View upcoming classes and access registered live sessions securely.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <rect x="3" y="6" width="13" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="m16 10 4-2v8l-4-2v-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7 3.75h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Clear updates",
    description:
      "Receive payment, NIC verification and course notifications in one place.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 20h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="18.5" cy="5.5" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
];

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

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-6 lg:px-8 lg:pb-24">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 sm:rounded-[2rem]">
            <img
              src={masterAccountingBanner}
              alt="Master Accounting with Udara Weerasinghe: clear concepts, exam focus, practical learning and achievement"
              fetchPriority="high"
              decoding="async"
              className="h-auto w-full"
            />
          </div>

          <div className="mt-12 max-w-4xl sm:mt-16">
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
        </div>
      </section>

      <section
        id="features"
        className="border-t border-slate-200 bg-slate-50"
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-3 lg:px-8">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-700 shadow-sm">
                {feature.icon}
              </div>

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
