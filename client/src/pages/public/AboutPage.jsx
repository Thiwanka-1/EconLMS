import {
  Link,
} from "react-router";

import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

import teacherMentorBanner from "../../assets/teacher-mentor-banner.png";

const pillars = [
  {
    number: "01",
    title: "Clear learning structure",
    description:
      "Courses, monthly lessons and live classes are organized in one place so students always know what comes next.",
  },
  {
    number: "02",
    title: "Reliable communication",
    description:
      "Important payment, document and course updates are delivered through the student portal and email.",
  },
  {
    number: "03",
    title: "Controlled access",
    description:
      "Enrolment, identity verification and lesson access work together to protect learning resources.",
  },
];

export default function AboutPage() {
  const { settings } = usePlatformSettings();
  const { platformName, tagline } = settings.branding;

  return (
    <main className="overflow-hidden">
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 lg:px-8 lg:pb-16">
          <a
            href={teacherMentorBanner}
            target="_blank"
            rel="noreferrer"
            aria-label="Open the teacher profile banner at full size"
            className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 sm:rounded-[2rem]"
          >
            <img
              src={teacherMentorBanner}
              alt="Udara Weerasinghe: teacher, mentor and inspirer for Ordinary Level Commerce and Advanced Level Accounting students"
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

      <section className="relative border-b border-slate-200 bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(43,131,255,0.3),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(14,165,233,0.14),transparent_30%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-brand-300">
            About {platformName}
          </p>

          <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Accounting learning, organized around the student.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            {tagline || `${platformName} brings lessons, live teaching and learning updates into one focused digital experience.`}
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
              Why we exist
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Less confusion. More time for learning.
            </h2>
          </div>

          <div className="space-y-6 text-lg leading-8 text-slate-600">
            <p>
              {platformName} gives commerce and accounting students a dependable home for recorded lessons, scheduled live classes, payment progress and essential notifications.
            </p>
            <p>
              The portal is designed to make everyday learning tasks simple on phones, tablets and computers while keeping student access personal and accountable.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
              Our approach
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Built around three practical priorities.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article
                key={pillar.number}
                className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-8"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-sm font-black text-brand-700">
                  {pillar.number}
                </span>
                <h3 className="mt-7 text-xl font-black text-slate-950">
                  {pillar.title}
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {pillar.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 rounded-[2rem] bg-brand-600 p-8 text-white shadow-xl shadow-brand-600/20 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Ready to continue learning?</h2>
              <p className="mt-3 max-w-2xl leading-7 text-brand-100">
                Sign in to your portal or contact the support team if you need help getting started.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-brand-700 transition hover:bg-brand-50"
              >
                Sign in
              </Link>
              <Link
                to="/contact"
                className="rounded-2xl border border-white/30 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/10"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
