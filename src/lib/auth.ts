import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

export async function getRequiredUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/login");
  return data.user;
}

export async function getCurrentWorkspace(userId: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id,name)")
    .eq("user_id", userId)
    .limit(1)
    .single();
  return data;
}
