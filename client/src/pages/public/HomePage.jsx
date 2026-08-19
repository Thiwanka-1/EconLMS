import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  getPublishedCourses,
} from "../../api/courseApi.js";

import {
  useAuth,
} from "../../auth/useAuth.js";

import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

import accountingStudyWorkspace from "../../assets/accounting-study-workspace.jpg";
import masterAccountingBanner from "../../assets/master-accounting-banner-optimized.jpg";
import teacherMentorBanner from "../../assets/teacher-mentor-banner-optimized.jpg";

const benefits = [
  {
    title: "Concepts made clear",
    description:
      "Step-by-step teaching that turns difficult accounting ideas into lessons you can understand.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <path d="M5 4.5h10a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3v-11a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 8h6M8 12h6M8 16h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Exam-focused practice",
    description:
      "Structured preparation with practical exercises, paper discussions and guided revision.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="m8.5 12.2 2.1 2.1 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "One learning hub",
    description:
      "Recorded lessons, live classes, notices and learning resources stay organized in one portal.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 9h18M8 4v5M16 4v5" stroke="currentColor" strokeWidth="1.8" />
        <path d="m10 13 4 2-4 2v-4Z" fill="currentColor" />
      </svg>
    ),
  },
];

const learningSteps = [
  "Learn each concept through focused lessons.",
  "Practise with an exam-oriented approach.",
  "Track classes and updates from one secure account.",
];

const getCourseIdentifier = (course) =>
  course.slug || course._id;

const getCourseLink = (course, user) => {
  if (user?.role === "admin") {
    return {
      to: `/admin/courses/${course._id}`,
    };
  }

  const studentCoursePath = `/student/courses/${encodeURIComponent(
    getCourseIdentifier(course)
  )}`;

  if (user?.role === "student") {
    return {
      to: studentCoursePath,
    };
  }

  return {
    to: "/login",
    state: {
      returnTo: studentCoursePath,
    },
  };
};

const formatCategory = (category) => {
  if (category === "revision") {
    return "Revision class";
  }

  if (category === "grade") {
    return "Grade class";
  }

  return "Accounting course";
};

function CourseThumbnail({ course }) {
  if (course.thumbnailUrl) {
    return (
      <img
        src={course.thumbnailUrl}
        alt={`${course.title} course banner`}
        loading="lazy"
        decoding="async"
        className="aspect-[3/2] w-full bg-slate-900 object-cover"
      />
    );
  }

  return (
    <div className="relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#071c3f] via-brand-950 to-[#030a15]">
      <span className="absolute -right-10 -top-10 h-36 w-36 rounded-full border-[18px] border-amber-300/10" />
      <span className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-brand-500/15 blur-2xl" />
      <span className="relative text-4xl font-black tracking-tight text-white">
        {String(course.code || course.title || "AC")
          .slice(0, 4)
          .toUpperCase()}
      </span>
    </div>
  );
}

