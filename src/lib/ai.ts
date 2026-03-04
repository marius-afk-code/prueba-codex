import { z } from "zod";

export const reportSchema = z.object({
  executive_summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  tactical_fit: z.enum(["high", "medium", "low"]),
  overall_score: z.number().min(0).max(10),
  recommendation: z.enum(["sign", "monitor", "reject"]),
  evidence: z.array(z.object({ minute: z.number(), note: z.string(), tag: z.string() })),
});

export const infographicSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  blocks: z.array(z.object({
    type: z.enum(["kpi_row", "bullets", "quote"]),
    title: z.string().optional(),
    text: z.string().optional(),
    items: z.array(z.any()).optional(),
  })),
});
