import axios from "axios";
import type {
  ActivityItem,
  Analysis,
  DashboardSummary,
  HistoryPoint,
  Meta,
  SensorReading,
  SoilClassification,
} from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
});

export interface ManualInput {
  nitrogen: number;
  potassium: number;
  phosphorous: number;
  temperature: number;
  humidity: number;
  moisture: number;
  soil_type: string;
  crop_type?: string;
}

export const getMeta = () => api.get<Meta>("/api/soil/meta").then((r) => r.data);

export const getSummary = () =>
  api.get<DashboardSummary>("/api/dashboard/summary").then((r) => r.data);

export const getHistory = (hours = 24) =>
  api.get<HistoryPoint[]>("/api/dashboard/history", { params: { hours } }).then((r) => r.data);

export const getActivity = (limit = 12) =>
  api.get<ActivityItem[]>("/api/dashboard/activity", { params: { limit } }).then((r) => r.data);

export const postManual = (input: ManualInput) =>
  api.post<Analysis>("/api/analysis/manual", input).then((r) => r.data);

export const postSensorData = (input: Partial<SensorReading> & { soil_type?: string }) =>
  api.post("/api/sensor-data", input).then((r) => r.data);

export const classifySoil = (file: File, deviceId?: string) => {
  const form = new FormData();
  form.append("file", file);
  if (deviceId) form.append("device_id", deviceId);
  return api
    .post<SoilClassification>("/api/soil/classify", form)
    .then((r) => r.data);
};
