import { Eye, EyeOff } from "lucide-react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface PasswordFieldProps {
  autoComplete: string;
  describedBy: string;
  error?: FieldError;
  label: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
  show: boolean;
  toggleLabel?: string;
  onToggle: () => void;
}

export default function PasswordField({
  autoComplete,
  describedBy,
  error,
  label,
  placeholder,
  registration,
  show,
  toggleLabel = "password",
  onToggle,
}: PasswordFieldProps) {
  const action = show ? "Hide" : "Show";
  const buttonLabel = `${action} ${toggleLabel}`;

  return (
    <div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? describedBy : undefined}
          className="w-full rounded-lg py-3 pl-4 pr-12 text-sm focus:outline-none"
          style={{
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
          {...registration}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg transition-opacity hover:opacity-75 cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
          aria-label={buttonLabel}
          title={buttonLabel}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <p id={describedBy} className="mt-1 text-xs" style={{ color: "#f87171" }}>
          {error.message}
        </p>
      )}
    </div>
  );
}
