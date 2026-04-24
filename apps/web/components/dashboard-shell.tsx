"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type DashboardShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats: Array<{ label: string; value: string }>;
  actions: Array<{ title: string; description: string }>;
  children?: ReactNode;
};

export function DashboardShell({
  eyebrow,
  title,
  description,
  stats,
  actions,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-6 rounded-[32px] border border-orange-100 bg-white p-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
              {eyebrow}
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
              <p className="max-w-2xl text-lg text-slate-600">{description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <article key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{stat.label}</p>
              <p className="mt-4 text-3xl font-bold">{stat.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">{children}</div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Next actions</h2>
            <div className="mt-5 space-y-4">
              {actions.map((action) => (
                <div key={action.title} className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
