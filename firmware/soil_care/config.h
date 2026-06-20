#ifndef CONFIG_H
#define CONFIG_H

// ===========================================================================
//  Soil Care System — ESP32 firmware configuration
//  Sensors match the trained models: NPK (RS485/Modbus), soil moisture (ADC),
//  air temperature + humidity (DHT22).  No pH / light sensors.
// ===========================================================================

// ---- Wi-Fi ----------------------------------------------------------------
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// ---- Backend --------------------------------------------------------------
// IP of the machine running the FastAPI backend, on the same local network.
#define SERVER_URL      "http://192.168.1.100:8000/api/sensor-data"
#define DEVICE_ID       "esp32-soil-01"

// Soil type for the recommenders. The tabular models accept one of:
//   Black | Clayey | Loamy | Red | Sandy
// Leave empty ("") to omit it and set soil type from a photo on the dashboard.
#define SOIL_TYPE       "Loamy"

// ---- Send interval --------------------------------------------------------
#define SEND_INTERVAL_MS  10000   // every 10 s

// ---- DHT22 (air temperature + humidity) ----------------------------------
#define DHT_PIN          4
#define DHT_TYPE         DHT22

// ---- Soil moisture (capacitive sensor, analog) ---------------------------
// Two capacitive v2.0 probes. BOTH must be on ADC1 pins (ADC2 conflicts with
// Wi-Fi). 34 and 35 are input-only ADC1 channels — perfect for analog sensors.
#define SOIL_MOISTURE_PIN   34    // sensor A (AOUT) -> GPIO34
#define SOIL_MOISTURE_PIN_2 35    // sensor B (AOUT) -> GPIO35
// Calibrate: read raw ADC in air (dry) and submerged in water (wet).
#define MOISTURE_RAW_DRY  3200    // raw ADC value in dry air  -> 0 %
#define MOISTURE_RAW_WET  1200    // raw ADC value in water     -> 100 %

// ---- NPK sensor (RS485 / Modbus RTU, e.g. JXCT 7-in-1) --------------------
// Wired via a MAX485 / RS485-TTL module on UART2.
#define RS485_RX_PIN     16       // ESP32 RX  <- RO (MAX485)
#define RS485_TX_PIN     17       // ESP32 TX  -> DI (MAX485)
#define RS485_DE_RE_PIN  5        // DE+RE tied together, driven HIGH to transmit
#define RS485_BAUD       9600
#define NPK_SLAVE_ADDR   0x01
// Holding-register addresses (vary by sensor model — adjust to your datasheet):
#define NPK_REG_NITROGEN    0x001E
#define NPK_REG_PHOSPHOROUS 0x001F
#define NPK_REG_POTASSIUM   0x0020

// ---- DS18B20 soil-temperature probe (OneWire, waterproof) ----------------
// Own free pin (GPIO5 is already used by RS485 DE/RE — sharing it pins the
// OneWire line LOW and the probe is never detected). GPIO13 is free.
#define DS18B20_PIN      13       // DATA (yellow) -> GPIO13

// ---- BH1750 (GY-302) ambient light sensor (I2C) --------------------------
#define BH1750_SDA_PIN   21
#define BH1750_SCL_PIN   22       // ADDR -> GND => I2C address 0x23

// ---- Status LED (optional) ------------------------------------------------
#define STATUS_LED_PIN   2        // onboard LED on most ESP32 dev boards

#endif // CONFIG_H
