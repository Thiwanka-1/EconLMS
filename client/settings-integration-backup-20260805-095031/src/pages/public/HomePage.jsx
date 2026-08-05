import {
  Link,
} from "react-router";

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(43,131,255,0.16),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.08),transparent_35%)]" />

        <div className="relative mx-auto grid min-h-[calc(100vh-77px)] max-w-7xl items-center gap-16 px-4 py-20 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-brand-700">
              Learn economics with clarity
            </span>

            <h1 className="mt-7 max-w-4xl text-5xl font-black tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
              Structured learning for
              <span className="text-brand-600">
                {" "}better results.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Access lessons, live classes,
              payment updates and learning
              resources through one secure
              student portal.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="rounded-2xl bg-brand-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
              >
                Sign in to EconLLS
              </Link>

              <a
                href="#features"
                className="rounded-2xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-black text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Explore the portal
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10">
              <div className="rounded-[1.5rem] bg-slate-950 p-7 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-400">
                      Student dashboard
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      Welcome to EconLLS
                    </p>
                  </div>

                  <div className="h-12 w-12 rounded-2xl bg-brand-500" />
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  {[
                    [
                      "Active courses",
                      "04",
                    ],
                    [
                      "Upcoming classes",
                      "02",
                    ],
                    [
                      "New notifications",
                      "05",
                    ],
                    [
                      "Pending payments",
                      "01",
                    ],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <p className="text-xs font-medium text-slate-400">
                          {label}
                        </p>

                        <p className="mt-2 text-2xl font-black">
                          {value}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  "Monthly economics lesson",
                  "Live class access",
                  "Secure payment approval",
                ].map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={item}
                      className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-sm font-black text-brand-700">
                        0{index + 1}
                      </span>

                      <div>
                        <p className="font-bold text-slate-900">
                          {item}
                        </p>

                        <p className="text-sm text-slate-500">
                          Available from your personal portal
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="border-t border-slate-200 bg-slate-50"
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            {
              title:
                "Recorded lessons",
              description:
                "Watch published economics lessons through controlled student access.",
            },
            {
              title:
                "Live learning",
              description:
                "View upcoming classes and access registered live sessions securely.",
            },
            {
              title:
                "Clear updates",
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
