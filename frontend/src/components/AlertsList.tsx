import type { Alert } from "../types";

interface Props {
  alerts: Alert[];
}

export default function AlertsList({ alerts }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
        Sensor Alerts
      </h2>
      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 text-accent">
          <span className="h-2 w-2 rounded-full bg-accent" />
          All parameters within the crop corridor.
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a, i) => {
            const critical = a.severity === "CRITICAL";
            return (
              <li
                key={i}
                className={`rounded-lg border p-3 ${
                  critical ? "border-danger/40 bg-danger/10" : "border-warning/40 bg-warning/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-text-primary">
                    {a.param}: {a.value.toFixed(1)}
                  </span>
                  <span className={`text-xs font-semibold ${critical ? "text-danger" : "text-warning"}`}>
                    {a.severity}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text-secondary">normal: {a.normal_range}</div>
                <div className="mt-1 text-sm text-text-primary">→ {a.action}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
