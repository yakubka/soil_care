export interface SensorReading {
  id: number;
  device_id: string;
  timestamp: string;
  nitrogen: number | null;
  potassium: number | null;
  phosphorous: number | null;
  temperature: number | null;
  humidity: number | null;
  moisture: number | null;
  soil_temperature: number | null;
  light_intensity: number | null;
  soil_type: string | null;
  crop_type: string | null;
  created_at: string;
}

export interface Alert {
  param: string;
  value: number;
  normal_range: string;
  severity: "WARNING" | "CRITICAL";
  action: string;
}

export interface Analysis {
  id?: number | null;
  reading_id?: number | null;
  soil_type: string | null;
  recommended_crop: string | null;
  crop_confidence: number | null;
  crop_probabilities: Record<string, number> | null;
  recommended_fertilizer: string | null;
  fertilizer_confidence: number | null;
  fertilizer_probabilities: Record<string, number> | null;
  alerts: Alert[];
  created_at?: string | null;
}

export interface SoilClassification {
  id?: number | null;
  device_id?: string | null;
  predicted_soil: string;
  tabular_soil_type: string | null;
  confidence: number;
  probabilities: Record<string, number> | null;
  created_at?: string | null;
}

export interface DashboardSummary {
  latest_reading: SensorReading | null;
  latest_analysis: Analysis | null;
  latest_classification: SoilClassification | null;
  averages_24h: Record<string, number | null>;
  readings_count_24h: number;
  crop_distribution_24h: Record<string, number>;
  active_alerts: Alert[];
}

export interface HistoryPoint {
  timestamp: string;
  nitrogen: number | null;
  potassium: number | null;
  phosphorous: number | null;
  temperature: number | null;
  humidity: number | null;
  moisture: number | null;
  soil_temperature: number | null;
  light_intensity: number | null;
}

export interface ActivityItem {
  reading_id: number;
  timestamp: string;
  device_id: string;
  soil_type: string | null;
  recommended_crop: string | null;
  recommended_fertilizer: string | null;
  crop_confidence: number | null;
  alert_count: number;
  max_severity: "CRITICAL" | "WARNING" | null;
}

export interface Meta {
  soil_types: string[];
  image_soil_classes: string[];
  crop_types: string[];
  image_to_tabular_soil: Record<string, string>;
  model_accuracy: number;
}
