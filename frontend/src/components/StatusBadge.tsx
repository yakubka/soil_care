interface Props {
  label: string;
  tone?: "accent" | "warning" | "danger" | "info" | "nutrient" | "muted";
}

const TONES: Record<string, string> = {
  accent: "bg-accent/15 text-accent border-accent/40",
  warning: "bg-warning/15 text-warning border-warning/40",
  danger: "bg-danger/15 text-danger border-danger/40",
  info: "bg-info/15 text-info border-info/40",
  nutrient: "bg-nutrient/15 text-nutrient border-nutrient/40",
  muted: "bg-border text-text-secondary border-border",
};

export default function StatusBadge({ label, tone = "muted" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {label}
    </span>
  );
}
