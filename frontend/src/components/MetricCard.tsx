interface Props {
  label: string;
  value: number | null | undefined;
  unit?: string;
  precision?: number;
}

export default function MetricCard({ label, value, unit, precision = 1 }: Props) {
  const display =
    value === null || value === undefined ? "—" : value.toFixed(precision);
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-text-secondary">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold text-text-primary">{display}</span>
        {unit && <span className="text-sm text-text-secondary">{unit}</span>}
      </div>
    </div>
  );
}
