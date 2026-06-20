import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  distribution: Record<string, number>;
}

const COLORS = ["#4ADE80", "#FACC15", "#60A5FA", "#C084FC", "#F87171", "#34D399", "#FBBF24"];

export default function CropDistribution({ distribution }: Props) {
  const data = Object.entries(distribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
        Recommended Crops (24h)
      </h2>
      {data.length === 0 ? (
        <div className="text-text-secondary">No data in the last 24h.</div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#162216" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#162216",
                    border: "1px solid #243524",
                    borderRadius: 8,
                    color: "#E8F5E8",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-1 text-sm">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-text-primary">{d.name}</span>
                <span className="font-mono text-text-secondary">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
