#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include "sensors.h"

// Build the JSON payload and POST it to the backend.
// Returns the HTTP status code, or a negative value on transport error.
int http_send_readings(const SensorReadings &r);

#endif // HTTP_CLIENT_H
