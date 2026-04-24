"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { AppRole, getDashboardRoute } from "../lib/auth";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type ProfileRow = {
  role: AppRole;
  full_name: string | null;
};

type ProtectedDashboardProps = {
  expectedRole: AppRole;
  children: ReactNode;
};

export function ProtectedDashboard({
  expectedRole,
  children,
}: ProtectedDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    message?: string;
  }>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function guardRoute() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .maybeSingle<ProfileRow>();

        if (profileError) {
          throw profileError;
        }

        if (!profile) {
          if (isMounted) {
            setState({
              status: "error",
              message:
                "No profile row was found for this user. Create the profile in Supabase or confirm that your auth trigger is running.",
            });
          }
          return;
        }

        const destination = getDashboardRoute(profile.role);

        if (profile.role !== expectedRole && pathname !== destination) {
          router.replace(destination);
          return;
        }

        if (isMounted) {
          setState({ status: "ready" });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            status: "error",
            message:
              error instanceof Error ? error.message : "Unable to load your dashboard right now.",
          });
        }
      }
    }

    guardRoute();

    return () => {
      isMounted = false;
    };
  }, [expectedRole, pathname, router, supabase]);

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf5] px-6 text-[#0b1020]">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600">
          Loading dashboard...
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf5] px-6 text-[#0b1020]">
        <div className="max-w-lg rounded-3xl border border-red-200 bg-white p-6">
          <h1 className="text-xl font-semibold">Dashboard setup still needs one step</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{state.message}</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
