import { AuthForm } from "../../../components/auth-form";

export default function DriverLoginPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto max-w-6xl">
        <AuthForm
          audience="driver"
          badge="Driver login"
          title="Sign in to accept deliveries, follow routes, and update trip status."
          description="This page is for Dalbo drivers only. Use your assigned account to access delivery jobs and active trips."
          infoTitle="Driver access"
          infoItems={[
            "Use the driver email account already created for you.",
            "Go online, accept ready jobs, and mark deliveries complete.",
            "If you need a new account, contact Dalbo support or your dispatcher.",
          ]}
          homeHref="/login"
          homeLabel="Choose another login type"
          allowSignUp={false}
          allowedMethods={["email"]}
        />
      </div>
    </main>
  );
}
