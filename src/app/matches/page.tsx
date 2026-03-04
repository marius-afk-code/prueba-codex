import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getCurrentWorkspace, getRequiredUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export default async function MatchesPage() {
  const user = await getRequiredUser();
  const membership = await getCurrentWorkspace(user.id);
  const workspaceId = membership?.workspace_id;
  const supabase = await supabaseServer();
  const { data: matches } = await supabase.from("matches").select("*").eq("workspace_id", workspaceId).order("match_date", { ascending: false });

  async function createMatch(formData: FormData) {
    "use server";
    const supabase = await supabaseServer();
    await supabase.from("matches").insert({
      workspace_id: workspaceId,
      match_date: String(formData.get("match_date")),
      competition: String(formData.get("competition")),
      home_team: String(formData.get("home_team")),
      away_team: String(formData.get("away_team")),
      video_url: String(formData.get("video_url") || ""),
      notes: String(formData.get("notes") || ""),
    });
    revalidatePath("/matches");
  }

  return (
    <div className="space-y-4"><h2 className="text-2xl font-semibold">Matches</h2>
      <form action={createMatch} className="card grid md:grid-cols-3 gap-2">
        <input type="date" name="match_date" required /><input name="competition" placeholder="Competición" required />
        <input name="home_team" placeholder="Home" required /><input name="away_team" placeholder="Away" required />
        <input name="video_url" placeholder="Video URL" /><textarea name="notes" placeholder="Notas" className="md:col-span-3" />
        <button className="bg-cyan-600 md:col-span-3">Crear partido</button>
      </form>
      <div className="card">{matches?.map((m) => <p key={m.id}><Link href={`/matches/${m.id}`}>{m.match_date} · {m.home_team} vs {m.away_team}</Link></p>)}</div>
    </div>
  );
}
