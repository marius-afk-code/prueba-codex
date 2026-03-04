import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentWorkspace, getRequiredUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export default async function WorkspaceSettingsPage() {
  const user = await getRequiredUser();
  const membership = await getCurrentWorkspace(user.id);
  const workspaceId = membership?.workspace_id;
  const supabase = await supabaseServer();
  const { data: members } = await supabase.from("workspace_members").select("user_id, role").eq("workspace_id", workspaceId);
  const { data: invites } = await supabase.from("invitations").select("id,email,status,token").eq("workspace_id", workspaceId);

  async function invite(formData: FormData) {
    "use server";
    const supabase = await supabaseServer();
    const email = String(formData.get("email") || "");
    const role = String(formData.get("role") || "member");
    await supabase.from("invitations").insert({ workspace_id: workspaceId, email, role, token: randomUUID(), status: "pending" });
    revalidatePath("/settings/workspace");
  }

  async function removeMember(formData: FormData) {
    "use server";
    const supabase = await supabaseServer();
    const userId = String(formData.get("user_id") || "");
    await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", userId);
    revalidatePath("/settings/workspace");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Workspace Settings</h2>
      <form action={invite} className="card space-y-2 max-w-lg">
        <h3 className="font-semibold">Invitar miembro</h3>
        <input name="email" type="email" required placeholder="email@club.com" />
        <select name="role"><option value="member">member</option></select>
        <button className="bg-cyan-600">Enviar invitación</button>
      </form>
      <div className="card"><h3 className="font-semibold">Miembros</h3>{members?.map((m) => <form key={m.user_id} action={removeMember} className="flex justify-between mt-2"><input type="hidden" name="user_id" value={m.user_id} /><span>{m.user_id} · {m.role}</span><button className="bg-rose-700">Eliminar</button></form>)}</div>
      <div className="card"><h3 className="font-semibold">Invitaciones</h3>{invites?.map((i) => <p key={i.id}>{i.email} - {i.status} - /invite/{i.token}</p>)}</div>
    </div>
  );
}
