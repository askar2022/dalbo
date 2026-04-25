import Image from "next/image";
import Link from "next/link";

type PartnerLoginHeaderProps = {
  current: "driver" | "food_place" | "admin";
};

const navItems = [
  { id: "driver", label: "Driver login", href: "/login/driver" },
  { id: "food_place", label: "Food Place login", href: "/login/food-place" },
  { id: "admin", label: "Admin login", href: "/login/admin" },
] as const;

export function PartnerLoginHeader({ current }: PartnerLoginHeaderProps) {
  return (
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
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`rounded-2xl px-4 py-2 transition ${
              item.id === current
                ? "bg-[#ff6200] text-white"
                : "border border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/login/customer"
          className="rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300"
        >
          Start ordering
        </Link>
      </nav>
    </header>
  );
}
