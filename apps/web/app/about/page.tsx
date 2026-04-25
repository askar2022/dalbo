import Image from "next/image";
import Link from "next/link";

const pillars = [
  {
    title: "One connected platform",
    description:
      "Dalbo brings ordering, restaurant operations, and delivery coordination into one place so teams can stay aligned.",
  },
  {
    title: "Built to grow with partners",
    description:
      "The platform is designed for restaurants and delivery teams that want a cleaner, more organized way to manage orders.",
  },
  {
    title: "Focused on a modern experience",
    description:
      "Dalbo aims to feel simple, fast, and trustworthy from the first click through final delivery.",
  },
];

export default function AboutDalboPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-8 text-[#0b1020] lg:py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <header className="flex flex-col gap-5 rounded-[36px] border border-orange-100 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo_dalbo.png"
              alt="Dalbo logo"
              width={170}
              height={52}
              className="h-12 w-auto object-contain"
              priority
            />
          </Link>

          <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <Link
              href="/"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300"
            >
              Login pages
            </Link>
            <span className="rounded-2xl bg-[#ff6200] px-4 py-2 text-white">About Dalbo</span>
            <Link
              href="/login/customer"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300"
            >
              Start ordering
            </Link>
          </nav>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
              About Dalbo
            </span>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl">
                Dalbo is built to make delivery operations feel simple, modern, and connected.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-600">
                Dalbo brings together restaurant management, order flow, driver coordination, and
                customer ordering into one connected delivery platform.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-2xl bg-[#ff6200] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#e35700]"
              >
                Explore Dalbo access
              </Link>
              <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Return home
              </Link>
            </div>
          </div>

          <aside className="rounded-[36px] border border-orange-100 bg-white p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
              Why Dalbo
            </p>
            <h2 className="mt-4 text-3xl font-semibold">A delivery brand designed to scale cleanly.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              The goal is to give restaurants, drivers, and platform admins a more organized system
              while keeping the experience clear and fast for everyone using it.
            </p>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="rounded-[32px] border border-slate-200 bg-white p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
                Dalbo
              </p>
              <h2 className="mt-4 text-2xl font-semibold">{pillar.title}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{pillar.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-[36px] border border-slate-200 bg-white p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
              Mission
            </p>
            <h2 className="mt-4 text-3xl font-semibold">Keep food delivery organized from start to finish.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Dalbo is focused on making the full delivery flow easier to manage, from restaurant
              preparation through driver dispatch and final order completion.
            </p>
          </article>

          <article className="rounded-[36px] border border-slate-200 bg-white p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
              Vision
            </p>
            <h2 className="mt-4 text-3xl font-semibold">Grow a strong network of restaurant partners.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Over time, Dalbo can showcase restaurant partners, driver stories, and richer brand
              visuals while keeping the platform itself clear and practical.
            </p>
          </article>
        </section>

        <section className="rounded-[40px] bg-[#0b1020] px-8 py-10 text-white">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
                Company Story
              </p>
              <h2 className="text-4xl font-bold tracking-tight">
                A platform with room to grow alongside restaurants and delivery teams.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                This page gives Dalbo a place to tell its story, explain the platform, and share the
                bigger brand vision without overloading the homepage.
              </p>
              <p className="text-sm leading-6 text-slate-300">
                Designed and implemented by Dr. Abdimalik Askar, powered by Automation, LLC.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-[32px] bg-white p-6 text-[#0b1020]">
              <Link
                href="/login/food-place"
                className="rounded-2xl bg-[#ff6200] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#e35700]"
              >
                Restaurant login
              </Link>
              <Link
                href="/login/driver"
                className="rounded-2xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Driver login
              </Link>
              <Link
                href="/login/admin"
                className="rounded-2xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Admin login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
