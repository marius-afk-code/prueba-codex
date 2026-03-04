import Link from "next/link";
import { getCurrentWorkspace, getRequiredUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export default async function Dashboard() {
  const user = await getRequiredUser();
  const membership = await getCurrentWorkspace(user.id);
  const workspaceId = membership?.workspace_id;
  const supabase = await supabaseServer();

  const [{ data: reports }, { data: shortlist }] = await Promise.all([
    supabase.from("reports").select("id, executive_summary, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(5),
    supabase.from("players").select("id, full_name, team").eq("workspace_id", workspaceId).eq("status", "shortlist").limit(5),
  ]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <div className="flex gap-2">
        <Link href="/players" className="card">Nuevo jugador</Link>
        <Link href="/reports" className="card">Nuevo reporte</Link>
        <Link href="/ai" className="card">Generar con IA</Link>
      </div>
      <section className="card">
        <h3 className="font-semibold mb-2">Últimos reportes</h3>
        <ul className="space-y-2">{reports?.map((r) => <li key={r.id} className="text-sm">{r.executive_summary}</li>)}</ul>
      </section>
      <section className="card">
        <h3 className="font-semibold mb-2">Shortlist</h3>
        <ul className="space-y-2">{shortlist?.map((p) => <li key={p.id} className="text-sm">{p.full_name} · {p.team}</li>)}</ul>
      </section>
    </div>
  );
}
