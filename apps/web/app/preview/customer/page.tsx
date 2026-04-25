import { DashboardPreviewShell } from "../../../components/dashboard-preview-shell";

const recentOrders = [
  { restaurant: "Dalbo Kitchen", total: "$24.80", status: "On the way" },
  { restaurant: "Somali Grill", total: "$18.20", status: "Delivered" },
  { restaurant: "East Side Cafe", total: "$31.40", status: "Preparing" },
];

const restaurants = [
  { name: "Dalbo Kitchen", cuisine: "Fast casual", eta: "18 min" },
  { name: "Riverfront Pizza", cuisine: "Pizza", eta: "25 min" },
  { name: "East Side Cafe", cuisine: "Coffee and breakfast", eta: "12 min" },
];

export default function CustomerPreviewPage() {
  return (
    <DashboardPreviewShell
      eyebrow="Customer dashboard preview"
      title="Order again, track delivery, and manage saved addresses"
      description="A quick mock of the customer experience so you can inspect the screen without a login."
      loginHref="/login/customer"
      stats={[
        { label: "Active orders", value: "2" },
        { label: "Saved addresses", value: "3" },
        { label: "Favorite places", value: "8" },
      ]}
      actions={[
        { title: "Test real login", description: "Use the customer login page when you want live data." },
        { title: "Review checkout", description: "Next, verify cart and payment behavior with a real account." },
      ]}
    >
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold">Recent orders</h2>
          <div className="mt-4 space-y-3">
            {recentOrders.map((order) => (
              <div key={`${order.restaurant}-${order.status}`} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{order.restaurant}</p>
                    <p className="text-sm text-slate-600">{order.status}</p>
                  </div>
                  <p className="text-sm font-semibold">{order.total}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Recommended places</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {restaurants.map((restaurant) => (
              <div key={restaurant.name} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold">{restaurant.name}</p>
                <p className="mt-2 text-sm text-slate-600">{restaurant.cuisine}</p>
                <p className="mt-3 text-sm font-semibold text-orange-600">{restaurant.eta}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-slate-50 p-4">
          <h2 className="text-xl font-semibold">Saved addresses</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Home: 128 Cedar Ave, Minneapolis</p>
            <p>Work: 500 Nicollet Mall, Minneapolis</p>
            <p>Family: 231 Lake St, Saint Paul</p>
          </div>
        </section>
      </div>
    </DashboardPreviewShell>
  );
}
