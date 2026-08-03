import {
  useState,
} from "react";

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  required = true,
  minLength = 8,
  disabled = false,
  helpText,
}) {
  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

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

      <div className="relative">
        <input
          id={id}
          name={id}
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          disabled={disabled}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 pr-20 text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <button
          type="button"
          onClick={() =>
            setShowPassword(
              (current) => !current
            )
          }
          disabled={disabled}
          className="absolute inset-y-0 right-0 px-4 text-xs font-black text-brand-700 transition hover:text-brand-900 disabled:opacity-50"
        >
          {showPassword
            ? "Hide"
            : "Show"}
        </button>
      </div>

      {helpText && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {helpText}
        </p>
      )}
    </div>
  );
}
