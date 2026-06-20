import pandas as pd
import numpy as np
import joblib
from collections import defaultdict

df = pd.read_csv("data.csv")

PARAMS = ["Nitrogen", "Potassium", "Phosphorous", "Temparature", "Humidity", "Moisture"]
LOW_PCT = 10
HIGH_PCT = 90

corridors = {}
for crop in df["Crop Type"].unique():
    sub = df[df["Crop Type"] == crop]
    corridors[crop] = {}
    for p in PARAMS:
        corridors[crop][p] = {
            "low": float(np.percentile(sub[p], LOW_PCT)),
            "high": float(np.percentile(sub[p], HIGH_PCT)),
            "mean": float(sub[p].mean()),
        }

joblib.dump(corridors, "sensor_corridors.pkl")

FERT_MAP = {
    "Nitrogen": "Urea (high nitrogen)",
    "Phosphorous": "DAP (high phosphorus)",
    "Potassium": "17-17-17 or 28-28 (potassium supplement)",
}

def check_sensors(crop, readings):
    alerts = []
    for param, value in readings.items():
        if param not in corridors.get(crop, {}):
            continue
        c = corridors[crop][param]
        if value < c["low"]:
            severity = "CRITICAL" if value < c["low"] * 0.7 else "WARNING"
            alert = {
                "param": param,
                "value": value,
                "normal_range": f'{c["low"]:.1f} - {c["high"]:.1f}',
                "severity": severity,
                "action": get_action(param, "low"),
            }
            alerts.append(alert)
        elif value > c["high"]:
            severity = "CRITICAL" if value > c["high"] * 1.3 else "WARNING"
            alert = {
                "param": param,
                "value": value,
                "normal_range": f'{c["low"]:.1f} - {c["high"]:.1f}',
                "severity": severity,
                "action": get_action(param, "high"),
            }
            alerts.append(alert)
    return alerts

def get_action(param, direction):
    if param == "Moisture" and direction == "low":
        return "IRRIGATION NEEDED — soil moisture below crop corridor"
    if param == "Moisture" and direction == "high":
        return "Reduce irrigation — risk of waterlogging"
    if param == "Nitrogen" and direction == "low":
        return f"Apply {FERT_MAP['Nitrogen']}"
    if param == "Nitrogen" and direction == "high":
        return "Skip nitrogen — levels excessive, risk of lodging"
    if param == "Phosphorous" and direction == "low":
        return f"Apply {FERT_MAP['Phosphorous']}"
    if param == "Phosphorous" and direction == "high":
        return "Skip phosphorus — excess may lock out micronutrients"
    if param == "Potassium" and direction == "low":
        return f"Apply {FERT_MAP['Potassium']}"
    if param == "Potassium" and direction == "high":
        return "Skip potassium — levels sufficient"
    if param == "Temparature" and direction == "low":
        return "Temperature low — monitor for cold stress"
    if param == "Temparature" and direction == "high":
        return "Temperature high — increase shade/irrigation"
    if param == "Humidity" and direction == "low":
        return "Humidity low — increase misting/sprinklers"
    if param == "Humidity" and direction == "high":
        return "Humidity high — watch for fungal disease"
    return "Monitor closely"

print("=== Sensor Anomaly Monitor ===")
print(f"Corridors built for crops: {list(corridors.keys())}")
print("\nPer-crop normal ranges:")
for crop in sorted(corridors):
    print(f"\n  {crop}:")
    for p in PARAMS:
        c = corridors[crop][p]
        print(f"    {p:15s}: {c['low']:6.1f} - {c['high']:6.1f}  (mean {c['mean']:.1f})")

print("\n=== Interactive Monitor ===")
print(f"Crops: {list(sorted(corridors.keys()))}")
print("Enter: CropType N K P Temp Humidity Moisture")
while True:
    try:
        line = input("\n> ").strip()
        if not line:
            break
        parts = line.split()
        crop = parts[0]
        readings = {
            "Nitrogen": float(parts[1]),
            "Potassium": float(parts[2]),
            "Phosphorous": float(parts[3]),
            "Temparature": float(parts[4]),
            "Humidity": float(parts[5]),
            "Moisture": float(parts[6]),
        }
        alerts = check_sensors(crop, readings)
        if not alerts:
            print(f"[OK] All parameters for {crop} are within normal corridor.")
        else:
            print(f"\n{'='*60}")
            print(f"  ALERTS for {crop} — {len(alerts)} anomaly(ies) detected")
            print(f"{'='*60}")
            for a in alerts:
                print(f"\n  [{a['severity']}] {a['param']}: {a['value']:.1f} (normal: {a['normal_range']})")
                print(f"    → {a['action']}")
            print()
    except Exception as e:
        print(f"Error: {e}")
