const variantStyles = {
  error:
    "border-red-200 bg-red-50 text-red-800",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800",
  info:
    "border-brand-200 bg-brand-50 text-brand-800",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900",
};

export default function StatusMessage({
  children,
  variant = "info",
}) {
  if (!children) {
    return null;
  }

  return (
    <div
      role={
        variant === "error"
          ? "alert"
          : "status"
      }
      className={[
        "rounded-2xl border px-4 py-3 text-sm font-semibold leading-6",
        variantStyles[variant] ||
          variantStyles.info,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
