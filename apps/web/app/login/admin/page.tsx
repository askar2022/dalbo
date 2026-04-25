import { AuthForm } from "../../../components/auth-form";
import { PartnerLoginHeader } from "../../../components/partner-login-header";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <PartnerLoginHeader current="admin" />
        <AuthForm
          audience="admin"
          badge="Admin login"
          title="Sign in to monitor the Dalbo platform, orders, drivers, restaurants, and ratings."
          description="This page is reserved for Dalbo admins who need platform-wide visibility across operations and partner activity."
          infoTitle="Admin access"
          infoItems={[
            "Use the admin email account already created for you.",
            "Review platform health, current orders, restaurants, drivers, and ratings.",
            "Driver and restaurant account requests are still handled by email for now.",
          ]}
          homeHref="mailto:support@dalbo.app?subject=Request%20admin%20access"
          homeLabel="Request admin access"
          homePrompt="Need an admin account?"
          homeVariant="button"
          allowSignUp={false}
          allowedMethods={["email"]}
        />
      </div>
    </main>
  );
}
