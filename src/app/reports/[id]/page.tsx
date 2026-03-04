import { revalidatePath } from "next/cache";
import { getCurrentWorkspace, getRequiredUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getRequiredUser();
  const membership = await getCurrentWorkspace(user.id);
  const workspaceId = membership?.workspace_id;
  const supabase = await supabaseServer();
  const { data: report } = await supabase.from("reports").select("*").eq("workspace_id", workspaceId).eq("id", id).single();

  async function updateReport(formData: FormData) {
    "use server";
    const supabase = await supabaseServer();
    await supabase.from("reports").update({ executive_summary: String(formData.get("executive_summary")), overall_score: Number(formData.get("overall_score") || 0) }).eq("id", id).eq("workspace_id", workspaceId);
    revalidatePath(`/reports/${id}`);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">Report detail</h2>
      <form action={updateReport} className="card space-y-2 max-w-2xl">
        <textarea name="executive_summary" defaultValue={report?.executive_summary} />
        <input name="overall_score" defaultValue={report?.overall_score} />
        <button className="bg-cyan-600">Guardar</button>
      </form>
      <div className="card"><h3>Print view</h3><pre>{JSON.stringify(report, null, 2)}</pre></div>
    </div>
  );
}
