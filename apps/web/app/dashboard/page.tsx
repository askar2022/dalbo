"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { getDashboardRoute } from "../../lib/auth";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

type ProfileRow = {
  role: "customer" | "driver" | "food_place" | "admin";
};

export default function DashboardIndexPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    async function routeUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle<ProfileRow>();

      router.replace(getDashboardRoute(profile?.role ?? "customer"));
    }

    routeUser();
  }, [router, supabase]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf5] px-6 text-[#0b1020]">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600">
        Routing to your dashboard...
      </div>
    </main>
  );
}
