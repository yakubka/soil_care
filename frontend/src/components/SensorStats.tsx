import type { HistoryPoint } from "../types";

export interface StatField {
  key: keyof HistoryPoint;
  label: string;
  unit: string;
  digits?: number;
}

interface Stat {
  last: number;
  mean: number;
  min: number;
  max: number;
  std: number;
  n: number;
}

function computeStats(vals: number[]): Stat | null {
  if (vals.length === 0) return null;
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return {
    last: vals[vals.length - 1],
    mean,
    min: Math.min(...vals),
    max: Math.max(...vals),
    std: Math.sqrt(variance),
    n,
  };
}

/**
 * Descriptive statistics (mean / min / max / std-dev) over the 24h history,
 * shown only for sensors that actually have data — so it auto-adapts to
 * whatever is currently wired.
 */
export default function SensorStats({
  history,
  fields,
}: {
  history: HistoryPoint[];
  fields: StatField[];
}) {
  const rows = fields
    .map((f) => {
      const vals = history
        .map((h) => h[f.key] as number | null)
        .filter((v): v is number => v != null && !Number.isNaN(v));
      return { f, s: computeStats(vals) };
    })
    .filter((r): r is { f: StatField; s: Stat } => r.s !== null);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-text-secondary">
        No statistics yet — waiting for sensor readings.
      </div>
    );
  }

  const fmt = (v: number, d = 1) => v.toFixed(d);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-text-primary">
        Statistics (last 24h)
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-text-secondary">
            <th className="pb-2">Sensor</th>
            <th className="pb-2 text-right">Now</th>
            <th className="pb-2 text-right">Mean</th>
            <th className="pb-2 text-right">Min</th>
            <th className="pb-2 text-right">Max</th>
            <th className="pb-2 text-right">Std&nbsp;dev</th>
            <th className="pb-2 text-right">Samples</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map(({ f, s }) => {
            const d = f.digits ?? 1;
            return (
              <tr key={f.key as string} className="border-t border-border">
                <td className="py-2 font-sans text-text-primary">
                  {f.label} <span className="text-xs text-text-secondary">{f.unit}</span>
                </td>
                <td className="py-2 text-right text-accent">{fmt(s.last, d)}</td>
                <td className="py-2 text-right text-text-primary">{fmt(s.mean, d)}</td>
                <td className="py-2 text-right text-text-secondary">{fmt(s.min, d)}</td>
                <td className="py-2 text-right text-text-secondary">{fmt(s.max, d)}</td>
                <td className="py-2 text-right text-text-secondary">{fmt(s.std, d)}</td>
                <td className="py-2 text-right text-text-secondary">{s.n}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
