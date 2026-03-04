import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

export default function SignUpPage() {
  async function signup(formData: FormData) {
    "use server";
    const supabase = await supabaseServer();
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const workspace = String(formData.get("workspace") || "Scout Workspace");
    const { data } = await supabase.auth.signUp({ email, password });
    if (data.user) {
      await supabase.from("workspaces").insert({ name: workspace, created_by: data.user.id });
    }
    redirect("/");
  }

  return (
    <form action={signup} className="max-w-md card space-y-3">
      <h2 className="text-xl font-semibold">Registro</h2>
      <input name="workspace" placeholder="Nombre del workspace" required />
      <input name="email" placeholder="Email" type="email" required />
      <input name="password" placeholder="Password" type="password" required />
      <button className="bg-cyan-600">Crear cuenta</button>
    </form>
  );
}
