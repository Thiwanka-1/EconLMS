import {
  Link,
} from "react-router";

import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

const getWhatsAppUrl = (number) => {
  const digits = String(number || "").replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : "";
};

export default function ContactPage() {
  const { settings } = usePlatformSettings();
  const { platformName } = settings.branding;
  const { supportEmail, supportPhone, whatsappNumber } = settings.contact;
  const whatsappUrl = getWhatsAppUrl(whatsappNumber);

  const contactMethods = [
    supportEmail && {
      label: "Email support",
      value: supportEmail,
      description: "Best for account, payment and document questions.",
      href: `mailto:${supportEmail}`,
      action: "Send email",
    },
    supportPhone && {
      label: "Call us",
      value: supportPhone,
      description: "Speak directly with the support team during available hours.",
      href: `tel:${supportPhone}`,
      action: "Call now",
    },
    whatsappNumber && {
      label: "WhatsApp",
      value: whatsappNumber,
      description: "Send a short message with your name and the help you need.",
      href: whatsappUrl,
      action: "Open WhatsApp",
      external: true,
    },
  ].filter(Boolean);

  return (
    <main className="bg-slate-50">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(43,131,255,0.15),transparent_38%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-700">
            Contact {platformName}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-6xl">
            Help is only a message away.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Contact the support team for assistance with registration, payments, identity documents, courses or portal access.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Choose how to reach us</h2>

          {contactMethods.length > 0 ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              {contactMethods.map((method, index) => (
                <article
                  key={method.label}
                  className="flex min-h-64 flex-col rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-sm font-black text-brand-700">
                    0{index + 1}
                  </span>
                  <h3 className="mt-6 text-lg font-black text-slate-950">{method.label}</h3>
                  <p className="mt-1 break-words font-semibold text-brand-700">{method.value}</p>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{method.description}</p>
                  {method.href && (
                    <a
                      href={method.href}
                      target={method.external ? "_blank" : undefined}
                      rel={method.external ? "noreferrer" : undefined}
                      className="mt-6 inline-flex w-fit rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      {method.action}
                    </a>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-950">
              <h3 className="font-black">Contact details are being updated</h3>
              <p className="mt-2 leading-7">
                Please check again shortly or sign in to view support information in the portal.
              </p>
            </div>
          )}
        </div>

        <aside className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-300">
            Faster support
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight">Include these details.</h2>
          <p className="mt-4 leading-7 text-slate-300">
            A clear first message helps the support team understand and resolve your request faster.
          </p>

          <ol className="mt-8 space-y-5">
            {[
              "Your registered full name and account email.",
              "The course or billing month connected to the question.",
              "A short description of what happened.",
              "A screenshot without passwords or verification codes, if useful.",
            ].map((item, index) => (
              <li key={item} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-brand-200">
                  {index + 1}
                </span>
                <span className="pt-1 text-sm leading-6 text-slate-300">{item}</span>
              </li>
            ))}
          </ol>

          <div className="mt-10 border-t border-white/10 pt-7">
            <p className="text-sm leading-6 text-slate-400">
              Never send your password, email verification code or password-reset code to anyone.
            </p>
          </div>
        </aside>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h2 className="text-xl font-black text-slate-950">Already registered?</h2>
            <p className="mt-2 text-slate-600">Sign in to check your notifications and current account status first.</p>
          </div>
          <Link
            to="/login"
            className="w-fit rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white transition hover:bg-brand-700"
          >
            Open student portal
          </Link>
        </div>
      </section>
    </main>
  );
}
