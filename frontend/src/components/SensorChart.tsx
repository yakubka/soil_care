import { kstHM } from "../lib/time";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint } from "../types";

interface SeriesDef {
  key: keyof HistoryPoint;
  name: string;
  color: string;
}

interface Props {
  title: string;
  data: HistoryPoint[];
  series: SeriesDef[];
}

export default function SensorChart({ title, data, series }: Props) {
  const rows = data.map((d) => ({
    ...d,
    t: kstHM(d.timestamp),
  }));

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
        {title}
      </h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#243524" />
            <XAxis dataKey="t" stroke="#86A886" fontSize={11} />
            <YAxis stroke="#86A886" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "#162216",
                border: "1px solid #243524",
                borderRadius: 8,
                color: "#E8F5E8",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#86A886" }} />
            {series.map((s) => (
              <Line
                key={s.key as string}
                type="monotone"
                dataKey={s.key as string}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
