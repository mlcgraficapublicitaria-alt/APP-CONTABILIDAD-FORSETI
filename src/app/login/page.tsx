import { redirect } from "next/navigation";
import { hasValidSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await hasValidSession()) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1020] px-6 py-10 text-white">
      <LoginForm />
    </main>
  );
}
