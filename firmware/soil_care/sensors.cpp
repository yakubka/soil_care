#include "sensors.h"
#include "config.h"

#include <math.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <BH1750.h>

static HardwareSerial RS485(2);
static DHT dht(DHT_PIN, DHT_TYPE);
static OneWire oneWire(DS18B20_PIN);
static DallasTemperature ds18b20(&oneWire);
static BH1750 lightMeter;
static bool bh1750_ok = false;

static uint16_t modbusCRC(const uint8_t *buf, uint8_t len) {
  uint16_t crc = 0xFFFF;
  for (uint8_t i = 0; i < len; i++) {
    crc ^= buf[i];
    for (uint8_t b = 0; b < 8; b++) {
      if (crc & 0x0001) { crc >>= 1; crc ^= 0xA001; }
      else              { crc >>= 1; }
    }
  }
  return crc;
}

static float readRegister(uint16_t reg) {
  uint8_t req[8];
  req[0] = NPK_SLAVE_ADDR;
  req[1] = 0x03;
  req[2] = reg >> 8;
  req[3] = reg & 0xFF;
  req[4] = 0x00;
  req[5] = 0x01;
  uint16_t crc = modbusCRC(req, 6);
  req[6] = crc & 0xFF;
  req[7] = crc >> 8;

  digitalWrite(RS485_DE_RE_PIN, HIGH);
  delayMicroseconds(50);
  RS485.write(req, 8);
  RS485.flush();
  digitalWrite(RS485_DE_RE_PIN, LOW);

  uint8_t resp[7];
  uint32_t start = millis();
  uint8_t idx = 0;
  while (idx < 7 && (millis() - start) < 300) {
    if (RS485.available()) resp[idx++] = RS485.read();
  }
  if (idx < 7) return NAN;
  uint16_t respCrc = modbusCRC(resp, 5);
  if ((respCrc & 0xFF) != resp[5] || (respCrc >> 8) != resp[6]) return NAN;
  return (float)((resp[3] << 8) | resp[4]);
}

void sensors_begin() {
  dht.begin();

  pinMode(RS485_DE_RE_PIN, OUTPUT);
  digitalWrite(RS485_DE_RE_PIN, LOW);
  RS485.begin(RS485_BAUD, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);

  analogReadResolution(12);

  // No external 4.7k pull-up? Enable the ESP32 internal pull-up on the OneWire
  // data line. Weak (~45k) but usually enough for a single probe on a short wire.
  pinMode(DS18B20_PIN, INPUT_PULLUP);
  ds18b20.begin();
  Serial.printf("[sensors] DS18B20 devices found: %d\n", ds18b20.getDeviceCount());

  Wire.begin(BH1750_SDA_PIN, BH1750_SCL_PIN);
  bh1750_ok = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  Serial.printf("[sensors] BH1750 init: %s\n", bh1750_ok ? "OK" : "NOT FOUND");
}

static float rawToPercent(int raw) {
  float pct = (float)(MOISTURE_RAW_DRY - raw) * 100.0f /
              (float)(MOISTURE_RAW_DRY - MOISTURE_RAW_WET);
  if (pct < 0)   pct = 0;
  if (pct > 100) pct = 100;
  return pct;
}

// Read both capacitive probes (A=GPIO34, B=GPIO35) and return moisture % for
// the model. A channel railed at ~4095 is an OPEN/disconnected AOUT (a live
// probe in dry air reads ~3000-3300, never a hard 4095), so it's excluded from
// the average — otherwise a dead sensor would drag the real reading down.
static float readMoisturePercent() {
  int rawA = analogRead(SOIL_MOISTURE_PIN);
  int rawB = analogRead(SOIL_MOISTURE_PIN_2);
  float a = rawToPercent(rawA);
  float b = rawToPercent(rawB);
  bool okA = rawA > 5 && rawA < 4090;   // plausible = wired and sensing
  bool okB = rawB > 5 && rawB < 4090;
  Serial.printf("[cal]  moisture A(G%d) raw=%d -> %.1f%%%s  |  B(G%d) raw=%d -> %.1f%%%s\n",
                SOIL_MOISTURE_PIN, rawA, a, okA ? "" : " [open]",
                SOIL_MOISTURE_PIN_2, rawB, b, okB ? "" : " [open]");
  if (okA && okB) return (a + b) / 2.0f;
  if (okA) return a;
  if (okB) return b;
  return (a + b) / 2.0f;  // both look disconnected — report anyway
}

SensorReadings sensors_read() {
  SensorReadings r;

  r.nitrogen    = readRegister(NPK_REG_NITROGEN);   delay(50);
  r.phosphorous = readRegister(NPK_REG_PHOSPHOROUS); delay(50);
  r.potassium   = readRegister(NPK_REG_POTASSIUM);

  r.temperature = dht.readTemperature();
  r.humidity    = dht.readHumidity();
  r.moisture    = readMoisturePercent();

  // DS18B20 soil temperature (-127 means "no sensor / read error").
  ds18b20.requestTemperatures();
  float st = ds18b20.getTempCByIndex(0);
  r.soil_temperature = (st <= -100.0f) ? NAN : st;

  // BH1750 ambient light.
  r.light_intensity = bh1750_ok ? lightMeter.readLightLevel() : NAN;

  return r;
}
