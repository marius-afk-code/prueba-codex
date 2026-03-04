import { getCurrentWorkspace, getRequiredUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export default async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getRequiredUser();
  const membership = await getCurrentWorkspace(user.id);
  const workspaceId = membership?.workspace_id;
  const supabase = await supabaseServer();

  const { data: match } = await supabase.from("matches").select("*").eq("workspace_id", workspaceId).eq("id", id).single();
  const { data: reports } = await supabase.from("reports").select("id,executive_summary").eq("workspace_id", workspaceId).eq("match_id", id);

  return <div className="space-y-3"><h2 className="text-2xl">{match?.home_team} vs {match?.away_team}</h2><div className="card"><a href={match?.video_url || "#"}>Video</a><p>{match?.notes}</p></div><div className="card">{reports?.map((r) => <p key={r.id}>{r.executive_summary}</p>)}</div></div>;
}
