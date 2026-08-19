import {
  Link,
} from "react-router";

import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

import teacherMentorBanner from "../../assets/teacher-mentor-banner-optimized.jpg";

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
      "Enrolment, identity verification and lesson access work together to keep every learning journey personal.",
  },
];

const teacherStrengths = [
  "Experienced guidance for O/L Commerce and A/L Accounting",
  "Clear explanations connected to practical application",
  "Focused preparation designed to build exam confidence",
];

export default function AboutPage() {
  const { settings } = usePlatformSettings();
  const { platformName, tagline } = settings.branding;

  return (
    <main className="overflow-hidden bg-white">
      <section className="overflow-hidden bg-[#061225] text-white">
        <div className="relative w-full overflow-hidden bg-slate-950">
          <img
            src={teacherMentorBanner}
            alt="Udara Weerasinghe: teacher, mentor and inspirer for Ordinary Level Commerce and Advanced Level Accounting students"
            width="1536"
            height="1024"
            fetchPriority="high"
            decoding="async"
            className="block h-auto w-full"
          />
        </div>

        <div className="relative isolate border-y border-white/10">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_30%,rgba(23,99,245,0.34),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(251,191,36,0.13),transparent_28%)]" />
          <div className="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                About {platformName}
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Clear guidance. Confident progress.
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-slate-300 sm:text-lg">
                {tagline || `${platformName} brings clear teaching, focused practice and dependable learning support into one student-first experience.`}
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                to="/#courses"
                className="rounded-2xl bg-amber-400 px-7 py-4 text-center text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-300"
              >
                Explore courses
              </Link>
              <Link
                to="/contact"
                className="rounded-2xl border border-white/20 bg-white/5 px-7 py-4 text-center text-sm font-black text-white transition hover:border-white/40 hover:bg-white/10"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700">
              Why we exist
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">
              Less confusion. More time for learning.
            </h2>
          </div>

          <div className="space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
            <p>
              {platformName} gives commerce and accounting students a dependable home for recorded lessons, scheduled live classes, payment progress and essential notifications.
            </p>
            <p>
              The portal is designed to make everyday learning simple on phones, tablets and computers while keeping student access personal, organized and accountable.
            </p>
            <div className="border-l-4 border-amber-400 bg-amber-50 px-6 py-5 text-base font-bold leading-7 text-slate-800">
              Every part of the platform is built to help students spend less time searching and more time understanding, practising and progressing.
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700">
              Our approach
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">
              Built around three practical priorities.
            </h2>
            <p className="mt-5 max-w-2xl leading-7 text-slate-600 sm:text-lg">
              Good technology should make learning feel clearer—not more complicated.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article
                key={pillar.number}
                className="group rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_55px_-35px_rgba(15,23,42,0.4)] transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl sm:p-8"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#071c3f] text-sm font-black text-amber-300 transition group-hover:bg-brand-700">
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

      <section className="bg-[#061225] py-20 text-white sm:py-24 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              The teaching philosophy
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-4xl lg:text-5xl">
              Strong results begin with strong understanding.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Lessons are shaped around clear explanations, purposeful practice and the confidence to apply what you have learned when it matters most.
            </p>
          </div>

          <ul className="grid gap-4">
            {teacherStrengths.map((strength) => (
              <li
                key={strength}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm font-bold leading-6 text-slate-200 backdrop-blur sm:text-base"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-slate-950">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-700 p-8 text-white shadow-xl shadow-brand-900/20 sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[45px] border-white/5" />
            <div className="relative max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-100">
                Continue your journey
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Ready to learn with greater clarity?
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-brand-100">
                Explore the current courses or contact the support team if you need help finding the right starting point.
              </p>
            </div>

            <div className="relative mt-8 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
              <Link
                to="/#courses"
                className="rounded-2xl bg-white px-6 py-3.5 text-center text-sm font-black text-brand-800 transition hover:bg-brand-50"
              >
                Browse courses
              </Link>
              <Link
                to="/contact"
                className="rounded-2xl border border-white/25 px-6 py-3.5 text-center text-sm font-black text-white transition hover:bg-white/10"
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
