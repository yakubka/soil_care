import type { Analysis } from "../types";
import StatusBadge from "./StatusBadge";

interface Props {
  analysis: Analysis | null;
}

function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`;
}

export default function RecommendationCard({ analysis }: Props) {
  if (!analysis) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-text-secondary">
        No analysis yet. Send sensor data or run a manual test.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
        Recommendations
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs text-text-secondary">Recommended crop</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-xl font-semibold text-accent">
              {analysis.recommended_crop ?? "—"}
            </span>
            <StatusBadge label={pct(analysis.crop_confidence)} tone="accent" />
          </div>
          {analysis.soil_type && (
            <div className="mt-1 text-xs text-text-secondary">soil: {analysis.soil_type}</div>
          )}
        </div>

        <div>
          <div className="text-xs text-text-secondary">Recommended fertilizer</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-xl font-semibold text-info">
              {analysis.recommended_fertilizer ?? "—"}
            </span>
            <StatusBadge label={pct(analysis.fertilizer_confidence)} tone="info" />
          </div>
        </div>
      </div>
    </div>
  );
}
