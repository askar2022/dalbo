import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "../../../components/auth-form";

export default function CustomerLoginPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
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
        <AuthForm
          audience="customer"
          title="Order from your favorite food places and track every delivery step."
          description="Create your account with your name, phone number, email, and password, then sign in with your email and password whenever you want to order."
          infoTitle="What you can do here"
          infoItems={[
            "Browse restaurants and available menu items.",
            "Sign up with first name, last name, phone number, email, and password.",
            "Use your email and password as your only customer sign-in method.",
            "Check your email after sign-up to verify your new account with Dalbo.",
            "Place orders and track status updates in one place.",
          ]}
          homeHref="/login"
          homeLabel="Choose another login type"
          allowSignUp={true}
          allowedMethods={["email"]}
        />
      </div>
    </main>
  );
}
