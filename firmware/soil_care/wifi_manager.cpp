#include "wifi_manager.h"
#include "config.h"

#include <WiFi.h>

void wifi_begin() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < 30000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connect timeout — will retry in loop.");
  }
}

bool wifi_connected() {
  return WiFi.status() == WL_CONNECTED;
}

void wifi_ensure() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.println("Wi-Fi dropped — reconnecting...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < 10000) {
    delay(500);
  }
}
