# 🌱 Soil Care System

Local, cloud-free IoT system for agronomy decision support. An ESP32 node reads
**NPK + soil moisture + air temperature/humidity** and posts them to a local
FastAPI backend. The backend runs three trained models on-device and serves the
results to a React dashboard:

| Model | File | Type | Output |
|-------|------|------|--------|
| Soil-type classifier | `best_model.pth` | EfficientNet-B0 (torchvision) | Soil type **from a photo** — `Alluvial / Black / Clay / Red`, val-acc 1.0 |
| Crop recommender | `crop_model.pkl` | RandomForest (scikit-learn) | Best crop for the readings + soil type (11 crops) |
| Fertilizer recommender | `fert_model.pkl` | RandomForest (scikit-learn) | Best fertilizer for readings + soil + crop (7 fertilizers) |
| Anomaly monitor | `sensor_corridors.pkl` | per-crop percentile corridors | WARNING/CRITICAL alerts + actions |

📐 **Full wiring + system architecture:** see [ARCHITECTURE.md](ARCHITECTURE.md).

## Dataset & Models

**Tabular data — `_artifacts/soil_and_data/data.csv`** (8 000 rows). Columns:
`Temparature, Humidity, Moisture, Soil Type, Crop Type, Nitrogen, Potassium,
Phosphorous, Fertilizer Name`. It is a crop-and-fertilizer recommendation
dataset:

- **Soil types (5):** Sandy, Loamy, Black, Red, Clayey
- **Crops (11):** Maize, Sugarcane, Cotton, Tobacco, Paddy, Barley, Wheat,
  Millets, Oil seeds, Pulses, Ground Nuts
- **Fertilizers (7):** Urea, DAP, 14-35-14, 28-28, 17-17-17, 20-20, 10-26-26

Two `RandomForestClassifier` models (200 trees) are trained from it — one for
crop, one for fertilizer — with the training scripts kept in
`_artifacts/soil_and_data/` (`1_crop_recommender.py`, `2_fertilizer_recommender.py`,
`3_sensor_monitor.py`). The per-crop "normal corridors" used for anomaly alerts
are percentile bands (10th–90th) computed from the same data.

**Soil-image model — `best_model.pth`**: an EfficientNet-B0 fine-tuned to
classify a soil photo into 4 visual classes (Alluvial / Black / Clay / Red soil),
reported validation accuracy 1.0. Standard ImageNet preprocessing (resize 256 →
center-crop 224 → normalize).

> Dataset and pretrained-model source links are listed in the project slides.
> _(Add the exact dataset URLs from the presentation here.)_

> **Note on the spec.** This project was built around the *actual* trained
> artifacts that were provided, which differ from the original TZ (an MLP
> soil-status classifier over pH/light sensors). The architecture
> (FastAPI + PostgreSQL/SQLite + React + ESP32) follows the TZ; the ML layer,
> sensor schema, and dashboard were adapted to the real models.

```
ESP32 (NPK / moisture / DHT22)
    │  HTTP POST (Wi-Fi, local network)
    ▼
FastAPI backend (localhost:8000)
    ├── EfficientNet-B0  (photo → soil type)
    ├── RandomForest x2  (crop + fertilizer)
    ├── Corridor monitor (anomaly alerts)
    └── SQLite (default) or PostgreSQL
            │  REST
            ▼
    React dashboard (localhost:3000)
```

---

## Architecture / repo layout

```
sooil_care/
├── backend/                FastAPI + ML
│   ├── main.py             app + lifespan (loads models once)
│   ├── app/
│   │   ├── config.py       settings (.env)
│   │   ├── database.py     async SQLAlchemy engine
│   │   ├── models.py       ORM tables
│   │   ├── schemas.py      Pydantic schemas
│   │   ├── ml/
│   │   │   ├── soil_image_model.py   EfficientNet loader + inference
│   │   │   ├── recommenders.py       crop / fert / corridor monitor
│   │   │   ├── mappings.py           feature order + image→tabular soil map
│   │   │   ├── registry.py           process-wide model singletons
│   │   │   └── weights/              <-- model artifacts live here
│   │   ├── services/advisor.py       orchestrates the full pipeline
│   │   └── routers/                  sensor-data / analysis / soil / dashboard
│   └── scripts/
│       └── init_db.py      create tables
├── frontend/               React + Vite + TS + Tailwind + Recharts
├── firmware/soil_care/     ESP32 Arduino sketch
└── _artifacts/             original training scripts + data.csv (reference)
```

