import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface TextFieldProps {
  autoComplete: string;
  describedBy: string;
  error?: FieldError;
  label: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
}

export default function TextField({
  autoComplete,
  describedBy,
  error,
  label,
  placeholder,
  registration,
}: TextFieldProps) {
  return (
    <div>
      <input
        type="text"
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? describedBy : undefined}
        className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
        style={{
          background: "var(--bg-input)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
        {...registration}
      />
      {error && (
        <p id={describedBy} className="mt-1 text-xs" style={{ color: "#f87171" }}>
          {error.message}
        </p>
      )}
    </div>
  );
}
