import Link from "next/link";

const dashboards = [
  {
    title: "Customer",
    description: "Browse food places, order meals, and track deliveries in real time.",
  },
  {
    title: "Food Place",
    description: "Manage menus, confirm orders, and keep prep status updated.",
  },
  {
    title: "Driver",
    description: "Accept deliveries, navigate routes, and update pickup and dropoff status.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
              Dalbo platform starter
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Food delivery across web, customer mobile, and driver mobile.
              </h1>
              <p className="max-w-2xl text-lg text-slate-600">
                This starter repo is structured for Next.js, Expo, Supabase, GitHub, and
                Vercel so you can build Dalbo as one platform with three focused dashboards.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-2xl bg-[#ff6200] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e35700]"
              >
                Open auth flow
              </Link>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Open dashboard router
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
              Recommended app split
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Customer: web plus Expo mobile</li>
              <li>Food Place: web dashboard first</li>
              <li>Driver: Expo mobile first</li>
              <li>Backend: Supabase with role-based access</li>
            </ul>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {dashboards.map((dashboard) => (
            <article
              key={dashboard.title}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
                Dashboard
              </p>
              <h2 className="mt-4 text-2xl font-semibold">{dashboard.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{dashboard.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
