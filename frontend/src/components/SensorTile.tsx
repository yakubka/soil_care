import Sparkline from "./Sparkline";
import Icon from "./Icon";
import type { Status, Tone } from "../lib/derive";

const TONE_TEXT: Record<Tone, string> = {
  accent: "text-accent",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  muted: "text-text-secondary",
};
const TONE_BADGE: Record<Tone, string> = {
  accent: "bg-accent/15 text-accent",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
  muted: "bg-border text-text-secondary",
};
const SPARK_COLOR: Record<Tone, string> = {
  accent: "#34D399",
  warning: "#FACC15",
  danger: "#F87171",
  info: "#38BDF8",
  muted: "#88AAA6",
};

interface Props {
  icon: string;
  label: string;
  value: string;
  unit?: string;
  status: Status;
  spark?: number[];
}

export default function SensorTile({ icon, label, value, unit, status, spark }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</span>
        <Icon name={icon} className="h-4 w-4 text-text-secondary" />
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`font-mono text-2xl font-bold ${TONE_TEXT[status.tone]}`}>{value}</span>
        {unit && <span className="text-sm text-text-secondary">{unit}</span>}
      </div>
      <div className="mt-3 h-9">
        {spark && spark.length > 1 ? (
          <Sparkline data={spark} color={SPARK_COLOR[status.tone]} />
        ) : (
          <div className="h-full rounded bg-border/30" />
        )}
      </div>
      <span
        className={`mt-3 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${TONE_BADGE[status.tone]}`}
      >
        {status.label}
      </span>
    </div>
  );
}
