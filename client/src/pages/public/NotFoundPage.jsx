import {
  Link,
} from "react-router";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-[calc(100vh-77px)] items-center justify-center bg-slate-50 px-6">
      <div className="max-w-lg text-center">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-700">
          Error 404
        </p>

        <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950">
          Page not found
        </h1>

        <p className="mt-5 leading-7 text-slate-600">
          The page you requested does not
          exist or is no longer available.
        </p>

        <Link
          to="/"
          className="mt-8 inline-flex rounded-2xl bg-brand-600 px-6 py-3 text-sm font-black text-white"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
