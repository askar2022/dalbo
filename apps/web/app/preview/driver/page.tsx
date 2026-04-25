import { DashboardPreviewShell } from "../../../components/dashboard-preview-shell";

const availableJobs = [
  { restaurant: "Dalbo Kitchen", dropoff: "Downtown Minneapolis", payout: "$8.50" },
  { restaurant: "Riverfront Pizza", dropoff: "Dinkytown", payout: "$11.20" },
  { restaurant: "East Side Cafe", dropoff: "Saint Paul", payout: "$9.10" },
];

export default function DriverPreviewPage() {
  return (
    <DashboardPreviewShell
      eyebrow="Driver dashboard preview"
      title="Manage delivery jobs and stay ready for the next route"
      description="This mock view lets you check the driver experience quickly without signing in."
      loginHref="/login/driver"
      stats={[
        { label: "Available jobs", value: "6" },
        { label: "Active deliveries", value: "1" },
        { label: "Completed today", value: "9" },
      ]}
      actions={[
        { title: "Test real sign-in", description: "Use the driver login when you want live route data." },
        { title: "Verify uploads", description: "Later, test profile, car, and plate image uploads with a real account." },
      ]}
    >
      <div className="space-y-6">
        <section className="rounded-2xl bg-slate-50 p-4">
          <h2 className="text-xl font-semibold">Current delivery</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Pickup: Dalbo Kitchen, 742 Central Ave NE</p>
            <p>Dropoff: 220 South 6th St, Minneapolis</p>
            <p>Status: Pick up in 7 minutes</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Available jobs</h2>
          <div className="mt-4 space-y-3">
            {availableJobs.map((job) => (
              <div key={`${job.restaurant}-${job.dropoff}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{job.restaurant}</p>
                    <p className="mt-2 text-sm text-slate-600">Dropoff: {job.dropoff}</p>
                  </div>
                  <p className="text-sm font-semibold text-orange-600">{job.payout}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <h2 className="text-lg font-semibold">Vehicle</h2>
            <p className="mt-2 text-sm text-slate-600">Toyota Prius, black, plate DAL-248</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <h2 className="text-lg font-semibold">Rating</h2>
            <p className="mt-2 text-sm text-slate-600">4.9 average across 124 deliveries</p>
          </div>
        </section>
      </div>
    </DashboardPreviewShell>
  );
}
