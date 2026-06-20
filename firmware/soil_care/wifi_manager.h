#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

void wifi_begin();          // connect, with retry + timeout
bool wifi_connected();
void wifi_ensure();         // reconnect if dropped

#endif // WIFI_MANAGER_H
