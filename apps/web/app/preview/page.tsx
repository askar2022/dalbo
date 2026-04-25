import Link from "next/link";

const previews = [
  {
    href: "/preview/customer",
    title: "Customer preview",
    description: "Browse restaurants, recent orders, and saved addresses without signing in.",
  },
  {
    href: "/preview/driver",
    title: "Driver preview",
    description: "Review delivery stats, available jobs, and active route details quickly.",
  },
  {
    href: "/preview/food-place",
    title: "Restaurant preview",
    description: "Inspect incoming orders, menu highlights, and store status before real login tests.",
  },
];

export default function PreviewIndexPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-4 rounded-[32px] border border-orange-100 bg-white p-8">
          <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
            Preview mode
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">Open dashboard previews without login</h1>
            <p className="max-w-3xl text-lg text-slate-600">
              These routes use sample data so you can check layout and navigation first, then
              return to the real login flow when you want to test live behavior.
            </p>
          </div>
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {previews.map((preview) => (
            <article key={preview.href} className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-semibold">{preview.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{preview.description}</p>
              <Link
                href={preview.href}
                className="mt-6 inline-flex rounded-2xl bg-[#0b1020] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Open preview
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
