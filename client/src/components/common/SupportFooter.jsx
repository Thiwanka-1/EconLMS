import {
  Link,
} from "react-router";

import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

const getWhatsAppUrl = (whatsappNumber) => {
  const digits = String(whatsappNumber || "").replace(/\D/g, "");

  return digits.length >= 8 ? `https://wa.me/${digits}` : "";
};

export default function SupportFooter() {
  const { settings } = usePlatformSettings();
  const { platformName } = settings.branding;
  const { supportEmail, supportPhone, whatsappNumber } = settings.contact;
  const whatsappUrl = getWhatsAppUrl(whatsappNumber);
  const hasContacts = Boolean(supportEmail || supportPhone || whatsappNumber);

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-slate-600 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()}{" "}
            <strong className="text-slate-900">{platformName}</strong>
          </p>

          {hasContacts && (
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-semibold transition hover:text-brand-700"
                >
                  {supportEmail}
                </a>
              )}

              {supportPhone && (
                <a
                  href={`tel:${supportPhone}`}
                  className="font-semibold transition hover:text-brand-700"
                >
                  {supportPhone}
                </a>
              )}

              {whatsappNumber && (
                whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold transition hover:text-brand-700"
                  >
                    WhatsApp: {whatsappNumber}
                  </a>
                ) : (
                  <span className="font-semibold">
                    WhatsApp: {whatsappNumber}
                  </span>
                )
              )}
            </div>
          )}
        </div>

        <div className="flex gap-5 border-t border-slate-100 pt-4 text-xs font-bold">
          <Link
            to="/about"
            className="transition hover:text-brand-700"
          >
            About us
          </Link>
          <Link
            to="/contact"
            className="transition hover:text-brand-700"
          >
            Contact us
          </Link>
        </div>
      </div>
    </footer>
  );
}
