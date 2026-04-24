import Link from "next/link";

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
    step: "01",
    icon: "🍽️",
    title: "Find Your Favorite Food",
    description: "Browse local restaurants and discover meals you love, fast and easy.",
  },
  {
    step: "02",
    icon: "🛒",
    title: "Order in Seconds",
    description: "Choose your meal, customize your order, and check out in just a few taps.",
  },
  {
    step: "03",
    icon: "🚚",
    title: "Track & Enjoy",
    description: "Follow your order in real time and enjoy fresh food delivered to your door.",
  },
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
            <Link
              href="/login/driver"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300"
            >
              Driver login
            </Link>
            <Link
              href="/login/food-place"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300"
            >
              Food Place login
            </Link>
            <Link
              href="/login/customer"
              className="rounded-2xl bg-[#ff6200] px-4 py-2 text-white transition hover:bg-[#e35700]"
            >
              Start ordering
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
                href="/login/customer"
                className="rounded-2xl bg-[#ff6200] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#e35700]"
              >
                Start ordering
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Partner with Dalbo
              </Link>
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
                The platform is designed so customers can order confidently, restaurants can
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
            <h2 className="text-4xl font-bold tracking-tight">From craving to delivery, made simple.</h2>
            <p className="text-base leading-7 text-slate-600">
              Everything a customer cares about comes down to three simple moments: find something
              good, order quickly, and track it all the way home.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.title} className="rounded-[32px] border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-xl">
                    {step.icon}
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
                    {step.step}
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
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
                Bring customers, restaurants, and drivers into one Dalbo experience.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Join Dalbo today and start reaching more customers, managing orders, and
                delivering with ease.
              </p>
              <p className="text-sm font-medium text-orange-200">
                Fast delivery. Trusted local partners.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-[32px] bg-white p-6 text-[#0b1020]">
              <Link
                href="/login/customer"
                className="rounded-2xl bg-[#ff6200] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#e35700]"
              >
                Start ordering
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Partner with Dalbo
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
