# Architecture

End-to-end, fully local pipeline: an ESP32 reads soil/air/light sensors and
POSTs them over Wi-Fi to a FastAPI backend, which runs three trained models,
stores everything in SQLite, and serves a React dashboard.

```
   ┌──────────────────────── ESP32 DevKitC (Wi-Fi) ────────────────────────┐
   │  Soil moisture A/B (ADC) · DHT22 (air T/H) · DS18B20 (soil T) ·        │
   │  BH1750 (light, I2C) · NPK probe (RS485/Modbus, optional)             │
   └───────────────────────────────┬───────────────────────────────────────┘
                                    │  HTTP POST /api/sensor-data  (JSON, every 10 s)
                                    ▼
   ┌──────────────────────── FastAPI backend (:8000) ──────────────────────┐
   │  routers ─ sensor-data · soil · analysis · dashboard                   │
   │  services/advisor ─ orchestrates the ML pipeline                       │
   │  ml/registry (loaded once at startup):                                 │
   │     • EfficientNet-B0  (best_model.pth)   photo → soil type            │
   │     • RandomForest     (crop_model.pkl)   → recommended crop           │
   │     • RandomForest     (fert_model.pkl)   → recommended fertilizer     │
   │     • corridors        (sensor_corridors.pkl) → anomaly alerts         │
   │  SQLAlchemy (async) ──────────────► SQLite (soilcare.db)               │
   └───────────────────────────────┬───────────────────────────────────────┘
                                    │  REST (polled every 4 s)
                                    ▼
   ┌──────────────── React + Vite + Tailwind + Recharts (:3000) ───────────┐
   │  live sensor tiles · 24h charts · soil-photo upload · recommendations  │
   │  · anomaly alerts · live pipeline feed                                 │
   └───────────────────────────────────────────────────────────────────────┘
```

---

## Hardware wiring (ESP32 DevKitC V38)

All sensor `VCC` → **3V3**, all `GND` → **GND** (common rails on the breadboard).

| Sensor | Measures | Signal | ESP32 pin | Notes |
|--------|----------|--------|-----------|-------|
| Soil moisture A (capacitive v2.0) | soil moisture | AOUT | **GPIO34** | ADC1, input-only |
| Soil moisture B (capacitive v2.0) | soil moisture | AOUT | **GPIO35** | ADC1, input-only |
| DHT22 | air temp + humidity | DATA | **GPIO4** | 10 kΩ pull-up DATA→3V3 |
| DS18B20 (waterproof) | soil temperature | DATA | **GPIO13** | 4.7 kΩ pull-up DATA→3V3 (OneWire) |
| BH1750 (GY-302) | light intensity | SDA / SCL | **GPIO21 / GPIO22** | I2C; ADDR→GND ⇒ addr `0x23` |
| NPK probe (optional) | N / P / K | via MAX485 | RX **GPIO16**, TX **GPIO17**, DE+RE **GPIO5** | RS485/Modbus RTU @ 9600 |
| Status LED | — | — | **GPIO2** | onboard LED |

**In the soil** (probes buried): soil moisture A/B, DS18B20, NPK spikes.
**In the air** (above ground): DHT22, BH1750 (facing the light).
The ESP32 board and breadboard stay outside the soil.

Wire-colour legend (matches the breadboard diagram): red = 3V3, black = GND,
green = DHT22 data, yellow = DS18B20 data, purple = moisture AOUT, orange = I2C.

> ADC2 pins are unusable while Wi-Fi is on, so both moisture sensors use ADC1
> (GPIO34/35). GPIO5 (RS485 DE/RE) and GPIO13 (DS18B20) are kept separate —
> sharing a pin pins the OneWire bus low and the probe is never detected.

### Sensor → model-feature mapping

The recommenders were trained on `N, P, K, temperature, humidity, moisture, soil
type` (+ crop for the fertilizer model). Soil temperature and light are stored
and charted but are not model inputs.

---

## Software components

```
backend/
  main.py                     app + lifespan (loads all models once)
  app/
    config.py                 settings; paths anchored to backend/ (CWD-independent)
    database.py               async SQLAlchemy engine (SQLite / PostgreSQL)
    models.py                 ORM: sensor_readings, soil_analyses, soil_classifications
    schemas.py                Pydantic request/response models
    ml/
      soil_image_model.py     EfficientNet-B0 loader + image inference
      recommenders.py         crop / fertilizer / corridor monitor (joblib)
      mappings.py             feature order + image→tabular soil map
      registry.py             process-wide singletons
    services/
      advisor.py              runs crop → fertilizer → alerts for a reading
      context.py              last photo-classified soil type per device
    routers/                  sensor-data · soil · analysis · dashboard
frontend/  src/               React dashboard (components, hooks, lib/derive, lib/time)
firmware/soil_care/           ESP32 sketch (config / sensors / wifi / http)
```

## Request → response flow (POST /api/sensor-data)

1. ESP32 builds a JSON payload of the latest readings and POSTs it.
2. Backend stores a `SensorReading` row.
3. **Soil type** is resolved: latest photo classification (EfficientNet) wins,
   else the value the device sent, else a default.
4. `advisor.analyze` runs: crop recommender → fertilizer recommender →
   per-crop corridor anomaly check.
5. A `SoilAnalysis` row (crop, fertilizer, probabilities, alerts) is committed.
6. The dashboard polls `/api/dashboard/summary|history|activity` and re-renders.

## Soil-type from a photo (EfficientNet)

`POST /api/soil/classify` accepts an image, runs `best_model.pth`
(EfficientNet-B0, 4 classes: Alluvial / Black / Clay / Red soil), maps the class
to a tabular soil type, and remembers it so subsequent sensor readings are scored
against that soil type.
