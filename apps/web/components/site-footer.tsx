import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "About Dalbo", href: "/about" },
  { label: "Start ordering", href: "/login/customer" },
  { label: "Driver login", href: "/login/driver" },
  { label: "Food Place login", href: "/login/food-place" },
  { label: "Admin login", href: "/login/admin" },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#fffaf5] px-6 pb-8 pt-2 text-[#0b1020] lg:pb-12">
      <div className="mx-auto max-w-6xl rounded-[40px] bg-[#0b1020] px-8 py-10 text-white">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-5">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/logo_dalbo.png"
                alt="Dalbo logo"
                width={170}
                height={52}
                className="h-12 w-auto object-contain brightness-0 invert"
              />
            </Link>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
                Company Story
              </p>
              <h2 className="max-w-2xl text-4xl font-bold tracking-tight">
                A platform with room to grow alongside restaurants and delivery teams.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Dalbo connects ordering, restaurant operations, driver coordination, and platform
                management into one simple delivery experience.
              </p>
            </div>

            <p className="text-sm leading-6 text-slate-300">
              Designed and implemented by Dr. Abdimalik Askar, powered by Automation, LLC.
            </p>

            <div className="space-y-2 text-sm leading-6 text-slate-300">
              <p className="font-semibold uppercase tracking-[0.25em] text-orange-300">Support</p>
              <p>
                Email:{" "}
                <a className="text-white underline-offset-4 hover:underline" href="mailto:support@dalbo.app">
                  support@dalbo.app
                </a>
              </p>
              <p>
                Phone:{" "}
                <a className="text-white underline-offset-4 hover:underline" href="tel:16127039647">
                  612-703-9647
                </a>
              </p>
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 text-[#0b1020]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
              Quick Links
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
