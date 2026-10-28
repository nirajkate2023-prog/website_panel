import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in | Get-ID Admin Panel" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen place-items-center bg-[#f3f5f7] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-green-600 text-lg font-black text-white">
            Gi
          </span>
          <h1 className="text-xl font-bold text-zinc-800">Get-ID</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Employee Panel
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
