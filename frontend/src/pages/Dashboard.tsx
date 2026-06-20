import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useDashboard } from "../hooks/useDashboard";
import { useMeta } from "../hooks/useMeta";
import { kstHM, kstNow } from "../lib/time";
import type { ActivityItem, Alert, Analysis, HistoryPoint, Meta, SensorReading } from "../types";
import SensorTile from "../components/SensorTile";
import HealthGauge from "../components/HealthGauge";
import SensorChart from "../components/SensorChart";
import ActivityFeed from "../components/ActivityFeed";
import CropDistribution from "../components/CropDistribution";
import RecommendationCard from "../components/RecommendationCard";
import SoilPhotoUpload from "../components/SoilPhotoUpload";
import ManualTest from "../components/ManualTest";
import SensorStats, { type StatField } from "../components/SensorStats";
import Icon from "../components/Icon";
import {
  airStatus,
  healthLabel,
  healthScore,
  lightScore,
  lightStatus,
  moistureScore,
  moistureStatus,
  predictions,
  recommendations,
  soilTempStatus,
  tempScore,
  type Status,
  type Tone,
} from "../lib/derive";

type Tab = "overview" | "wiring" | "sensors" | "ml" | "history" | "settings";

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "wiring", label: "Wiring Diagram", icon: "zap" },
  { id: "sensors", label: "Sensors", icon: "cpu" },
  { id: "ml", label: "ML Insights", icon: "sparkles" },
  { id: "history", label: "History", icon: "chart" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const TONE_TEXT: Record<Tone, string> = {
  accent: "text-accent",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  muted: "text-text-secondary",
};
const TONE_BAR: Record<Tone, string> = {
  accent: "bg-accent",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  muted: "bg-text-secondary",
};

function KstClock() {
  const [now, setNow] = useState(kstNow());
  useEffect(() => {
    const id = setInterval(() => setNow(kstNow()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs text-text-secondary">
      {now} <span className="text-accent">KST</span>
    </span>
  );
}

const seriesFrom = (h: HistoryPoint[], key: keyof HistoryPoint): number[] =>
  h.map((p) => p[key] as number).filter((v) => v != null && !Number.isNaN(v)).slice(-24);

export default function Dashboard() {
  const { summary, history, activity, error, lastUpdated } = useDashboard();
  const meta = useMeta();
  const [tab, setTab] = useState<Tab>("overview");
  const [photoSoil, setPhotoSoil] = useState<string | null>(null);

  const reading = summary?.latest_reading ?? null;
  const analysis = summary?.latest_analysis ?? null;
  const isLive = lastUpdated ? Date.now() - lastUpdated.getTime() < 30000 : false;
  const health = healthScore(reading);

  return (
    <div className="flex min-h-screen bg-bg">
      {/* ---------------- Sidebar ---------------- */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 px-5 py-5">
          <Icon name="leaf" className="h-5 w-5 text-accent" />
          <span className="text-lg font-bold text-text-primary">SoilCare</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                tab === n.id
                  ? "bg-accent/15 font-semibold text-accent"
                  : "text-text-secondary hover:bg-card hover:text-text-primary"
              }`}
            >
              <Icon name={n.icon} className="h-4 w-4" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="m-3 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <span className={`h-2 w-2 rounded-full ${isLive ? "bg-accent" : "bg-text-secondary"}`} />
          <span className="text-text-secondary">ESP32 {isLive ? "Online" : "Idle"}</span>
        </div>
      </aside>

      {/* ---------------- Main ---------------- */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              Plant Monitor — {reading?.device_id ?? "esp32-soil-01"}
            </h1>
            <p className="text-xs text-text-secondary">
              {lastUpdated
                ? `Last updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}`
                : "connecting…"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <KstClock />
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                isLive ? "border-accent/40 text-accent" : "border-border text-text-secondary"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isLive && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${isLive ? "bg-accent" : "bg-text-secondary"}`} />
              </span>
              Live
            </span>
            <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary">
              Last 24 Hours
            </span>
          </div>
        </header>

        <div className="space-y-6 p-6">
          {error && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-danger">
              {error} — is the backend running on :8000?
            </div>
          )}

          {tab === "overview" && (
            <Overview
              reading={reading}
              analysis={analysis}
              history={history}
              activity={activity}
              health={health}
              alerts={summary?.active_alerts ?? []}
            />
          )}

          {tab === "ml" && (
            <section className="space-y-6">
              <SoilPhotoUpload meta={meta} onClassified={setPhotoSoil} />
              <RecommendationCard analysis={analysis} />
              <ManualTest meta={meta} presetSoil={photoSoil} />
            </section>
          )}

          {tab === "history" && (
            <section className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SensorChart
                  title="NPK (24h)"
                  data={history}
                  series={[
                    { key: "nitrogen", name: "N", color: "#34D399" },
                    { key: "potassium", name: "K", color: "#38BDF8" },
                    { key: "phosphorous", name: "P", color: "#C084FC" },
                  ]}
                />
                <SensorChart
                  title="Climate & Moisture (24h)"
                  data={history}
                  series={[
                    { key: "temperature", name: "Air °C", color: "#FACC15" },
                    { key: "soil_temperature", name: "Soil °C", color: "#F97316" },
                    { key: "moisture", name: "Moisture %", color: "#34D399" },
                  ]}
                />
              </div>
              <CropDistribution distribution={summary?.crop_distribution_24h ?? {}} />
              <ActivityFeed items={activity} />
            </section>
          )}

          {tab === "sensors" && <SensorsTable reading={reading} />}
          {tab === "wiring" && <WiringPanel />}
          {tab === "settings" && <SettingsPanel deviceId={reading?.device_id} meta={meta} />}
        </div>
      </main>
    </div>
  );
}

/* ============================ Overview ============================ */
function Overview({
  reading,
  analysis,
  history,
  activity,
  health,
  alerts,
}: {
  reading: SensorReading | null;
  analysis: Analysis | null;
  history: HistoryPoint[];
  activity: ActivityItem[];
  health: number;
  alerts: Alert[];
}) {
  const preds = predictions(reading);
  const recs = recommendations(reading, analysis);
  const hl = healthLabel(health);

  const subScores = [
    { label: "Moisture Score", v: moistureScore(reading?.moisture) },
    { label: "Temperature Score", v: tempScore(reading?.soil_temperature ?? reading?.temperature) },
    { label: "Light Score", v: lightScore(reading?.light_intensity) },
  ];

  // Full sensor catalog. A sensor is "connected" when its latest value is
  // present (the firmware sends null when a probe doesn't respond), so the
  // grid below shows ONLY what's actually wired and reporting right now.
  const present = (v: number | null | undefined): Status =>
    v == null ? { label: "—", tone: "muted" } : { label: "OK", tone: "accent" };
  const SENSORS: {
    key: keyof SensorReading;
    label: string;
    icon: string;
    unit: string;
    digits: number;
    status: (v: number | null | undefined) => Status;
    bus: string;
  }[] = [
    { key: "moisture", label: "Soil Moisture", icon: "droplet", unit: "%", digits: 0, status: moistureStatus, bus: "ADC G34/G35" },
    { key: "soil_temperature", label: "Soil Temperature", icon: "sprout", unit: "°C", digits: 1, status: soilTempStatus, bus: "DS18B20 · G13" },
    { key: "temperature", label: "Air Temperature", icon: "thermometer", unit: "°C", digits: 1, status: airStatus, bus: "DHT22 · G4" },
    { key: "humidity", label: "Air Humidity", icon: "droplet", unit: "%", digits: 0, status: present, bus: "DHT22 · G4" },
    { key: "light_intensity", label: "Light", icon: "sun", unit: "lux", digits: 0, status: lightStatus, bus: "BH1750 · I2C" },
    { key: "nitrogen", label: "Nitrogen (N)", icon: "atom", unit: "mg/kg", digits: 0, status: present, bus: "NPK · RS485" },
    { key: "phosphorous", label: "Phosphorous (P)", icon: "atom", unit: "mg/kg", digits: 0, status: present, bus: "NPK · RS485" },
    { key: "potassium", label: "Potassium (K)", icon: "atom", unit: "mg/kg", digits: 0, status: present, bus: "NPK · RS485" },
  ];
  const connected = SENSORS.filter((s) => reading != null && reading[s.key] != null);
  const statFields: StatField[] = connected.map((s) => ({
    key: s.key as keyof HistoryPoint,
    label: s.label,
    unit: s.unit,
    digits: s.digits,
  }));

  return (
    <>
      {/* Live Sensor Readings — only sensors that are wired and reporting */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Live Sensor Readings</h2>
          <span className="rounded-md border border-accent/40 px-2 py-0.5 text-[11px] font-semibold text-accent">
            {connected.length} connected
          </span>
        </div>
        {connected.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {connected.map((s) => {
              const v = reading?.[s.key] as number | null | undefined;
              return (
                <SensorTile
                  key={s.key as string}
                  icon={s.icon}
                  label={s.label}
                  value={v != null ? v.toFixed(s.digits) : "—"}
                  unit={s.unit}
                  status={s.status(v)}
                  spark={seriesFrom(history, s.key as keyof HistoryPoint)}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-text-secondary">
            No sensor is reporting yet — waiting for the ESP32 to send data.
          </div>
        )}
      </section>

      {/* Statistics over the working sensors */}
      <SensorStats history={history} fields={statFields} />

      {/* Historical — charts for the connected sensors */}
      {connected.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Historical Data (Last 24 Hours)</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SensorChart
              title="Soil Moisture % over time"
              data={history}
              series={[{ key: "moisture", name: "Moisture %", color: "#34D399" }]}
            />
            <SensorChart
              title="Soil Temperature (°C)"
              data={history}
              series={[{ key: "soil_temperature", name: "Soil °C", color: "#F97316" }]}
            />
          </div>
        </section>
      )}

      {/* AI Analysis */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">AI Analysis (Model Output)</h2>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-[11px] text-text-secondary">
            <Icon name="sparkles" className="h-3 w-3" />
            EfficientNet-B0 + RandomForest pipeline
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Health score */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 text-xs uppercase tracking-wide text-text-secondary">Soil Health Score</div>
            <HealthGauge score={health} label={hl.label} />
            <ul className="mt-4 space-y-1.5 text-xs">
              {subScores.map((s) => (
                <li key={s.label} className="flex items-center justify-between">
                  <span className="text-text-secondary">{s.label}</span>
                  <span className="font-mono text-text-primary">{s.v}/100</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI recommendations */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 text-xs uppercase tracking-wide text-text-secondary">AI Recommendations</div>
            <ul className="space-y-2">
              {recs.map((r, i) => (
                <li
                  key={i}
                  className={`rounded-lg border-l-2 bg-card2 px-3 py-2 text-sm ${
                    r.tone === "accent"
                      ? "border-accent"
                      : r.tone === "warning"
                      ? "border-warning"
                      : "border-info"
                  }`}
                >
                  {r.text}
                </li>
              ))}
            </ul>
          </div>

          {/* ML predictions */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 text-xs uppercase tracking-wide text-text-secondary">ML Predictions</div>
            <ul className="space-y-3">
              {preds.map((p) => (
                <li key={p.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{p.label}</span>
                    <span className={`font-mono ${TONE_TEXT[p.tone]}`}>{p.value}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded bg-border">
                    <div
                      className={`h-1.5 rounded ${TONE_BAR[p.tone]}`}
                      style={{ width: `${p.value}%`, transition: "width 0.5s ease" }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Recent Alerts */}
      <RecentAlerts alerts={alerts} activity={activity} />

      {/* Live pipeline feed */}
      <ActivityFeed items={activity} />

      {/* Footer pipeline */}
      <footer className="flex flex-wrap items-center justify-center gap-2 pb-2 pt-2 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1"><Icon name="cpu" className="h-3.5 w-3.5" /> ESP32</span>
        <span>→</span>
        <span className="inline-flex items-center gap-1"><Icon name="database" className="h-3.5 w-3.5" /> SQLite</span>
        <span>→</span>
        <span className="inline-flex items-center gap-1"><Icon name="server" className="h-3.5 w-3.5" /> FastAPI</span>
        <span>→</span>
        <span className="inline-flex items-center gap-1"><Icon name="sparkles" className="h-3.5 w-3.5" /> ML Model</span>
        <span>→</span>
        <span className="inline-flex items-center gap-1"><Icon name="atom" className="h-3.5 w-3.5" /> React + Recharts</span>
      </footer>
    </>
  );
}

function RecentAlerts({
  alerts,
  activity,
}: {
  alerts: Alert[];
  activity: ActivityItem[];
}) {
  const rows: { icon: string; text: string; tone: Tone; time: string }[] = [];
  for (const a of alerts.slice(0, 4)) {
    rows.push({
      icon: a.severity === "CRITICAL" ? "critical" : "warning",
      text: `${a.param}: ${a.value.toFixed(1)} (normal ${a.normal_range}) — ${a.action}`,
      tone: a.severity === "CRITICAL" ? "danger" : "warning",
      time: "",
    });
  }
  if (activity[0]) {
    rows.push({
      icon: "check",
      text: `Reading #${activity[0].reading_id} processed -> ${activity[0].recommended_crop} / ${activity[0].recommended_fertilizer}`,
      tone: "accent",
      time: kstHM(activity[0].timestamp),
    });
  }
  rows.push({ icon: "power", text: "System started · ESP32 connected", tone: "accent", time: "" });

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Icon name="bell" className="h-4 w-4 text-text-secondary" />
        Recent Alerts
      </h2>
      <ul className="divide-y divide-border">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-3 py-2.5">
            <Icon name={r.icon} className={`h-4 w-4 ${TONE_TEXT[r.tone]}`} />
            <span className={`flex-1 text-sm ${r.tone === "accent" ? "text-text-primary" : TONE_TEXT[r.tone]}`}>
              {r.text}
            </span>
            {r.time && <span className="font-mono text-xs text-text-secondary">{r.time}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ============================ Other tabs ============================ */
function SensorsTable({ reading }: { reading: SensorReading | null }) {
  const rows = [
    { name: "Soil Moisture v2.0 (A)", placement: "IN SOIL", v: reading?.moisture, unit: "%", bus: "ADC G34" },
    { name: "Soil Moisture v2.0 (B)", placement: "IN SOIL", v: reading?.moisture, unit: "%", bus: "ADC G35" },
    { name: "DS18B20 probe", placement: "IN SOIL", v: reading?.soil_temperature, unit: "°C", bus: "OneWire G13" },
    { name: "NPK probe — N", placement: "IN SOIL", v: reading?.nitrogen, unit: "mg/kg", bus: "RS485" },
    { name: "NPK probe — P", placement: "IN SOIL", v: reading?.phosphorous, unit: "mg/kg", bus: "RS485" },
    { name: "NPK probe — K", placement: "IN SOIL", v: reading?.potassium, unit: "mg/kg", bus: "RS485" },
    { name: "DHT22 air", placement: "IN AIR", v: reading?.temperature, unit: "°C", bus: "GPIO4" },
    { name: "DHT22 humidity", placement: "IN AIR", v: reading?.humidity, unit: "%", bus: "GPIO4" },
    { name: "BH1750 light", placement: "IN AIR", v: reading?.light_intensity, unit: "lux", bus: "I2C 0x23" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-text-primary">Sensors</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-text-secondary">
            <th className="pb-2">Sensor</th><th className="pb-2">Placement</th>
            <th className="pb-2">Bus</th><th className="pb-2 text-right">Reading</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-border">
              <td className="py-2 text-text-primary">{r.name}</td>
              <td className="py-2">
                <span className={`rounded px-2 py-0.5 text-[11px] ${r.placement === "IN SOIL" ? "bg-accent/15 text-accent" : "bg-info/15 text-info"}`}>
                  {r.placement}
                </span>
              </td>
              <td className="py-2 font-mono text-xs text-text-secondary">{r.bus}</td>
              <td className="py-2 text-right font-mono text-text-primary">
                {r.v != null ? `${r.v} ${r.unit}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WiringPanel() {
  const wires = [
    ["Soil Moisture A — AOUT", "GPIO34 (ADC1)", "purple"],
    ["Soil Moisture B — AOUT", "GPIO35 (ADC1)", "purple"],
    ["DS18B20 DAT", "GPIO13 (4.7kΩ pull-up if available)", "blue"],
    ["DHT22 OUT", "GPIO4 (+10kΩ)", "green"],
    ["BH1750 SDA / SCL", "GPIO21 / GPIO22 (I2C)", "orange"],
    ["NPK RS485 RX/TX/DE", "GPIO16 / 17 / 5", "gray"],
    ["All VCC", "3V3 rail", "red"],
    ["All GND", "GND rail", "gray"],
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Icon name="zap" className="h-4 w-4 text-text-secondary" />
        Wiring (ESP32 DevKitC)
      </h2>
      <ul className="space-y-2 font-mono text-sm">
        {wires.map(([a, b]) => (
          <li key={a} className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-text-primary">{a}</span>
            <span className="text-text-secondary">→ {b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsPanel({ deviceId, meta }: { deviceId?: string; meta: Meta | null }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-sm">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Icon name="settings" className="h-4 w-4 text-text-secondary" />
        Settings
      </h2>
      <ul className="space-y-2 text-text-secondary">
        <li>Device ID: <span className="font-mono text-text-primary">{deviceId ?? "esp32-soil-01"}</span></li>
        <li>Refresh interval: <span className="text-text-primary">4 s (polling)</span></li>
        <li>Soil-image model: <span className="text-text-primary">EfficientNet-B0 · acc {meta ? (meta.model_accuracy * 100).toFixed(0) : "—"}%</span></li>
        <li>Recommenders: <span className="text-text-primary">RandomForest (crop + fertilizer)</span></li>
        <li>Backend: <span className="font-mono text-text-primary">FastAPI · SQLite</span></li>
      </ul>
    </div>
  );
}
