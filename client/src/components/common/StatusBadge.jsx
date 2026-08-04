const statusStyles = {
  active:
    "bg-emerald-100 text-emerald-800",

  approved:
    "bg-emerald-100 text-emerald-800",

  verified:
    "bg-emerald-100 text-emerald-800",

  open:
    "bg-emerald-100 text-emerald-800",

  pending:
    "bg-amber-100 text-amber-900",

  pending_review:
    "bg-amber-100 text-amber-900",

  suspended:
    "bg-orange-100 text-orange-900",

  rejected:
    "bg-red-100 text-red-800",

  cancelled:
    "bg-red-100 text-red-800",

  closed:
    "bg-slate-200 text-slate-700",

  inactive:
    "bg-slate-200 text-slate-700",

  not_enrolled:
    "bg-slate-100 text-slate-700",

  not_uploaded:
    "bg-slate-100 text-slate-700",
};

const formatLabel = (
  value
) => {
  return String(
    value || "unknown"
  )
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
};

export default function StatusBadge({
  status,
  label,
}) {
  const normalizedStatus =
    String(
      status || "unknown"
    ).toLowerCase();

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide",
        statusStyles[
          normalizedStatus
        ] ||
          "bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {label ||
        formatLabel(
          normalizedStatus
        )}
    </span>
  );
}
