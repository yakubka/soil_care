#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>

// One reading cycle from all sensors. NAN marks a failed read for that channel.
struct SensorReadings {
  float nitrogen;          // mg/kg (NPK probe, RS485)
  float potassium;         // mg/kg (NPK probe, RS485)
  float phosphorous;       // mg/kg (NPK probe, RS485)
  float temperature;       // °C  (air, DHT22)
  float humidity;          // %   (air, DHT22)
  float moisture;          // %   (soil, capacitive)
  float soil_temperature;  // °C  (soil, DS18B20)
  float light_intensity;   // lux (BH1750)
};

void sensors_begin();
SensorReadings sensors_read();

#endif // SENSORS_H
