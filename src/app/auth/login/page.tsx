import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";
    const supabase = await supabaseServer();
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    await supabase.auth.signInWithPassword({ email, password });
    redirect("/");
  }

  return (
    <form action={login} className="max-w-md card space-y-3">
      <h2 className="text-xl font-semibold">Login</h2>
      <input name="email" placeholder="Email" type="email" required />
      <input name="password" placeholder="Password" type="password" required />
      <button className="bg-cyan-600">Entrar</button>
    </form>
  );
}
