// ===========================================================================
//  Soil Care System — ESP32 firmware (entry point)
//
//  Reads NPK (RS485/Modbus), soil moisture (ADC) and air temp/humidity (DHT22),
//  then POSTs them as JSON to the FastAPI backend every SEND_INTERVAL_MS.
//
//  Libraries (Arduino Library Manager):
//    - DHT sensor library (Adafruit)  + Adafruit Unified Sensor
//    - ArduinoJson (7.x)
//  HTTPClient / WiFi are part of the ESP32 Arduino core.
// ===========================================================================

#include <WiFi.h>
#include <time.h>
#include <math.h>

#include "config.h"
#include "sensors.h"
#include "wifi_manager.h"
#include "http_client.h"

static void blink(int times, int ms) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH); delay(ms);
    digitalWrite(STATUS_LED_PIN, LOW);  delay(ms);
  }
}

// Report exactly which physical sensor failed to return data this cycle.
// A channel is NAN when its sensor did not respond (see sensors.cpp). This
// makes it obvious which value is real and which one is missing.
static void report_sensor_health(const SensorReadings &r) {
  struct { const char *name; float v; } ch[] = {
    {"NPK Nitrogen (RS485/Modbus)",    r.nitrogen},
    {"NPK Phosphorous (RS485/Modbus)", r.phosphorous},
    {"NPK Potassium (RS485/Modbus)",   r.potassium},
    {"DHT22 air temperature (GPIO4)",  r.temperature},
    {"DHT22 humidity (GPIO4)",         r.humidity},
    {"Soil moisture (ADC34)",          r.moisture},
    {"DS18B20 soil temp (OneWire G5)", r.soil_temperature},
    {"BH1750 light (I2C 0x23)",        r.light_intensity},
  };
  int failed = 0;
  for (auto &c : ch) {
    if (isnan(c.v)) {
      Serial.printf("[FAIL] %s — NO DATA (sensor not responding / check wiring)\n", c.name);
      failed++;
    }
  }
  if (failed == 0) Serial.println("[health] all 8 channels responded OK");
  else             Serial.printf("[health] %d sensor channel(s) failed this cycle\n", failed);
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Soil Care System — ESP32 node ===");

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  sensors_begin();
  wifi_begin();

  // Optional NTP so payloads carry a real timestamp (backend works without it).
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

void loop() {
  wifi_ensure();

  SensorReadings r = sensors_read();
  Serial.println("---------------------------------------------");
  Serial.printf("[read] soil   : N=%.0f  P=%.0f  K=%.0f mg/kg | moisture=%.1f%% | soilT=%.1f C\n",
                r.nitrogen, r.phosphorous, r.potassium, r.moisture, r.soil_temperature);
  Serial.printf("[read] ambient: airT=%.1f C | humidity=%.1f%% | light=%.0f lux\n",
                r.temperature, r.humidity, r.light_intensity);
  report_sensor_health(r);

  if (wifi_connected()) {
    Serial.println("[net]  POST -> backend ...");
    int code = http_send_readings(r);
    blink(code == 200 ? 1 : 3, 120);
  } else {
    Serial.println("No Wi-Fi — skipping upload this cycle.");
    blink(5, 80);
  }

  delay(SEND_INTERVAL_MS);
}
