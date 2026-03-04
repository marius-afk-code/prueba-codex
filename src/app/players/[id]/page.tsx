import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getCurrentWorkspace, getRequiredUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export default async function PlayerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getRequiredUser();
  const membership = await getCurrentWorkspace(user.id);
  const workspaceId = membership?.workspace_id;
  const supabase = await supabaseServer();
  const { data: player } = await supabase.from("players").select("*").eq("workspace_id", workspaceId).eq("id", id).single();
  const { data: reports } = await supabase.from("reports").select("id, executive_summary, overall_score").eq("workspace_id", workspaceId).eq("player_id", id);

  async function updatePlayer(formData: FormData) {
    "use server";
    const supabase = await supabaseServer();
    await supabase.from("players").update({ notes: String(formData.get("notes") || ""), status: String(formData.get("status") || "tracking") }).eq("id", id).eq("workspace_id", workspaceId);
    revalidatePath(`/players/${id}`);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{player?.full_name}</h2>
      <div className="card">
        <p>{player?.team} · {player?.league}</p>
        <p>Posiciones: {player?.positions?.join(", ")}</p>
      </div>
      <form action={updatePlayer} className="card space-y-2 max-w-xl">
        <input name="status" defaultValue={player?.status} />
        <textarea name="notes" defaultValue={player?.notes || ""} />
        <button className="bg-cyan-600">Guardar</button>
      </form>
      <div className="card"><h3 className="font-semibold">Reportes</h3>{reports?.map((r) => <p key={r.id}><Link href={`/reports/${r.id}`}>{r.executive_summary}</Link> · {r.overall_score}</p>)}</div>
      <div className="flex gap-2"><Link href={`/ai?playerId=${id}&template=report_summary`} className="card">Generar informe IA</Link><Link href={`/ai?playerId=${id}&template=infographic_layout`} className="card">Generar infografía IA</Link></div>
    </div>
  );
}
