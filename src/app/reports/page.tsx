import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getCurrentWorkspace, getRequiredUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export default async function ReportsPage() {
  const user = await getRequiredUser();
  const membership = await getCurrentWorkspace(user.id);
  const workspaceId = membership?.workspace_id;
  const supabase = await supabaseServer();

  const [{ data: reports }, { data: players }, { data: matches }] = await Promise.all([
    supabase.from("reports").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("players").select("id,full_name").eq("workspace_id", workspaceId),
    supabase.from("matches").select("id,home_team,away_team,match_date").eq("workspace_id", workspaceId),
  ]);

  async function createReport(formData: FormData) {
    "use server";
    const supabase = await supabaseServer();
    await supabase.from("reports").insert({
      workspace_id: workspaceId,
      player_id: String(formData.get("player_id")),
      match_id: String(formData.get("match_id") || "") || null,
      report_type: String(formData.get("report_type")),
      executive_summary: String(formData.get("executive_summary")),
      strengths: String(formData.get("strengths") || "").split("\n").filter(Boolean),
      weaknesses: String(formData.get("weaknesses") || "").split("\n").filter(Boolean),
      tactical_fit: String(formData.get("tactical_fit")),
      overall_score: Number(formData.get("overall_score") || 0),
      recommendation: String(formData.get("recommendation")),
      evidence: JSON.parse(String(formData.get("evidence") || "[]")),
      created_by: user.id,
    });
    revalidatePath("/reports");
  }

  return (
    <div className="space-y-4"><h2 className="text-2xl font-semibold">Reports</h2>
      <form action={createReport} className="card grid md:grid-cols-2 gap-2">
        <select name="player_id" required>{players?.map((p) => <option value={p.id} key={p.id}>{p.full_name}</option>)}</select>
        <select name="match_id"><option value="">Sin partido</option>{matches?.map((m) => <option value={m.id} key={m.id}>{m.home_team} vs {m.away_team} ({m.match_date})</option>)}</select>
        <input name="report_type" defaultValue="post" /><input name="overall_score" type="number" step="0.1" min="0" max="10" />
        <input name="tactical_fit" defaultValue="medium" /><input name="recommendation" defaultValue="monitor" />
        <textarea className="md:col-span-2" name="executive_summary" placeholder="Resumen" required />
        <textarea name="strengths" placeholder="fortaleza por línea" />
        <textarea name="weaknesses" placeholder="debilidad por línea" />
        <textarea className="md:col-span-2" name="evidence" defaultValue='[{"minute":62,"note":"Buen pressing","tag":"pressing"}]' />
        <button className="bg-cyan-600 md:col-span-2">Crear reporte</button>
      </form>
      <div className="card">{reports?.map((r) => <p key={r.id}><Link href={`/reports/${r.id}`}>{r.executive_summary.slice(0, 90)}</Link> · {r.overall_score}</p>)}</div>
    </div>
  );
}