function CourseCard({ course, user }) {
  const courseLink = getCourseLink(course, user);
  const schedule = course.weeklySchedule?.[0];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_55px_-30px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-[0_24px_65px_-28px_rgba(23,99,245,0.28)]">
      <div className="relative overflow-hidden">
        <CourseThumbnail course={course} />
        <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-slate-950/80 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
          {formatCategory(course.category)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-black uppercase tracking-[0.17em] text-brand-700">
            {course.code || "Online course"}
          </p>
          <span className={[
            "h-2.5 w-2.5 rounded-full",
            course.isEnrollmentOpen
              ? "bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.12)]"
              : "bg-amber-500 shadow-[0_0_0_5px_rgba(245,158,11,0.12)]",
          ].join(" ")} aria-hidden="true" />
        </div>

        <h3 className="mt-3 text-xl font-black leading-snug text-slate-950">
          {course.title}
        </h3>

        <p className="mt-2 text-sm font-bold text-slate-500">
          {course.subject || "Accounting"}
          {course.academicLevel && ` · ${course.academicLevel}`}
        </p>

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
          {course.shortDescription ||
            course.description ||
            "Open the course to explore lessons, learning resources and class information."}
        </p>

        {schedule && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-600">
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>
              {schedule.dayOfWeek} · {schedule.startTime}–{schedule.endTime}
            </span>
          </div>
        )}

        <Link
          to={courseLink.to}
          state={courseLink.state}
          className="mt-6 flex items-center justify-between rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition group-hover:bg-brand-700"
        >
          <span>{course.isEnrollmentOpen ? "Join now" : "View course"}</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 transition group-hover:translate-x-1">
            <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

export default function HomePage() {
  const { user } = useAuth();

  const {
    settings,
  } = usePlatformSettings();

  const {
    platformName,
    tagline,
  } = settings.branding;

  const registrationOpen =
    settings.registration.isOpen;

  const [courses, setCourses] =
    useState([]);
  const [coursesStatus, setCoursesStatus] =
    useState("loading");

  useEffect(() => {
    let active = true;

    const loadCourses = async () => {
      try {
        const result = await getPublishedCourses();

        if (active) {
          setCourses((result.courses || []).slice(0, 6));
          setCoursesStatus("ready");
        }
      } catch (error) {
        if (active) {
          console.error("Home page courses could not be loaded:", error);
          setCoursesStatus("error");
        }
      }
    };

    void loadCourses();

    return () => {
      active = false;
    };
  }, []);

  const catalogueLink = user?.role === "admin"
    ? "/admin/courses"
    : user?.role === "student"
      ? "/student/courses"
      : "/login";

  return (
    <main className="overflow-hidden bg-white">
      <section className="relative isolate overflow-hidden bg-[#061225] text-white">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_10%,rgba(23,99,245,0.35),transparent_33%),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.13),transparent_28%)]" />
        <div className="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="mx-auto grid min-h-[calc(100svh-4.75rem)] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14 lg:px-8 lg:py-24">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-[0.7rem] font-black uppercase tracking-[0.2em] text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_5px_rgba(252,211,77,0.1)]" />
              {tagline || "Accounting learning, made clear"}
            </div>

            <h1 className="mt-7 text-4xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              Master accounting.
              <span className="mt-1 block text-amber-300">
                Build a future that adds up.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              Learn clear concepts, prepare with purpose and access every lesson, live class and update through one focused student experience.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#courses"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-7 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-amber-300"
              >
                Our courses
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
                  <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>

              {!user && (
                <Link
                  to={registrationOpen ? "/signup" : "/login"}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-7 py-4 text-sm font-black text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
                >
                  {registrationOpen ? "Create student account" : "Sign in to learn"}
                </Link>
              )}

              {user && (
                <Link
                  to={catalogueLink}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-7 py-4 text-sm font-black text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
                >
                  Open my portal
                </Link>
              )}
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-2">
                <span className="text-amber-300">✓</span>
                Recorded lessons
              </span>
              <span className="flex items-center gap-2">
                <span className="text-amber-300">✓</span>
                Live learning
              </span>
              <span className="flex items-center gap-2">
                <span className="text-amber-300">✓</span>
                Guided preparation
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[3rem] bg-brand-500/15 blur-3xl" />
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/5 p-2 shadow-2xl shadow-black/40 sm:rounded-[2rem] sm:p-3">
              <img
                src={masterAccountingBanner}
                alt="Master Accounting with Udara Weerasinghe"
                width="1717"
                height="916"
                fetchPriority="high"
                decoding="async"
                className="h-auto w-full rounded-[1rem] sm:rounded-[1.35rem]"
              />
            </div>
            <div className="absolute -bottom-5 left-4 right-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0a1930]/95 p-4 shadow-xl backdrop-blur sm:left-8 sm:right-auto sm:max-w-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
                  <path d="M4 17V9l8-4 8 4v8M8 19v-7h8v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                <span className="block text-sm font-black text-white">Your complete learning hub</span>
                <span className="mt-0.5 block text-xs text-slate-400">Designed for focused student progress</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-px bg-slate-200 sm:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="bg-white px-6 py-9 sm:px-8 lg:py-11"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                {benefit.icon}
              </div>
              <h2 className="mt-5 text-lg font-black text-slate-950">
                {benefit.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="courses"
        className="bg-slate-50 py-20 sm:py-24 lg:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700">
                Find your class
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">
                Choose the course that moves you forward.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Explore the currently published courses, then sign in to see the full course information and continue your enrolment.
              </p>
            </div>

            <Link
              to={catalogueLink}
              className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:border-brand-300 hover:text-brand-700"
            >
              View all courses
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {coursesStatus === "loading" && (
            <div className="mt-12 grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[29rem] animate-pulse rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="aspect-[3/2] rounded-t-[1.75rem] bg-slate-200" />
                  <div className="space-y-4 p-6">
                    <div className="h-3 w-24 rounded bg-slate-200" />
                    <div className="h-6 w-3/4 rounded bg-slate-200" />
                    <div className="h-16 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {coursesStatus === "ready" && courses.length > 0 && (
            <div className="mt-12 grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course._id}
                  course={course}
                  user={user}
                />
              ))}
            </div>
          )}

          {coursesStatus === "ready" && courses.length === 0 && (
            <div className="mt-12 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <h3 className="text-xl font-black text-slate-950">New courses are being prepared.</h3>
              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
                Published classes will appear here automatically. Contact the support team if you would like help choosing a course.
              </p>
              <Link to="/contact" className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
                Contact support
              </Link>
            </div>
          )}

          {coursesStatus === "error" && (
            <div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-[2rem] border border-amber-200 bg-amber-50 p-7 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-black text-amber-950">Course information is temporarily unavailable.</h3>
                <p className="mt-2 text-sm leading-6 text-amber-900/80">You can still sign in to open the full student course catalogue.</p>
              </div>
              <Link to={catalogueLink} className="shrink-0 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-amber-950 transition hover:bg-amber-300">
                Open catalogue
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-6 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative min-h-[34rem] overflow-hidden rounded-[2rem] bg-[#061225] shadow-2xl shadow-slate-950/20 sm:min-h-[32rem] lg:min-h-[36rem]">
            <img
              src={accountingStudyWorkspace}
              alt="Accounting study workspace with a ledger, calculator and digital learning tools"
              width="1693"
              height="945"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-[64%_center] sm:object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#041022] via-[#041022]/90 to-[#041022]/10" />
            <div className="relative flex min-h-[34rem] max-w-2xl flex-col justify-center px-6 py-14 text-white sm:min-h-[32rem] sm:px-12 lg:min-h-[36rem] lg:px-16">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                A better learning rhythm
              </p>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.035em] sm:text-4xl lg:text-5xl">
                Everything you need to stay focused and keep progressing.
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-slate-300 sm:text-lg">
                Move from understanding the lesson to practising the method and preparing for the exam without losing track of what comes next.
              </p>

              <ul className="mt-8 grid gap-4">
                {learningSteps.map((step) => (
                  <li key={step} className="flex items-start gap-3 text-sm font-bold text-slate-200 sm:text-base">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-slate-950">✓</span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-brand-100 to-amber-100/60" />
            <div className="relative overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-slate-200">
              <img
                src={teacherMentorBanner}
                alt="Udara Weerasinghe, Commerce and Accounting teacher"
                width="1536"
                height="1024"
                loading="lazy"
                decoding="async"
                className="h-auto w-full"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700">
              Meet your teacher
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">
              Teaching built around clarity, confidence and results.
            </h2>
            <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
              Udara Weerasinghe guides Ordinary Level Commerce and Advanced Level Accounting students with clear explanations, practical direction and focused exam preparation.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-black text-slate-950">Student-first guidance</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">A clear path from first principles to confident application.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-black text-slate-950">Practical preparation</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Learning connected directly to exam expectations and progress.</p>
              </div>
            </div>

            <Link
              to="/about"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-brand-700"
            >
              Discover our approach
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-700 px-6 py-12 text-white shadow-xl shadow-brand-900/20 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-14">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[45px] border-white/5" />
            <div className="relative max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-100">
                Ready when you are
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Start learning with {platformName} today.
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-brand-100">
                Choose your course, create your student account and bring every part of your learning into one organized space.
              </p>
            </div>

            <div className="relative mt-8 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
              <a href="#courses" className="rounded-2xl bg-white px-6 py-3.5 text-center text-sm font-black text-brand-800 transition hover:bg-brand-50">
                Browse courses
              </a>
              <Link to="/contact" className="rounded-2xl border border-white/25 px-6 py-3.5 text-center text-sm font-black text-white transition hover:bg-white/10">
                Ask a question
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
