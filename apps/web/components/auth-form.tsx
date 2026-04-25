"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { getDashboardRoute } from "../lib/auth";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type AuthMode = "sign_in" | "sign_up";
type AuthMethod = "email" | "sms";
type AuthAudience = "customer" | "driver" | "food_place";
type SecurityAlertEvent = "sign_in" | "account_created";
type SendSecurityAlertOptions = {
  eventType: SecurityAlertEvent;
  accessToken?: string;
  userId?: string;
  email?: string;
  displayName?: string;
  audience?: AuthAudience;
};

type ProfileRow = {
  role: "customer" | "driver" | "food_place" | "admin";
};

type AuthFormProps = {
  audience: AuthAudience;
  badge: string;
  title: string;
  description: string;
  infoTitle: string;
  infoItems: string[];
  homeHref?: string;
  homeLabel?: string;
  homePrompt?: string;
  homeVariant?: "link" | "button";
  allowSignUp?: boolean;
  allowedMethods?: AuthMethod[];
  methodSelectionMode?: "tabs" | "fallback";
  signInAcknowledgementLabel?: string;
};

async function fetchUserRole(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  return data?.role ?? "customer";
}

export function AuthForm({
  audience,
  badge,
  title,
  description,
  infoTitle,
  infoItems,
  homeHref = "/",
  homeLabel = "Go back home",
  homePrompt = "Need another entry point?",
  homeVariant = "link",
  allowSignUp = true,
  allowedMethods = ["email", "sms"],
  methodSelectionMode = "tabs",
  signInAcknowledgementLabel,
}: AuthFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [method, setMethod] = useState<AuthMethod>(allowedMethods[0] ?? "email");
  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAcceptedSignInAcknowledgement, setHasAcceptedSignInAcknowledgement] = useState(false);

  async function sendSecurityAlert({
    eventType,
    accessToken,
    userId,
    email: alertEmail,
    displayName,
    audience: alertAudience,
  }: SendSecurityAlertOptions) {
    if (!accessToken && !(eventType === "account_created" && userId && alertEmail)) {
      return;
    }

    try {
      const response = await fetch("/api/auth/security-alert", {
        method: "POST",
        headers: accessToken
          ? {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            }
          : {
              "Content-Type": "application/json",
            },
        body: JSON.stringify({
          eventType,
          userId,
          email: alertEmail,
          displayName,
          audience: alertAudience,
        }),
      });

      if (!response.ok) {
        console.error("Unable to send security alert.");
      }
    } catch (error) {
      console.error("Unable to send security alert.", error);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "sign_in" && signInAcknowledgementLabel && !hasAcceptedSignInAcknowledgement) {
        throw new Error("You must agree that you use your own insurance before signing in.");
      }

      if (method === "sms") {
        if (otpStep === "request") {
          const { error } = await supabase.auth.signInWithOtp({
            phone,
            options: {
              shouldCreateUser: mode === "sign_up",
              data:
                mode === "sign_up"
                  ? isCustomer
                    ? {
                        first_name: firstName,
                        last_name: lastName,
                        full_name: customerFullName,
                        phone,
                      }
                    : { full_name: fullName }
                  : undefined,
            },
          });

          if (error) {
            throw error;
          }

          setOtpStep("verify");
          setSuccessMessage("We sent a 6-digit code to your phone. Enter it below to continue.");
          return;
        }

        const {
          data: { session, user },
          error,
        } = await supabase.auth.verifyOtp({
          phone,
          token: otpCode,
          type: "sms",
        });

        if (error) {
          throw error;
        }

        if (!session || !user) {
          throw new Error("SMS verification completed, but no session was created.");
        }

        await sendSecurityAlert({ eventType: "sign_in", accessToken: session.access_token });
        const role = await fetchUserRole(user.id);
        router.replace(getDashboardRoute(role));
        router.refresh();
        return;
      }

      if (mode === "sign_up" && !allowSignUp) {
        throw new Error("New account registration is not available on this page.");
      }

      if (mode === "sign_up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              ...(isCustomer
                ? {
                    first_name: firstName,
                    last_name: lastName,
                    full_name: customerFullName,
                    phone,
                  }
                : {
                    full_name: fullName,
                  }),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          await sendSecurityAlert({
            eventType: "account_created",
            userId: data.user?.id,
            email: data.user?.email ?? email,
            displayName: isCustomer ? customerFullName : fullName,
            audience,
          });
          setSuccessMessage(
            "Account created. Check your email for Dalbo's verification message, then sign in with your password.",
          );
          setMode("sign_in");
          return;
        }

        const signedInUser = data.user ?? data.session.user;
        await sendSecurityAlert({
          eventType: "account_created",
          accessToken: data.session.access_token,
        });
        const role = await fetchUserRole(signedInUser.id);
        router.replace(getDashboardRoute(role));
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const signedInUser = data.user ?? data.session.user;
      await sendSecurityAlert({ eventType: "sign_in", accessToken: data.session.access_token });
      const role = await fetchUserRole(signedInUser.id);
      router.replace(getDashboardRoute(role));
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong while signing in.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function switchMethod(nextMethod: AuthMethod) {
    if (!allowedMethods.includes(nextMethod)) {
      return;
    }

    setMethod(nextMethod);
    setOtpStep("request");
    setOtpCode("");
    resetMessages();
  }

  const showMethodTabs = allowedMethods.length > 1 && methodSelectionMode === "tabs";
  const showMethodFallback = allowedMethods.length > 1 && methodSelectionMode === "fallback";
  const isCustomer = audience === "customer";
  const shouldShowConsent = isCustomer && mode === "sign_up";
  const customerFullName = `${firstName} ${lastName}`.trim();
  const homeClassName =
    homeVariant === "button"
      ? "mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      : "font-semibold text-orange-600";
  const isExternalHomeHref =
    homeHref.startsWith("mailto:") || homeHref.startsWith("http://") || homeHref.startsWith("https://");

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <section className="space-y-6">
        <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
          {badge}
        </span>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="max-w-2xl text-lg text-slate-600">{description}</p>
        </div>
        <div className="rounded-3xl border border-orange-100 bg-white p-6 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{infoTitle}</p>
          <ul className="mt-3 space-y-2">
            {infoItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-8">
        <div className="flex rounded-full bg-slate-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("sign_in");
              resetMessages();
            }}
            className={`flex-1 rounded-full px-4 py-2 ${
              mode === "sign_in" ? "bg-[#0b1020] text-white" : "text-slate-600"
            }`}
          >
            Sign in
          </button>
          {allowSignUp ? (
            <button
              type="button"
              onClick={() => {
                setMode("sign_up");
                resetMessages();
              }}
              className={`flex-1 rounded-full px-4 py-2 ${
                mode === "sign_up" ? "bg-[#ff6200] text-white" : "text-slate-600"
              }`}
            >
              Sign up
            </button>
          ) : null}
        </div>

        {showMethodTabs ? (
          <div className="mt-4 flex rounded-full bg-slate-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => switchMethod("email")}
              className={`flex-1 rounded-full px-4 py-2 ${
                method === "email" ? "bg-white text-slate-900" : "text-slate-600"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => switchMethod("sms")}
              className={`flex-1 rounded-full px-4 py-2 ${
                method === "sms" ? "bg-white text-slate-900" : "text-slate-600"
              }`}
            >
              SMS code
            </button>
          </div>
        ) : null}

        {isCustomer ? (
          <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-slate-700">
            <p>
              Create your customer account with your name, phone number, email, and password. After
              sign-up, check your email to verify your account with Dalbo.
            </p>
          </div>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {mode === "sign_up" ? (
            isCustomer ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">First name</span>
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                      placeholder="First name"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Last name</span>
                    <input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                      placeholder="Last name"
                      required
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Phone number</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                    placeholder="+15551234567"
                    required
                  />
                </label>
              </>
            ) : (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                  placeholder={audience === "driver" ? "Driver full name" : "Business owner name"}
                  required
                />
              </label>
            )
          ) : null}

          {method === "email" ? (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                  placeholder={
                    audience === "customer"
                      ? "customer@dalbo.app"
                      : audience === "driver"
                        ? "driver@dalbo.app"
                        : "foodplace@dalbo.app"
                  }
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
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

              {mode === "sign_in" ? (
                <div className="text-right">
                  <Link
                    href={`/login/reset-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                    className="text-sm font-semibold text-orange-600"
                  >
                    Forgot password?
                  </Link>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Phone number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                  placeholder="+15551234567"
                  required
                />
              </label>

              {otpStep === "verify" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">6-digit code</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400"
                    placeholder="123456"
                    required
                  />
                </label>
              ) : null}
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

          {mode === "sign_in" && signInAcknowledgementLabel ? (
            <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={hasAcceptedSignInAcknowledgement}
                onChange={(event) => setHasAcceptedSignInAcknowledgement(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                required
              />
              <span>{signInAcknowledgementLabel}</span>
            </label>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-[#ff6200] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#e35700] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Please wait..."
              : method === "sms"
                ? otpStep === "request"
                  ? "Send 6-digit code"
                  : "Verify code"
                : mode === "sign_in"
                  ? audience === "customer"
                    ? "Start ordering"
                    : audience === "driver"
                      ? "Driver sign in"
                      : "Food Place sign in"
                  : audience === "customer"
                    ? "Create customer account"
                    : "Create account"}
          </button>

          {showMethodFallback ? (
            <button
              type="button"
              onClick={() => switchMethod(method === "email" ? "sms" : "email")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {method === "email" ? "Use phone with a 6-digit code instead" : "Use email and password instead"}
            </button>
          ) : null}

          {method === "sms" && otpStep === "verify" ? (
            <button
              type="button"
              onClick={() => {
                setOtpStep("request");
                setOtpCode("");
                resetMessages();
              }}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Change phone or resend
            </button>
          ) : null}

          {shouldShowConsent ? (
            <p className="text-sm leading-6 text-slate-500">
              By continuing, you agree to receive account verification and account-related messages
              from Dalbo by email. We may also use your phone number for account and order updates.
            </p>
          ) : null}
        </form>

        {homeVariant === "button" ? (
          <div className="mt-6 space-y-2">
            <p className="text-sm text-slate-500">{homePrompt}</p>
            {isExternalHomeHref ? (
              <a href={homeHref} className={homeClassName}>
                {homeLabel}
              </a>
            ) : (
              <Link href={homeHref} className={homeClassName}>
                {homeLabel}
              </Link>
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            {homePrompt}{" "}
            {isExternalHomeHref ? (
              <a href={homeHref} className={homeClassName}>
                {homeLabel}
              </a>
            ) : (
              <Link href={homeHref} className={homeClassName}>
                {homeLabel}
              </Link>
            )}
          </p>
        )}
      </section>
    </div>
  );
}
