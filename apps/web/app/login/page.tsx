import { AuthForm } from "../../components/auth-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-[#0b1020]">
      <div className="mx-auto max-w-6xl">
        <AuthForm />
      </div>
    </main>
  );
}
