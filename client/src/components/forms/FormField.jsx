export default function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required = false,
  disabled = false,
  maxLength,
  minLength,
  inputMode,
  helpText,
  multiline = false,
  rows = 4,
}) {
  const sharedProps = {
    id,
    name: id,
    value,
    onChange,
    placeholder,
    autoComplete,
    required,
    disabled,
    maxLength,
    minLength,
    inputMode,
    className:
      "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-800"
      >
        {label}

        {required && (
          <span
            className="ml-1 text-red-600"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>

      {multiline ? (
        <textarea
          {...sharedProps}
          rows={rows}
        />
      ) : (
        <input
          {...sharedProps}
          type={type}
        />
      )}

      {helpText && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {helpText}
        </p>
      )}
    </div>
  );
}
