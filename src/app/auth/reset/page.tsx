import { supabaseServer } from "@/lib/supabase";

export default function ResetPage() {
  async function reset(formData: FormData) {
    "use server";
    const supabase = await supabaseServer();
    const email = String(formData.get("email") || "");
    await supabase.auth.resetPasswordForEmail(email);
  }

  return (
    <form action={reset} className="max-w-md card space-y-3">
      <h2 className="text-xl font-semibold">Reset Password</h2>
      <input name="email" placeholder="Email" type="email" required />
      <button className="bg-cyan-600">Enviar enlace</button>
    </form>
  );
}
