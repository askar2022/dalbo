import Link from "next/link";

const audienceCards = [
  {
    title: "Customer",
    description: "Discover nearby favorites, order in seconds, and follow every step from kitchen to door.",
    eyebrow: "For Customers",
  },
  {
    title: "Food Place",
    description: "Keep menus fresh, accept incoming orders quickly, and manage preparation without chaos.",
    eyebrow: "For Food Places",
  },
  {
    title: "Driver",
    description: "Accept jobs, stay on route, and update delivery progress with a clear driver workflow.",
    eyebrow: "For Drivers",
  },
];

const benefitCards = [
  {
    title: "Fast ordering flow",
    description: "A clean browse-to-checkout experience built to help customers order with less friction.",
  },
  {
    title: "Real-time operations",
    description: "Restaurants, drivers, and customers stay aligned with live order status updates.",
  },
  {
    title: "One connected platform",
    description: "Customer, Food Place, and Driver experiences all work from the same Supabase backend.",
  },
];

const steps = [
  {
    title: "Choose a food place",
    description: "Customers browse restaurants, menus, and available items from one storefront.",
  },
  {
    title: "Place and prepare",
    description: "The Food Place receives the order, confirms it, and moves it through preparation.",
  },
  {
    title: "Deliver with confidence",
    description: "Drivers accept ready orders, pick them up, and complete delivery with status tracking.",
  },
];

const platformPoints = [
  "Customer web and mobile ordering",
  "Food Place dashboard for menus and order flow",
  "Driver dashboard for dispatch and delivery updates",
  "Supabase auth, database, and realtime foundation",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] text-[#0b1020]">
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-8 lg:py-12">
        <header className="flex flex-col gap-5 rounded-[36px] border border-orange-100 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff6200] text-lg font-bold text-white">
              D
            </span>
            <div>
              <p className="text-xl font-semibold">Dalbo</p>
              <p className="text-sm text-slate-500">Order. Deliver. Enjoy.</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <a href="#how-it-works" className="text-slate-600 transition hover:text-slate-900">
              How it works
            </a>
            <a href="#platform" className="text-slate-600 transition hover:text-slate-900">
              Platform
            </a>
            <Link
              href="/login"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300"
            >
              Partner login
            </Link>
            <Link
              href="/login"
              className="rounded-2xl bg-[#ff6200] px-4 py-2 text-white transition hover:bg-[#e35700]"
            >
              Get started
            </Link>
          </nav>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-7">
            <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
              Food delivery for customers, restaurants, and drivers
            </span>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
                Good food, delivered faster with one connected Dalbo platform.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Dalbo brings ordering, restaurant operations, and delivery management into one
                simple experience so customers stay happy and partners stay in control.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-2xl bg-[#ff6200] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#e35700]"
              >
                Start ordering
              </Link>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Explore platform
              </Link>
            </div>

            <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
              <article className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Ordering</p>
                <p className="mt-3 text-3xl font-bold text-[#0b1020]">3 steps</p>
                <p className="mt-2 text-sm text-slate-600">Browse, place, and track with less friction.</p>
              </article>
              <article className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Dashboards</p>
                <p className="mt-3 text-3xl font-bold text-[#0b1020]">3 roles</p>
                <p className="mt-2 text-sm text-slate-600">Customer, Food Place, and Driver all connected.</p>
              </article>
              <article className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Platform</p>
                <p className="mt-3 text-3xl font-bold text-[#0b1020]">1 system</p>
                <p className="mt-2 text-sm text-slate-600">Auth, realtime status, and operations in sync.</p>
              </article>
            </div>
          </div>

          <div className="rounded-[36px] border border-orange-100 bg-white p-7">
            <div className="rounded-[28px] bg-[#0b1020] p-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
                Why Dalbo
              </p>
              <h2 className="mt-4 text-3xl font-semibold">
                A delivery brand that feels modern, simple, and ready to scale.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The platform is designed so customers can order confidently, food places can
                manage menus and orders clearly, and drivers can complete deliveries with less
                confusion.
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              {benefitCards.map((benefit) => (
                <article key={benefit.title} className="rounded-3xl border border-slate-200 p-5">
                  <h3 className="text-lg font-semibold">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
              How It Works
            </p>
            <h2 className="text-4xl font-bold tracking-tight">One order journey, three connected experiences.</h2>
            <p className="text-base leading-7 text-slate-600">
              Dalbo keeps every part of the delivery process aligned, from the first customer tap
              to the final driver dropoff.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-[32px] border border-slate-200 bg-white p-6">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-lg font-bold text-orange-600">
                  0{index + 1}
                </span>
                <h3 className="mt-5 text-2xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="platform" className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
              Platform
            </p>
            <h2 className="text-4xl font-bold tracking-tight">Built for the full delivery operation, not just checkout.</h2>
            <p className="text-base leading-7 text-slate-600">
              The Dalbo website is more than a landing page. It is the entry point into customer
              ordering, restaurant operations, and driver dispatch, all supported by one shared backend.
            </p>

            <div className="grid gap-3">
              {platformPoints.map((point) => (
                <div key={point} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {audienceCards.map((card) => (
              <article key={card.title} className="rounded-[32px] border border-slate-200 bg-white p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
                  {card.eyebrow}
                </p>
                <h3 className="mt-4 text-2xl font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[40px] bg-[#0b1020] px-8 py-10 text-white">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
                Ready To Launch
              </p>
              <h2 className="text-4xl font-bold tracking-tight">
                Bring customers, food places, and drivers into one Dalbo experience.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Start with the live web app today, then continue expanding into payments, native
                mobile flows, and branded partner onboarding.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-[32px] bg-white p-6 text-[#0b1020]">
              <Link
                href="/login"
                className="rounded-2xl bg-[#ff6200] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#e35700]"
              >
                Open Dalbo app
              </Link>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                View internal platform
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
