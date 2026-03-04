"use client";

import { useEffect, useState } from "react";

type AnyObj = Record<string, any>;

export default function AIStudioPage() {
  const [kind, setKind] = useState("report_summary");
  const [playerId, setPlayerId] = useState("");
  const [matchId, setMatchId] = useState("");
  const [reportId, setReportId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [output, setOutput] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, playerId, matchId, reportId, instructions, input: { playerId, matchId, reportId } }) });
    const data = await res.json();
    setOutput(data.output || null);
    setLoading(false);
  }

  async function saveReport() {
    if (!output) return;
    await fetch("/api/reports/from-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...output, player_id: playerId || null, match_id: matchId || null }) });
    alert("Reporte guardado");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">AI Studio</h2>
      <div className="card grid md:grid-cols-2 gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="report_summary">Generar informe</option>
          <option value="infographic_layout">Generar infografía</option>
          <option value="comparison">Comparar jugadores</option>
        </select>
        <input placeholder="player_id" value={playerId} onChange={(e) => setPlayerId(e.target.value)} />
        <input placeholder="match_id" value={matchId} onChange={(e) => setMatchId(e.target.value)} />
        <input placeholder="report_id" value={reportId} onChange={(e) => setReportId(e.target.value)} />
        <textarea className="md:col-span-2" placeholder="Instrucciones" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        <button onClick={generate} className="bg-cyan-600 md:col-span-2">{loading ? "Generando..." : "GENERAR"}</button>
      </div>
      {output && kind === "report_summary" && (
        <div className="card space-y-2"><h3 className="font-semibold">Previsualización informe</h3><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre><button onClick={saveReport} className="bg-emerald-600">Guardar como Report</button></div>
      )}
      {output && kind === "infographic_layout" && (
        <div className="card space-y-3">
          <h3 className="text-xl font-semibold">{output.title}</h3>
          <p className="text-slate-300">{output.subtitle}</p>
          {(output.blocks || []).map((b: AnyObj, idx: number) => (
            <div key={idx} className="card bg-slate-800">
              {b.type === "kpi_row" && <div className="grid grid-cols-2 gap-2">{(b.items || []).map((it: AnyObj, i: number) => <div key={i} className="card"><p className="text-xs">{it.label}</p><p className="text-lg font-semibold">{it.value}</p></div>)}</div>}
              {b.type === "bullets" && <div><h4 className="font-semibold">{b.title}</h4><ul className="list-disc pl-5">{(b.items || []).map((it: string, i: number) => <li key={i}>{it}</li>)}</ul></div>}
              {b.type === "quote" && <blockquote className="italic">“{b.text}”</blockquote>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
