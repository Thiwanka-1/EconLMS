export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
          {eyebrow}
        </p>

        <h1 className="mt-2 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>

        {description && (
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}
