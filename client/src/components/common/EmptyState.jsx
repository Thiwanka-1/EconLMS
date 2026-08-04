export default function EmptyState({
  title,
  description,
  action,
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-xl font-black text-slate-600">
        EL
      </div>

      <h2 className="mt-5 text-lg font-black text-slate-950">
        {title}
      </h2>

      {description && (
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}
