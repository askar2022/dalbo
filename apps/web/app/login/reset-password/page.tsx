"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setEmail(searchParams.get("email") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes("type=recovery")) {
      setIsRecoveryMode(true);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setErrorMessage("");
        setSuccessMessage("Create a new password for your Dalbo account.");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        (typeof window !== "undefined" ? window.location.origin : "");

      const redirectTo = new URL("/login/reset-password", baseUrl).toString();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage("We sent you a password reset link. Check your email to continue.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "We could not send the reset link right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 6) {
      setErrorMessage("Your new password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Your passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      setSuccessMessage("Your password was updated. You can return to sign in now.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "We could not update your password right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
            Account security
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {isRecoveryMode ? "Create a new password" : "Reset your Dalbo password"}
            </h1>
            <p className="max-w-2xl text-lg text-slate-600">
              {isRecoveryMode
                ? "Choose a new password to secure your account and continue safely."
                : "Enter your email and we will send you a secure reset link."}
            </p>
          </div>
          <div className="rounded-3xl border border-orange-100 bg-white p-6 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Security tips</p>
            <ul className="mt-3 space-y-2">
              <li>Use a password you do not reuse on other apps.</li>
              <li>If you got a Dalbo security alert you did not expect, reset your password now.</li>
              <li>After changing your password, sign in again from a trusted device.</li>
            </ul>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-8">
          <form
            className="space-y-5"
            onSubmit={isRecoveryMode ? handleUpdatePassword : handleRequestReset}
          >
            {!isRecoveryMode ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                  placeholder="customer@dalbo.app"
                  required
                />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">New password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Confirm new password
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                    placeholder="Repeat your new password"
                    minLength={6}
                    required
                  />
                </label>
              </>
            )}

            {errorMessage ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMessage}</p>
            ) : null}

            {successMessage ? (
              <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#ff6200] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#e35700] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Please wait..."
                : isRecoveryMode
                  ? "Update password"
                  : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Back to{" "}
            <Link href="/login" className="font-semibold text-orange-600">
              Dalbo sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
