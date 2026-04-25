import { AuthForm } from "../../../components/auth-form";

export default function CustomerLoginPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto max-w-6xl">
        <AuthForm
          audience="customer"
          badge="Start ordering"
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
