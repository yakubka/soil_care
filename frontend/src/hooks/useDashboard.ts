import { useCallback, useEffect, useState } from "react";
import { getActivity, getHistory, getSummary } from "../api/client";
import type { ActivityItem, DashboardSummary, HistoryPoint } from "../types";

// Live demo cadence — poll every 4s so updates feel real-time.
const REFRESH_MS = 4000;

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, h, a] = await Promise.all([getSummary(), getHistory(24), getActivity(12)]);
      setSummary(s);
      setHistory(h);
      setActivity(a);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { summary, history, activity, error, lastUpdated, refresh };
}
