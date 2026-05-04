"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, type SubmitHandler } from "react-hook-form";
import { apiLogin } from "@/lib/api";
import { unwrapPrivateKey } from "@/lib/crypto";
import { clearPrivateKey, saveWrappedSession } from "@/lib/storage";
import { useSession } from "@/components/shared/SessionContext";
import AuthError from "../shared/AuthError";
import AuthHeader from "../shared/AuthHeader";
import EncryptedFootnote from "../shared/EncryptedFootnote";
import PasswordField from "../shared/PasswordField";
import TextField from "../shared/TextField";
import type { LoginFormValues } from "./types";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>();

  const onSubmit: SubmitHandler<LoginFormValues> = async ({
    username,
    password,
  }) => {
    setError(null);

    try {
      const res = await apiLogin({ username, password });
      const privateKey = await unwrapPrivateKey(
        res.user.wrapped_private_key,
        password,
        res.user.pbkdf2_salt,
      );

      await saveWrappedSession({
        wrapped_private_key: res.user.wrapped_private_key,
        pbkdf2_salt: res.user.pbkdf2_salt,
        refresh_token: res.refresh_token,
        user_id: res.user.id,
      });
      await clearPrivateKey();

      login({
        user: res.user,
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        privateKey,
      });

      router.replace("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <AuthHeader
        title="Welcome back"
        subtitle="Your messages are always end-to-end encrypted 🔒"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <AuthError message={error} />

        <TextField
          label="Username"
          placeholder="Username"
          autoComplete="username"
          describedBy="login-username-error"
          error={errors.username}
          registration={register("username", {
            required: "Username is required",
            maxLength: {
              value: 32,
              message: "Username must be 32 characters or less",
            },
            setValueAs: (value: string) => value.trim().toLowerCase(),
          })}
        />

        <PasswordField
          label="Password"
          placeholder="Password"
          autoComplete="current-password"
          describedBy="login-password-error"
          error={errors.password}
          registration={register("password", {
            required: "Password is required",
            maxLength: {
              value: 128,
              message: "Password must be 128 characters or less",
            },
          })}
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50 cursor-pointer"
          style={{ background: "var(--accent)" }}
        >
          {isSubmitting ? "Signing in..." : "Login"}
        </button>
      </form>

      <p
        className="text-center text-sm mt-6"
        style={{ color: "var(--text-secondary)" }}
      >
        No account?{" "}
        <Link
          href="/register"
          className="font-medium"
          style={{ color: "var(--accent)" }}
        >
          Sign up
        </Link>
      </p>

      <EncryptedFootnote />
    </div>
  );
}
