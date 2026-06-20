interface Props {
  data: number[];
  color?: string;
  height?: number;
}

export default function Sparkline({ data, color = "#34D399", height = 36 }: Props) {
  const pts = data.filter((d) => d != null && !Number.isNaN(d));
  if (pts.length < 2) return <div style={{ height }} />;

  const w = 100;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const step = w / (pts.length - 1);
  const coords = pts.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2]);
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${w},${height}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" width="100%" height={height}>
      <polygon points={area} fill={color} opacity={0.12} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
