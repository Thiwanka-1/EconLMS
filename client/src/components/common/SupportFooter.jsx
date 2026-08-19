import {
  Link,
} from "react-router";

import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

import {
  getBrandInitials,
} from "../../utils/branding.js";

const getWhatsAppUrl = (whatsappNumber) => {
  const digits = String(whatsappNumber || "").replace(/\D/g, "");

  return digits.length >= 8 ? `https://wa.me/${digits}` : "";
};

export default function SupportFooter() {
  const { settings } = usePlatformSettings();
  const { platformName, tagline } = settings.branding;
  const { supportEmail, supportPhone, whatsappNumber } = settings.contact;
  const whatsappUrl = getWhatsAppUrl(whatsappNumber);
  const hasContacts = Boolean(supportEmail || supportPhone || whatsappNumber);

  return (
    <>
      <footer className="border-t border-white/10 bg-[#050c18] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.2fr_0.7fr_1fr] lg:px-8">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-3"
              aria-label={`${platformName} home`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-950 text-sm font-black text-white shadow-lg shadow-black/20 ring-1 ring-amber-300/30">
                {getBrandInitials(platformName)}
              </span>
              <span>
                <span className="block text-xl font-black text-white">
                  {platformName}
                </span>
                {tagline && (
                  <span className="mt-0.5 block text-xs font-bold uppercase tracking-[0.15em] text-amber-300">
                    {tagline}
                  </span>
                )}
              </span>
            </Link>

            <p className="mt-6 max-w-md text-sm leading-7 text-slate-400">
              A focused digital learning space for commerce and accounting students to learn clearly, practise confidently and prepare for better results.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
              Quick links
            </h2>
            <nav className="mt-5 grid gap-3 text-sm font-semibold" aria-label="Footer navigation">
              <Link to="/" className="w-fit transition hover:text-amber-300">Home</Link>
              <Link to="/#courses" className="w-fit transition hover:text-amber-300">Courses</Link>
              <Link to="/about" className="w-fit transition hover:text-amber-300">About us</Link>
              <Link to="/contact" className="w-fit transition hover:text-amber-300">Contact us</Link>
              <Link to="/login" className="w-fit transition hover:text-amber-300">Student portal</Link>
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
              Get in touch
            </h2>

            {hasContacts ? (
              <div className="mt-5 grid gap-4 text-sm">
                {supportEmail && (
                  <a
                    href={`mailto:${supportEmail}`}
                    className="flex items-start gap-3 transition hover:text-amber-300"
                  >
                    <span className="mt-0.5 text-amber-400" aria-hidden="true">✦</span>
                    <span className="break-all font-semibold">{supportEmail}</span>
                  </a>
                )}

                {supportPhone && (
                  <a
                    href={`tel:${supportPhone}`}
                    className="flex items-start gap-3 transition hover:text-amber-300"
                  >
                    <span className="mt-0.5 text-amber-400" aria-hidden="true">✦</span>
                    <span className="font-semibold">{supportPhone}</span>
                  </a>
                )}

                {whatsappNumber && (
                  whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-3 transition hover:text-amber-300"
                    >
                      <span className="mt-0.5 text-amber-400" aria-hidden="true">✦</span>
                      <span className="font-semibold">WhatsApp: {whatsappNumber}</span>
                    </a>
                  ) : (
                    <span className="font-semibold">WhatsApp: {whatsappNumber}</span>
                  )
                )}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-7 text-slate-400">
                Contact information will be available here soon.
              </p>
            )}

            <Link
              to="/contact"
              className="mt-7 inline-flex rounded-xl border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:border-amber-300/50 hover:bg-white/5 hover:text-amber-300"
            >
              Contact support
            </Link>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} {platformName}. All rights reserved.</p>
            <p>Learning with clarity. Growing with confidence.</p>
          </div>
        </div>
      </footer>

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-950/30 ring-4 ring-white/80 transition hover:-translate-y-1 hover:bg-emerald-400 sm:bottom-7 sm:right-7"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7">
            <path d="M20.5 11.7a8.3 8.3 0 0 1-12.3 7.25L3 20.5l1.55-5.05A8.3 8.3 0 1 1 20.5 11.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M8.05 7.75c.2-.45.42-.46.72-.47h.6c.2 0 .4.08.5.34l.78 1.9c.08.23.05.43-.08.62l-.6.73c-.16.18-.1.35 0 .52.52.9 1.23 1.65 2.1 2.2.2.12.38.1.53-.07l.85-1.03c.16-.2.38-.22.6-.14l1.86.88c.25.12.35.3.3.55-.18.88-.72 1.65-1.5 2.1-.46.27-1.08.4-2.03.1-1.12-.35-2.4-1.02-3.76-2.28-1.18-1.1-2.1-2.43-2.58-3.72-.42-1.12-.02-1.92.2-2.23Z" fill="currentColor" />
          </svg>
        </a>
      )}
    </>
  );
}
