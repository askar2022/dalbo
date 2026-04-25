import Image from "next/image";
import Link from "next/link";

type JourneyView = "discover" | "order" | "track";

const benefitCards = [
  {
    title: "Fast ordering flow",
    description: "A clean browse-to-checkout experience built to keep ordering fast and simple.",
  },
  {
    title: "Real-time operations",
    description: "Restaurants, drivers, and orders stay aligned with live status updates.",
  },
  {
    title: "One connected platform",
    description: "Restaurants, drivers, and delivery operations stay connected through one Dalbo experience.",
  },
];

const steps: Array<{
  step: string;
  title: string;
  description: string;
  view: JourneyView;
}> = [
  {
    step: "01",
    title: "Find Your Favorite Food",
    description: "Browse local restaurants and discover meals you love, fast and easy.",
    view: "discover",
  },
  {
    step: "02",
    title: "Order in Seconds",
    description: "Choose your meal, customize your order, and check out in just a few taps.",
    view: "order",
  },
  {
    step: "03",
    title: "Track & Enjoy",
    description: "Follow your order in real time and enjoy fresh food delivered to your door.",
    view: "track",
  },
];

function JourneyPhone({ view }: { view: JourneyView }) {
  if (view === "discover") {
    return (
      <div className="rounded-[28px] bg-white p-3">
        <div className="rounded-[24px] border border-slate-200 bg-[#fffaf5] p-3">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span>Dalbo</span>
            <span>9:41</span>
          </div>
          <div className="mt-3 rounded-[20px] bg-[#ff6200] p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100">
              Discover
            </p>
            <p className="mt-2 text-lg font-semibold leading-6">Good food, ready near you.</p>
            <div className="mt-3 rounded-2xl bg-white/20 px-3 py-2 text-xs">
              Search restaurants, burgers, pizza...
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">Spice Garden</p>
              <p className="mt-1 text-xs text-slate-500">Indian . 25-30 min</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">Mama's Kitchen</p>
              <p className="mt-1 text-xs text-slate-500">Home food . 20-25 min</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "order") {
    return (
      <div className="rounded-[28px] bg-white p-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span>Dalbo</span>
            <span>9:41</span>
          </div>
          <div className="mt-4">
            <p className="text-lg font-semibold text-slate-900">Classic Burger</p>
            <p className="mt-1 text-xs text-slate-500">
              Beef patty, lettuce, tomato, and house sauce.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                <span>Classic Burger</span>
                <span>$12.99</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Qty 1 . Add cheese . No onions</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                <span>Orange Juice</span>
                <span>$3.99</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Fresh chilled drink</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">$16.98</span>
            </div>
            <button className="mt-3 w-full rounded-2xl bg-[#ff6200] px-4 py-3 text-sm font-semibold text-white">
              Checkout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] bg-white p-3">
      <div className="rounded-[24px] border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span>Dalbo</span>
          <span>9:41</span>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Estimated arrival</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">25-30 min</p>
            </div>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-semibold text-orange-600">
              On the way
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-col items-center gap-2 text-center text-green-600">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span>Confirmed</span>
          </div>
          <div className="h-[2px] flex-1 bg-green-400" />
          <div className="flex flex-col items-center gap-2 text-center text-green-600">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span>Preparing</span>
          </div>
          <div className="h-[2px] flex-1 bg-[#ff6200]" />
          <div className="flex flex-col items-center gap-2 text-center text-[#ff6200]">
            <span className="h-3 w-3 rounded-full bg-[#ff6200]" />
            <span>On the way</span>
          </div>
          <div className="h-[2px] flex-1 bg-slate-200" />
          <div className="flex flex-col items-center gap-2 text-center text-slate-400">
            <span className="h-3 w-3 rounded-full bg-slate-300" />
            <span>Delivered</span>
          </div>
        </div>
        <div className="mt-4 rounded-[24px] border border-slate-200 bg-[#fffaf5] p-3">
          <div className="relative h-40 overflow-hidden rounded-[20px] bg-[#eef4f7]">
            <div className="absolute inset-0 opacity-60">
              <div className="absolute left-5 top-6 h-20 w-28 rounded-full border border-slate-200" />
              <div className="absolute right-6 top-8 h-16 w-24 rounded-full border border-slate-200" />
              <div className="absolute left-16 bottom-6 h-14 w-32 rounded-full border border-slate-200" />
            </div>
            <svg
              viewBox="0 0 260 160"
              className="absolute inset-0 h-full w-full"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M36 128 C78 110, 110 68, 152 74 C185 80, 205 42, 226 26"
                stroke="#ff6200"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute bottom-6 left-8 flex h-8 w-8 items-center justify-center rounded-full bg-[#ff6200] text-sm text-white">
              🍽️
            </div>
            <div className="absolute left-[48%] top-[46%] flex h-9 w-9 items-center justify-center rounded-full bg-[#ff6200] text-sm text-white shadow-sm">
              🛵
            </div>
            <div className="absolute right-6 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-base shadow-sm">
              🏠
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] text-[#0b1020]">
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-8 lg:py-12">
        <header className="flex flex-col gap-5 rounded-[36px] border border-orange-100 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo_dalbo.png"
              alt="Dalbo logo"
              width={170}
              height={52}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <a href="#how-it-works" className="text-slate-600 transition hover:text-slate-900">
              How it works
            </a>
            <Link
              href="/about"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300"
            >
              About Dalbo
            </Link>
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

        <section className="space-y-8">
          <div className="space-y-7">
            <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
              Food delivery platform
            </span>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
                Good food, delivered faster with one connected Dalbo platform.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Dalbo brings ordering, restaurant operations, and delivery management into one
                simple connected experience.
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
              <Link
                href="/about"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300"
              >
                About Dalbo
              </Link>
            </div>

            <div id="how-it-works" className="space-y-5">
              <div className="max-w-2xl space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
                  How It Works
                </p>
                <h2 className="text-4xl font-bold tracking-tight">
                  From craving to delivery, made simple.
                </h2>
                <p className="text-base leading-7 text-slate-600">
                  Everything comes down to three simple moments: find something good, order
                  quickly, and track it all the way home.
                </p>
              </div>

              <div className="grid max-w-6xl gap-6 xl:grid-cols-3">
                {steps.map((step, index) => (
                  <div key={step.title} className="flex h-full justify-center">
                    <article
                      className="mx-auto flex h-full w-full max-w-[340px] flex-col rounded-[36px] border border-slate-200 bg-[#fff7f1] p-5 transition duration-200 hover:-translate-y-1 xl:min-h-[640px]"
                    >
                      <div className="flex min-h-[350px] items-start justify-center">
                        <div className="mx-auto w-full max-w-[240px]">
                        <JourneyPhone view={step.view} />
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col px-2 pb-3 pt-4 sm:px-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
                            {step.step}
                          </span>
                        </div>
                        <h3 className="mt-4 text-[26px] font-semibold leading-8 sm:text-[30px] sm:leading-9">
                          {step.title}
                        </h3>
                        <p className="mt-3 text-[15px] leading-8 text-slate-600 sm:text-base">
                          {step.description}
                        </p>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
              Why Dalbo
            </p>
            <h2 className="text-4xl font-bold tracking-tight">
              A delivery brand that feels modern, simple, and ready to scale.
            </h2>
            <p className="text-base leading-7 text-slate-600">
              Dalbo is built to make ordering feel easy while still keeping restaurant operations
              and delivery flow organized behind the scenes.
            </p>
          </div>

          <div className="rounded-[36px] border border-orange-100 bg-white p-7">
            <div className="rounded-[28px] bg-[#0b1020] p-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
                Why teams choose Dalbo
              </p>
              <h3 className="mt-4 text-3xl font-semibold">
                Fast ordering, clearer tracking, and trusted local restaurants.
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The experience is designed to feel simple on the surface while keeping every order
                moving cleanly from restaurant to delivery.
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

        <section className="rounded-[40px] bg-[#0b1020] px-8 py-10 text-white">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
                Ready To Launch
              </p>
              <h2 className="text-4xl font-bold tracking-tight">
                Bring restaurants, drivers, and delivery operations into one Dalbo experience.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Join Dalbo today and start managing orders, coordinating deliveries, and growing
                with ease.
              </p>
              <p className="text-sm font-medium text-orange-200">
                Fast delivery. Trusted local partners.
              </p>
              <p className="text-sm leading-6 text-slate-300">
                Designed and implemented by Dr. Abdimalik Askar, powered by Automation, LLC.
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
