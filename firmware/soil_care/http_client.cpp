#include "http_client.h"
#include "config.h"

#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <math.h>
#include <time.h>

// Add a numeric field, or JSON null when the reading failed (NAN).
static void addNum(JsonDocument &doc, const char *key, float v) {
  if (isnan(v)) doc[key] = nullptr;
  else          doc[key] = v;
}

int http_send_readings(const SensorReadings &r) {
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);   // 10s

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;

  // Unix timestamp if NTP is set, otherwise omit (backend uses server time).
  time_t now = time(nullptr);
  if (now > 1700000000) doc["timestamp"] = (uint32_t)now;

  addNum(doc, "nitrogen",    r.nitrogen);
  addNum(doc, "potassium",   r.potassium);
  addNum(doc, "phosphorous", r.phosphorous);
  addNum(doc, "temperature", r.temperature);
  addNum(doc, "humidity",    r.humidity);
  addNum(doc, "moisture",    r.moisture);
  addNum(doc, "soil_temperature", r.soil_temperature);
  addNum(doc, "light_intensity",  r.light_intensity);

  if (strlen(SOIL_TYPE) > 0) doc["soil_type"] = SOIL_TYPE;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code > 0) {
    Serial.printf("POST %s -> %d\n", SERVER_URL, code);
    if (code != 200) Serial.println(http.getString());
  } else {
    Serial.printf("POST failed: %s\n", http.errorToString(code).c_str());
  }
  http.end();
  return code;
}
