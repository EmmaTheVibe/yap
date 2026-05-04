"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, type SubmitHandler } from "react-hook-form";
import { apiRegister } from "@/lib/api";
import {
  generateKeyPair,
  exportPublicKey,
  wrapPrivateKey,
  generateSalt,
  makePrivateKeyNonExtractable,
} from "@/lib/crypto";
import { clearPrivateKey, saveWrappedSession } from "@/lib/storage";
import { useSession } from "@/components/shared/SessionContext";
import AuthError from "../shared/AuthError";
import AuthHeader from "../shared/AuthHeader";
import EncryptedFootnote from "../shared/EncryptedFootnote";
import PasswordField from "../shared/PasswordField";
import TextField from "../shared/TextField";
import type { RegisterFormValues } from "./types";

export default function RegisterForm() {
  const router = useRouter();
  const { login } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>();

  const onSubmit: SubmitHandler<RegisterFormValues> = async ({
    displayName,
    username,
    password,
  }) => {
    setError(null);

    try {
      const keypair = await generateKeyPair();
      const publicKeyB64 = await exportPublicKey(keypair.publicKey);
      const salt = generateSalt();
      const wrappedPrivateKey = await wrapPrivateKey(
        keypair.privateKey,
        password,
        salt,
      );
      const privateKey = await makePrivateKeyNonExtractable(keypair.privateKey);

      const res = await apiRegister({
        username,
        display_name: displayName,
        password,
        public_key: publicKeyB64,
        wrapped_private_key: wrappedPrivateKey,
        pbkdf2_salt: salt,
      });

      await saveWrappedSession({
        wrapped_private_key: wrappedPrivateKey,
        pbkdf2_salt: salt,
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
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <AuthHeader
        title="Create account"
        subtitle="Your keys are generated on your device 🔑"
        subtitleClassName="mt-5"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <AuthError message={error} />

        <TextField
          label="Display name"
          placeholder="Display name"
          autoComplete="name"
          describedBy="register-display-name-error"
          error={errors.displayName}
          registration={register("displayName", {
            required: "Display name is required",
            maxLength: {
              value: 128,
              message: "Display name must be 128 characters or less",
            },
            setValueAs: (value: string) => value.trim(),
          })}
        />

        <TextField
          label="Username"
          placeholder="Username"
          autoComplete="username"
          describedBy="register-username-error"
          error={errors.username}
          registration={register("username", {
            required: "Username is required",
            minLength: {
              value: 3,
              message: "Username must be at least 3 characters",
            },
            maxLength: {
              value: 32,
              message: "Username must be 32 characters or less",
            },
            pattern: {
              value: /^[A-Za-z0-9_-]+$/,
              message: "Use letters, numbers, underscores, or hyphens",
            },
            setValueAs: (value: string) => value.trim().toLowerCase(),
          })}
        />

        <PasswordField
          label="Password"
          placeholder="Password (min 8 characters)"
          autoComplete="new-password"
          describedBy="register-password-error"
          error={errors.password}
          registration={register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
            maxLength: {
              value: 128,
              message: "Password must be 128 characters or less",
            },
          })}
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />

        <PasswordField
          label="Confirm password"
          placeholder="Confirm password"
          autoComplete="new-password"
          describedBy="register-confirm-password-error"
          error={errors.confirmPassword}
          registration={register("confirmPassword", {
            required: "Confirm your password",
            validate: (value) =>
              value === getValues("password") || "Passwords do not match",
          })}
          show={showConfirmPassword}
          toggleLabel="confirm password"
          onToggle={() => setShowConfirmPassword((value) => !value)}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50 cursor-pointer"
          style={{ background: "var(--accent)" }}
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p
        className="text-center text-sm mt-6"
        style={{ color: "var(--text-secondary)" }}
      >
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium"
          style={{ color: "var(--accent)" }}
        >
          Sign in
        </Link>
      </p>

      <EncryptedFootnote />
    </div>
  );
}
