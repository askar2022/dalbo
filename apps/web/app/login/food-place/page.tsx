import { AuthForm } from "../../../components/auth-form";

export default function FoodPlaceLoginPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto max-w-6xl">
        <AuthForm
          audience="food_place"
          badge="Food Place login"
          title="Sign in to manage menus, incoming orders, and preparation flow."
          description="This page is for restaurant and food place partners who manage Dalbo orders and menu operations."
          infoTitle="Partner access"
          infoItems={[
            "Use the food place email account assigned to your business.",
            "Manage restaurant details, menu categories, items, and incoming orders.",
            "If you need account setup help, contact Dalbo support.",
          ]}
          homeHref="mailto:support@dalbo.app?subject=Request%20restaurant%20account"
          homeLabel="Request restaurant account"
          homePrompt="Need a new restaurant account?"
          homeVariant="button"
          allowSignUp={false}
          allowedMethods={["email"]}
        />
      </div>
    </main>
  );
}
