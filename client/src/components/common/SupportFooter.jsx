import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

const getWhatsAppUrl = (
  whatsappNumber
) => {
  const digits = String(
    whatsappNumber || ""
  ).replace(/\D/g, "");

  return digits.length >= 8
    ? `https://wa.me/${digits}`
    : "";
};

export default function SupportFooter() {
  const {
    settings,
  } = usePlatformSettings();

  const {
    platformName,
  } = settings.branding;

  const {
    supportEmail,
    supportPhone,
    whatsappNumber,
  } = settings.contact;

  const whatsappUrl =
    getWhatsAppUrl(
      whatsappNumber
    );

  const hasContacts = Boolean(
    supportEmail ||
      supportPhone ||
      whatsappNumber
  );

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          © {new Date().getFullYear()}{" "}
          <strong className="text-slate-900">
            {platformName}
          </strong>
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
    </footer>
  );
}