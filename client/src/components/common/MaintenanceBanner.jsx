import {
  usePlatformSettings,
} from "../../settings/usePlatformSettings.js";

export default function MaintenanceBanner() {
  const {
    settings,
  } = usePlatformSettings();

  const notice =
    settings.maintenanceNotice;

  if (
    !notice.enabled ||
    !notice.message.trim()
  ) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-300 bg-amber-50 text-amber-950"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-6 lg:px-8">
        <span className="shrink-0 text-xs font-black uppercase tracking-[0.14em] text-amber-800">
          Maintenance notice
        </span>

        <span className="hidden text-amber-400 sm:inline">
          •
        </span>

        <p className="text-sm font-semibold leading-6">
          {notice.message}
        </p>
      </div>
    </div>
  );
}