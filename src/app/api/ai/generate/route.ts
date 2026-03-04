import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/auth";
import { reportSchema, infographicSchema } from "@/lib/ai";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase";

const buckets = new Map<string, { count: number; resetAt: number }>();

function limited(key: string) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (limited(auth.user.id)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json();
  const membership = await getCurrentWorkspace(auth.user.id);
  if (!membership?.workspace_id) return NextResponse.json({ error: "workspace_missing" }, { status: 400 });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Template: ${body.kind}. Datos: ${JSON.stringify(body.input)}. Instrucciones: ${body.instructions || ""}. Devuelve JSON puro.`;
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: prompt,
  });

  const text = response.output_text;
  let parsed: unknown = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

  if (body.kind === "report_summary") parsed = reportSchema.parse(parsed);
  if (body.kind === "infographic_layout") parsed = infographicSchema.parse(parsed);

  await supabaseAdmin().from("ai_generations").insert({
    workspace_id: membership.workspace_id,
    player_id: body.playerId || null,
    match_id: body.matchId || null,
    report_id: body.reportId || null,
    kind: body.kind,
    input: body,
    output: parsed,
    created_by: auth.user.id,
  });

  return NextResponse.json({ output: parsed });
}
