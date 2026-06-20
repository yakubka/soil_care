import { useState } from "react";
import { classifySoil } from "../api/client";
import type { Meta, SoilClassification } from "../types";
import StatusBadge from "./StatusBadge";

interface Props {
  meta: Meta | null;
  onClassified?: (tabularSoil: string | null) => void;
}

export default function SoilPhotoUpload({ meta, onClassified }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<SoilClassification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await classifySoil(file, "esp32-soil-01");
      setResult(res);
      onClassified?.(res.tabular_soil_type);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Classification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
        Soil Type from Photo
        {meta && (
          <span className="ml-2 font-normal text-text-secondary">
            (model acc {(meta.model_accuracy * 100).toFixed(0)}%)
          </span>
        )}
      </h2>

      <div className="flex flex-col gap-4 sm:flex-row">
        <label className="flex h-32 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-sm text-text-secondary hover:border-accent/50 sm:w-48">
          {preview ? (
            <img src={preview} alt="soil" className="h-full w-full rounded-lg object-cover" />
          ) : (
            "Click to upload a soil photo"
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>

        <div className="flex-1">
          {loading && <div className="text-text-secondary">Classifying…</div>}
          {error && <div className="text-danger">{error}</div>}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold text-accent">
                  {result.predicted_soil}
                </span>
                <StatusBadge label={`${(result.confidence * 100).toFixed(1)}%`} tone="accent" />
              </div>
              {result.tabular_soil_type && (
                <div className="text-sm text-text-secondary">
                  → mapped to <span className="text-text-primary">{result.tabular_soil_type}</span>{" "}
                  for recommenders
                </div>
              )}
              {result.probabilities && (
                <ul className="mt-2 space-y-1 text-xs">
                  {Object.entries(result.probabilities)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <li key={k} className="flex items-center gap-2">
                        <span className="w-24 text-text-secondary">{k}</span>
                        <span className="h-1.5 flex-1 rounded bg-border">
                          <span
                            className="block h-1.5 rounded bg-accent"
                            style={{ width: `${v * 100}%` }}
                          />
                        </span>
                        <span className="w-12 text-right font-mono text-text-secondary">
                          {(v * 100).toFixed(0)}%
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
