import type { Analysis, SensorReading } from "../types";

export type Tone = "accent" | "warning" | "danger" | "info" | "muted";

export interface Status {
  label: string;
  tone: Tone;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export function moistureStatus(v: number | null | undefined): Status {
  if (v == null) return { label: "—", tone: "muted" };
  if (v < 18) return { label: "CRITICAL DRY", tone: "danger" };
  if (v < 28) return { label: "DRY", tone: "warning" };
  if (v > 75) return { label: "WET", tone: "info" };
  if (v >= 40 && v <= 65) return { label: "OPTIMAL", tone: "accent" };
  return { label: "NORMAL", tone: "muted" };
}

export function airStatus(t: number | null | undefined): Status {
  if (t == null) return { label: "—", tone: "muted" };
  if (t < 15) return { label: "COLD", tone: "info" };
  if (t > 34) return { label: "HOT", tone: "warning" };
  return { label: "NORMAL", tone: "accent" };
}

export function soilTempStatus(t: number | null | undefined): Status {
  if (t == null) return { label: "—", tone: "muted" };
  if (t >= 18 && t <= 26) return { label: "OPTIMAL", tone: "accent" };
  if (t < 12 || t > 32) return { label: "STRESS", tone: "warning" };
  return { label: "NORMAL", tone: "muted" };
}

export function lightStatus(lux: number | null | undefined): Status {
  if (lux == null) return { label: "—", tone: "muted" };
  if (lux < 400) return { label: "LOW LIGHT", tone: "warning" };
  if (lux > 2500) return { label: "BRIGHT", tone: "info" };
  return { label: "OK", tone: "accent" };
}

// Sub-scores 0..100 — proximity to the ideal value.
export function moistureScore(v: number | null | undefined): number {
  if (v == null) return 0;
  return Math.round(clamp(100 - Math.abs(v - 52) * 2.2));
}
export function tempScore(t: number | null | undefined): number {
  if (t == null) return 0;
  return Math.round(clamp(100 - Math.abs(t - 22) * 4));
}
export function lightScore(lux: number | null | undefined): number {
  if (lux == null) return 0;
  return Math.round(clamp((lux / 1100) * 100));
}

export function healthScore(r: SensorReading | null | undefined): number {
  if (!r) return 0;
  const m = moistureScore(r.moisture);
  const t = tempScore(r.soil_temperature ?? r.temperature);
  const l = lightScore(r.light_intensity);
  return Math.round(m * 0.45 + t * 0.35 + l * 0.2);
}

export function healthLabel(score: number): Status {
  if (score >= 80) return { label: "Excellent", tone: "accent" };
  if (score >= 60) return { label: "Good Condition", tone: "accent" };
  if (score >= 40) return { label: "Fair", tone: "warning" };
  return { label: "Needs Attention", tone: "danger" };
}

export interface Prediction {
  label: string;
  value: number; // 0..100
  tone: Tone;
}

export function predictions(r: SensorReading | null | undefined): Prediction[] {
  const moisture = r?.moisture ?? 50;
  const health = healthScore(r);
  return [
    {
      label: "Needs watering soon",
      value: Math.round(clamp((52 - moisture) * 3 + 20)),
      tone: "warning",
    },
    { label: "Optimal conditions", value: clamp(health), tone: "accent" },
    {
      label: "Overwatered risk",
      value: Math.round(clamp((moisture - 65) * 4)),
      tone: "danger",
    },
  ];
}

export interface Recommendation {
  text: string;
  tone: Tone;
}

export function recommendations(
  r: SensorReading | null | undefined,
  a: Analysis | null | undefined
): Recommendation[] {
  const recs: Recommendation[] = [];
  const m = r?.moisture;
  const lux = r?.light_intensity;

  if (m != null && m < 28)
    recs.push({ text: `Water needed — soil moisture ${m.toFixed(0)}% is below target`, tone: "warning" });
  else if (m != null && m > 70)
    recs.push({ text: "Hold watering — soil is near saturation, risk of waterlogging", tone: "info" });
  else
    recs.push({ text: "Moisture is in the healthy band — keep current watering schedule", tone: "accent" });

  if (lux != null && lux < 400)
    recs.push({ text: `Move to brighter spot — ${lux.toFixed(0)} lux is below optimal (800+)`, tone: "warning" });
  else recs.push({ text: "Light level is adequate for growth", tone: "accent" });

  if (a?.recommended_crop)
    recs.push({
      text: `Best-fit crop for this soil: ${a.recommended_crop}` +
        (a.recommended_fertilizer ? ` · fertilizer: ${a.recommended_fertilizer}` : ""),
      tone: "accent",
    });

  return recs;
}
