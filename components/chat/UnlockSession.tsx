"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

type UnlockFormValues = {
  password: string;
};

interface UnlockSessionProps {
  onUnlock: (password: string) => Promise<void>;
  onUseLogin: () => void;
}

export default function UnlockSession({
  onUnlock,
  onUseLogin,
}: UnlockSessionProps) {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UnlockFormValues>();

  const submit: SubmitHandler<UnlockFormValues> = async ({ password }) => {
    setError(null);

    try {
      await onUnlock(password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not unlock session");
    }
  };

  return (
    <div
      className="min-h-dvh w-full flex items-center justify-center px-4 py-8"
      style={{ background: "var(--bg-app)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/logo.avif"
            alt="Yapp logo"
            width={64}
            height={64}
            priority
            className="mx-auto mb-4 rounded-2xl object-cover"
          />
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Unlock Yapp
          </h1>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          {error && (
            <div
              className="rounded-lg p-3 text-sm"
              role="alert"
              style={{
                background: "#2d1515",
                color: "#f87171",
                border: "1px solid #7f1d1d",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                aria-label="Password"
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "unlock-password-error" : undefined
                }
                className="w-full rounded-lg py-3 pl-4 pr-12 text-sm focus:outline-none"
                style={{
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
                {...register("password", {
                  required: "Password is required",
                  maxLength: {
                    value: 128,
                    message: "Password must be 128 characters or less",
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg transition-opacity hover:opacity-75 cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p
                id="unlock-password-error"
                className="mt-1 text-xs"
                style={{ color: "#f87171" }}
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--accent)" }}
          >
            {isSubmitting ? "Unlocking..." : "Unlock"}
          </button>
        </form>

        <button
          type="button"
          onClick={onUseLogin}
          className="w-full text-center text-sm mt-6 font-medium cursor-pointer"
          style={{ color: "var(--accent)" }}
        >
          Sign in instead
        </button>
      </div>
    </div>
  );
}
