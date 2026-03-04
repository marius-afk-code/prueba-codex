import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getCurrentWorkspace, getRequiredUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; league?: string }> }) {
  const params = await searchParams;
  const user = await getRequiredUser();
  const membership = await getCurrentWorkspace(user.id);
  const workspaceId = membership?.workspace_id;
  const supabase = await supabaseServer();

  let query = supabase.from("players").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (params.q) query = query.ilike("full_name", `%${params.q}%`);
  if (params.status) query = query.eq("status", params.status);
  if (params.league) query = query.eq("league", params.league);
  const { data: players } = await query;

  async function createPlayer(formData: FormData) {
    "use server";
    const supabase = await supabaseServer();
    await supabase.from("players").insert({
      workspace_id: workspaceId,
      full_name: String(formData.get("full_name") || ""),
      birth_year: Number(formData.get("birth_year") || 2000),
      positions: String(formData.get("positions") || "").split(",").map((x) => x.trim()).filter(Boolean),
      foot: String(formData.get("foot") || "R"),
      team: String(formData.get("team") || ""),
      league: String(formData.get("league") || ""),
      status: String(formData.get("status") || "tracking"),
      tags: String(formData.get("tags") || "").split(",").map((x) => x.trim()).filter(Boolean),
      notes: String(formData.get("notes") || ""),
    });
    revalidatePath("/players");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Players</h2>
      <form className="card grid gap-2 md:grid-cols-4" action="/players" method="get">
        <input name="q" placeholder="Buscar" defaultValue={params.q} />
        <input name="status" placeholder="tracking/shortlist/rejected" defaultValue={params.status} />
        <input name="league" placeholder="Liga" defaultValue={params.league} />
        <button className="bg-cyan-600">Filtrar</button>
      </form>
      <form action={createPlayer} className="card grid md:grid-cols-3 gap-2">
        <input name="full_name" placeholder="Nombre" required /><input name="birth_year" type="number" placeholder="Año" required />
        <input name="positions" placeholder="ST,RW" required /><input name="foot" placeholder="R" required /><input name="team" placeholder="Equipo" required />
        <input name="league" placeholder="Liga" required /><input name="status" placeholder="tracking" required /><input name="tags" placeholder="pressing,fast" />
        <textarea name="notes" placeholder="Notas" className="md:col-span-3" />
        <button className="bg-cyan-600 md:col-span-3">Crear jugador</button>
      </form>
      <div className="card overflow-auto"><table className="w-full text-sm"><thead><tr><th>Nombre</th><th>Equipo</th><th>Status</th></tr></thead><tbody>{players?.map((p) => <tr key={p.id} className="border-t border-slate-800"><td><Link href={`/players/${p.id}`}>{p.full_name}</Link></td><td>{p.team}</td><td>{p.status}</td></tr>)}</tbody></table></div>
    </div>
  );
}