---

## 1. Backend

Requires **Python 3.11+** (tested on 3.12).

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env                # defaults to zero-setup SQLite
python scripts/init_db.py           # create tables
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The model files must be present in `backend/app/ml/weights/`:
`best_model.pth`, `crop_model.pkl`, `fert_model.pkl`, `sensor_corridors.pkl`,
and the `*_le_*.pkl` label encoders.

> **Reassemble the two large models after cloning.** `crop_model.pkl` (~183 MB)
> and `fert_model.pkl` (~132 MB) exceed GitHub's 100 MB per-file limit, so they
> are committed split into `<name>.pkl.part-*` chunks. Rebuild them with:
>
> ```bash
> bash backend/app/ml/weights/assemble_models.sh
> ```
>
> Everything else (incl. the EfficientNet `best_model.pth`) is ready to use. The
> backend will not start until the two `.pkl` files are reassembled.

### PostgreSQL instead of SQLite (optional)

```bash
createdb soilcare
# in .env:
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/soilcare
```

### scikit-learn version

The `.pkl` models were trained on **scikit-learn 1.8.0** (a nightly build not on
PyPI). `requirements.txt` pins **1.6.1**, the latest stable — it loads and runs
the models correctly; the resulting `InconsistentVersionWarning` is benign and is
suppressed at load time.

### Key endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/health` | liveness + models loaded |
| `GET`  | `/api/soil/meta` | soil types, crops, image classes, soil mapping |
| `POST` | `/api/soil/classify` | multipart image → soil type (EfficientNet) |
| `POST` | `/api/sensor-data` | ingest readings, store + analyze |
| `GET`  | `/api/sensor-data` | recent readings |
| `POST` | `/api/analysis/manual` | run the pipeline on hand-entered values |
| `GET`  | `/api/analysis/latest` | latest stored analysis |
| `GET`  | `/api/dashboard/summary` | aggregated 24h view |
| `GET`  | `/api/dashboard/history` | time-series for charts |

Interactive docs at `http://localhost:8000/docs`.

---

## 2. Frontend

Requires **Node 18+**.

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000  (proxies /api → :8000)
```

Dashboard: live metric cards (N/P/K, temp, humidity, moisture), crop & fertilizer
recommendations, sensor alerts, 24h charts, crop distribution, a soil-photo
upload (EfficientNet), and a collapsible manual-test panel.

---

## 3. ESP32 firmware

Open `firmware/soil_care/soil_care.ino` in the Arduino IDE (ESP32 board support).

**Libraries:** *DHT sensor library* (Adafruit) + *Adafruit Unified Sensor*,
*ArduinoJson* (7.x). `WiFi` / `HTTPClient` ship with the ESP32 core.

**Wiring (see `config.h`):**
- NPK sensor → RS485/MAX485 on UART2 (RX 16, TX 17, DE/RE 5), Modbus RTU.
- Capacitive soil-moisture → ADC pin 34 (calibrate `MOISTURE_RAW_DRY/WET`).
- DHT22 → pin 4 (air temp + humidity).

Set `WIFI_SSID`, `WIFI_PASSWORD`, `SERVER_URL`, and optionally `SOIL_TYPE` in
`config.h`, then flash. The node posts every 30 s.

> NPK Modbus register addresses vary by sensor model — adjust `NPK_REG_*` in
> `config.h` to match your datasheet.

---

## 4. Testing the recommenders manually

With the backend running, use the **Manual Test** panel (ML Insights tab) or the
`POST /api/analysis/manual` endpoint to feed values by hand and get a crop /
fertilizer recommendation without the ESP32.

---

## What this system does NOT use

No cloud (AWS/GCP/Azure/Firebase/Supabase), no Docker requirement, no WebSocket
(30 s polling), no external ML APIs, no auth — fully local.
