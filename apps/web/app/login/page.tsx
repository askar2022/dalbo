import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <section className="space-y-4 text-center">
          <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
            Dalbo sign in
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Choose how you want to enter Dalbo.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Customers should start ordering, while drivers and food places should use their own
            partner login pages.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Link
            href="/login/customer"
            className="rounded-[32px] border border-slate-200 bg-white p-6 transition hover:border-orange-200"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
              Customer
            </p>
            <h2 className="mt-4 text-2xl font-semibold">Start ordering</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Browse restaurants, sign in, and continue to the ordering experience.
            </p>
          </Link>

          <Link
            href="/login/food-place"
            className="rounded-[32px] border border-slate-200 bg-white p-6 transition hover:border-orange-200"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
              Food Place
            </p>
            <h2 className="mt-4 text-2xl font-semibold">Partner login</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Manage menus, incoming orders, and preparation updates.
            </p>
          </Link>

          <Link
            href="/login/driver"
            className="rounded-[32px] border border-slate-200 bg-white p-6 transition hover:border-orange-200"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
              Driver
            </p>
            <h2 className="mt-4 text-2xl font-semibold">Driver login</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Accept jobs, update trip status, and complete deliveries.
            </p>
          </Link>
        </section>

        <div className="text-center text-sm text-slate-500">
          <Link href="/" className="font-semibold text-orange-600">
            Return to the Dalbo homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
