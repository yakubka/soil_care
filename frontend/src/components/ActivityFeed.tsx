import Icon from "./Icon";
import { kstTime } from "../lib/time";
import type { ActivityItem } from "../types";

interface Props {
  items: ActivityItem[];
}

export default function ActivityFeed({ items }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Live Pipeline · ingest → DB → model
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-accent">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          streaming
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-text-secondary">Waiting for the first reading…</div>
      ) : (
        <ul className="space-y-2 font-mono text-xs">
          {items.map((it, idx) => {
            const sevColor =
              it.max_severity === "CRITICAL"
                ? "text-danger"
                : it.max_severity === "WARNING"
                ? "text-warning"
                : "text-text-secondary";
            return (
              <li
                key={it.reading_id}
                className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border/60 px-3 py-2 ${
                  idx === 0 ? "bg-accent/5" : "bg-bg/40"
                }`}
              >
                <span className="text-text-secondary">{kstTime(it.timestamp)}</span>
                <span className="text-info">#{it.reading_id}</span>
                <span className="text-text-secondary">stored</span>
                <span className="text-text-secondary">·</span>
                <span className="inline-flex items-center gap-1 text-accent">
                  <Icon name="sprout" className="h-3.5 w-3.5" />
                  {it.recommended_crop ?? "—"}
                </span>
                {it.crop_confidence != null && (
                  <span className="text-text-secondary">{(it.crop_confidence * 100).toFixed(0)}%</span>
                )}
                <span className="text-text-secondary">·</span>
                <span className="inline-flex items-center gap-1 text-nutrient">
                  <Icon name="flask" className="h-3.5 w-3.5" />
                  {it.recommended_fertilizer ?? "—"}
                </span>
                <span className="text-text-secondary">·</span>
                <span className={`inline-flex items-center gap-1 ${sevColor}`}>
                  {it.alert_count === 0 ? (
                    <>
                      <Icon name="check" className="h-3 w-3" /> ok
                    </>
                  ) : (
                    <>
                      <Icon name="warning" className="h-3 w-3" /> {it.alert_count} alert
                      {it.alert_count > 1 ? "s" : ""}
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
