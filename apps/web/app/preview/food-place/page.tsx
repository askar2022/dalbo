import { DashboardPreviewShell } from "../../../components/dashboard-preview-shell";

const incomingOrders = [
  { id: "#1042", items: "2 items", total: "$27.40", status: "New" },
  { id: "#1041", items: "4 items", total: "$38.10", status: "Preparing" },
  { id: "#1039", items: "1 item", total: "$12.75", status: "Ready" },
];

const menuHighlights = [
  { name: "Chicken Bowl", price: "$13.50" },
  { name: "Spicy Wrap", price: "$11.00" },
  { name: "Mango Smoothie", price: "$6.25" },
];

export default function FoodPlacePreviewPage() {
  return (
    <DashboardPreviewShell
      eyebrow="Restaurant dashboard preview"
      title="Watch incoming orders and manage menu activity"
      description="This preview gives you a fast look at the food-place dashboard without real auth."
      loginHref="/login/food-place"
      stats={[
        { label: "Open orders", value: "7" },
        { label: "Menu items", value: "24" },
        { label: "Delivered today", value: "15" },
      ]}
      actions={[
        { title: "Test partner login", description: "Use the food-place login to check real orders and menu updates." },
        { title: "Verify notifications", description: "Later, test dashboard or email alerts with a real restaurant account." },
      ]}
    >
      <div className="space-y-6">
        <section className="rounded-2xl bg-slate-50 p-4">
          <h2 className="text-xl font-semibold">Store status</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Dalbo Kitchen is open</p>
            <p>Pickup time: 15 to 20 minutes</p>
            <p>Notifications: Dashboard</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Incoming orders</h2>
          <div className="mt-4 space-y-3">
            {incomingOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{order.id}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {order.items} and status {order.status}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-orange-600">{order.total}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Menu highlights</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {menuHighlights.map((item) => (
              <div key={item.name} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold">{item.name}</p>
                <p className="mt-2 text-sm text-slate-600">{item.price}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardPreviewShell>
  );
}
