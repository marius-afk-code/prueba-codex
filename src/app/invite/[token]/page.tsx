import { redirect } from "next/navigation";
import { getRequiredUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export default async function AcceptInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getRequiredUser();
  const supabase = await supabaseServer();

  const { data: invite } = await supabase.from("invitations").select("*").eq("token", token).eq("status", "pending").single();
  if (invite) {
    await supabase.from("workspace_members").insert({ workspace_id: invite.workspace_id, user_id: user.id, role: invite.role });
    await supabase.from("invitations").update({ status: "accepted" }).eq("id", invite.id);
  }
  redirect("/");
}
