import { AuthForm } from "../../../components/auth-form";

export default function DriverLoginPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto max-w-6xl">
        <AuthForm
          audience="driver"
          badge="Driver login"
          title="Sign in to go online, accept delivery jobs, and complete active trips."
          description="Use your Dalbo driver account to see ready pickups, manage active deliveries, and move each order from pickup to dropoff."
          infoTitle="Driver access"
          infoItems={[
            "Use the driver email account already created for you.",
            "Go online only when you are ready to accept deliveries.",
            "Accept ready jobs, confirm pickup, and mark each trip delivered.",
            "Dalbo does not cover your delivery insurance. You must use your own insurance while delivering customer food orders.",
            "If you need a new driver account, contact Dalbo support or your dispatcher.",
          ]}
          signInAcknowledgementLabel="I understand that Dalbo does not provide delivery insurance. I am responsible for my own insurance coverage while delivering food to customers."
          homeHref="mailto:support@dalbo.app?subject=Request%20driver%20account"
          homeLabel="Request driver account"
          homePrompt="Need a new driver account?"
          homeVariant="button"
          allowSignUp={false}
          allowedMethods={["email"]}
        />
      </div>
    </main>
  );
}
