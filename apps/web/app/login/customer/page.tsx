import { AuthForm } from "../../../components/auth-form";

export default function CustomerLoginPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto max-w-6xl">
        <AuthForm
          audience="customer"
          badge="Start ordering"
          title="Order from your favorite food places and track every delivery step."
          description="Sign in to browse menus, save your delivery address, and place your next Dalbo order."
          infoTitle="What you can do here"
          infoItems={[
            "Browse restaurants and available menu items.",
            "Use email or SMS code to continue securely.",
            "Place orders and track status updates in one place.",
          ]}
          homeHref="/login"
          homeLabel="Choose another login type"
          allowSignUp={true}
          allowedMethods={["email", "sms"]}
        />
      </div>
    </main>
  );
}
