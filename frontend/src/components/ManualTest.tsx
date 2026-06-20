import { useEffect, useState } from "react";
import { postManual, type ManualInput } from "../api/client";
import type { Analysis, Meta } from "../types";
import RecommendationCard from "./RecommendationCard";
import AlertsList from "./AlertsList";

interface Props {
  meta: Meta | null;
  presetSoil?: string | null;
}

const FIELDS: { key: keyof ManualInput; label: string }[] = [
  { key: "nitrogen", label: "Nitrogen" },
  { key: "potassium", label: "Potassium" },
  { key: "phosphorous", label: "Phosphorous" },
  { key: "temperature", label: "Temperature °C" },
  { key: "humidity", label: "Humidity %" },
  { key: "moisture", label: "Moisture %" },
];

const DEFAULTS = {
  nitrogen: 20,
  potassium: 10,
  phosphorous: 15,
  temperature: 28,
  humidity: 55,
  moisture: 40,
};

export default function ManualTest({ meta, presetSoil }: Props) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, number>>(DEFAULTS);
  const [soil, setSoil] = useState<string>("Loamy");
  const [crop, setCrop] = useState<string>("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (presetSoil) {
      setSoil(presetSoil);
      setOpen(true);
    }
  }, [presetSoil]);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const input: ManualInput = {
        nitrogen: values.nitrogen,
        potassium: values.potassium,
        phosphorous: values.phosphorous,
        temperature: values.temperature,
        humidity: values.humidity,
        moisture: values.moisture,
        soil_type: soil,
        crop_type: crop || undefined,
      };
      setResult(await postManual(input));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-semibold uppercase tracking-wide text-text-secondary"
      >
        Manual Test (no hardware)
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="text-xs text-text-secondary">
                {f.label}
                <input
                  type="number"
                  value={values[f.key as string]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 font-mono text-sm text-text-primary outline-none focus:border-accent"
                />
              </label>
            ))}

            <label className="text-xs text-text-secondary">
              Soil type
              <select
                value={soil}
                onChange={(e) => setSoil(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
              >
                {(meta?.soil_types ?? ["Loamy"]).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-text-secondary">
              Crop (optional)
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
              >
                <option value="">auto (recommend)</option>
                {(meta?.crop_types ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            onClick={analyze}
            disabled={loading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>

          {error && <div className="text-danger">{error}</div>}

          {result && (
            <div className="space-y-4">
              <RecommendationCard analysis={result} />
              <AlertsList alerts={result.alerts} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
