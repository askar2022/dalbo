import Link from "next/link";

type JourneyView = "discover" | "order" | "track";

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
    description: "Customers, restaurants, and drivers all stay connected through one Dalbo experience.",
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
        <div className="mt-4 rounded-[22px] bg-[#0b1020] p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
            Tracking
          </p>
          <p className="mt-2 text-lg font-semibold leading-6">Your order is on the way.</p>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[#ff6200]" />
            <p className="text-sm font-medium text-slate-900">Restaurant confirmed</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[#ff6200]" />
            <p className="text-sm font-medium text-slate-900">Driver picked up order</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-orange-200" />
            <p className="text-sm font-medium text-slate-500">Arriving in 8 minutes</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-orange-50 p-3 text-sm text-slate-700">
          Track in real time until your food reaches the door.
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

        <section className="space-y-8">
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

            <div id="how-it-works" className="space-y-5">
              <div className="max-w-2xl space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
                  How It Works
                </p>
                <h2 className="text-4xl font-bold tracking-tight">
                  From craving to delivery, made simple.
                </h2>
                <p className="text-base leading-7 text-slate-600">
                  Everything a customer cares about comes down to three simple moments: find
                  something good, order quickly, and track it all the way home.
                </p>
              </div>

              <div className="flex max-w-6xl flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                {steps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex flex-col items-center gap-6 xl:flex-row xl:flex-1 xl:justify-center"
                  >
                    <article
                      className={`mx-auto flex w-full max-w-[360px] flex-col rounded-[36px] border bg-[#fff7f1] p-4 transition duration-200 hover:-translate-y-1 sm:p-5 ${
                        index === 1
                          ? "border-orange-300 shadow-[0_0_0_1px_rgba(255,98,0,0.18)]"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="mx-auto w-full max-w-[250px]">
                        <JourneyPhone view={step.view} />
                      </div>
                      <div className="px-2 pb-3 pt-2 sm:px-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
                            {step.step}
                          </span>
                        </div>
                        <h3 className="mt-3 text-3xl font-semibold leading-9">{step.title}</h3>
                        <p className="mt-3 text-base leading-8 text-slate-600">
                          {step.description}
                        </p>
                      </div>
                    </article>

                    {index < steps.length - 1 ? (
                      <div className="hidden text-center text-4xl font-semibold text-orange-300 xl:block">
                        →
                      </div>
                    ) : null}
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
              Dalbo is built to make ordering feel easy for customers while still keeping restaurant
              operations and delivery flow organized behind the scenes.
            </p>
          </div>

          <div className="rounded-[36px] border border-orange-100 bg-white p-7">
            <div className="rounded-[28px] bg-[#0b1020] p-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
                Why customers choose Dalbo
              </p>
              <h3 className="mt-4 text-3xl font-semibold">
                Fast ordering, clearer tracking, and trusted local restaurants.
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The experience is designed to feel simple on the surface while keeping every order
                moving cleanly from restaurant to driver to customer.
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
