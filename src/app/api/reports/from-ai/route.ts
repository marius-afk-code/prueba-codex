import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getCurrentWorkspace } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const membership = await getCurrentWorkspace(auth.user.id);
  const body = await req.json();

  const { data, error } = await supabase.from("reports").insert({
    workspace_id: membership?.workspace_id,
    player_id: body.player_id,
    match_id: body.match_id || null,
    report_type: body.report_type || "post",
    executive_summary: body.executive_summary,
    strengths: body.strengths || [],
    weaknesses: body.weaknesses || [],
    tactical_fit: body.tactical_fit || "medium",
    overall_score: body.overall_score || 0,
    recommendation: body.recommendation || "monitor",
    evidence: body.evidence || [],
    created_by: auth.user.id,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
