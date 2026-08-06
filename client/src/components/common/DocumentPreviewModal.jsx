import { useEffect } from "react";

export default function DocumentPreviewModal({
  isOpen,
  url,
  contentType = "",
  title = "Document preview",
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !url) {
    return null;
  }

  const isPdf = contentType.includes("pdf");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-2 sm:p-5"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[96vh] w-full max-w-7xl min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="min-w-0 truncate font-black text-slate-950">
            {title}
          </h2>

          <div className="flex shrink-0 gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700"
            >
              New tab
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-900 p-2 sm:p-4">
          {isPdf ? (
            <iframe
              src={url}
              title={title}
              className="h-full min-h-[70vh] w-full bg-white"
            />
          ) : (
            <img
              src={url}
              alt={title}
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}
