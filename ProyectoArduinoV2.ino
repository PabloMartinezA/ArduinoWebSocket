#include "FS.h"
#include <Arduino.h>
#ifdef ESP32
#include <WiFi.h>
#include <AsyncTCP.h>
#include "SPIFFS.h"
#elif defined(ESP8266)
#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#include <LittleFS.h>
#endif
#include <ESPAsyncWebServer.h>

//Replace the SSID and Password according to your wifi
const char *ssid = "IZZI-ED55";
const char *password = "189C27F5ED55";

//Webserver and Websockets setup
AsyncWebServer server(80);
AsyncWebSocket webSocket("/ws");

// LDR Pin
static int sensorVal = 0;
const int ANALOG_READ_PIN = A0;  // or A0

void notFound(AsyncWebServerRequest *request) {
  Serial.println("Page not found");
  request->send(404, "text/plain", "Not found");
}

//Callback function for our websocket message
void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    // client connected
    Serial.println("Client connected....");
    os_printf("ws[%s][%u] connect\n", server->url(), client->id());
    client->ping();
  } else if (type == WS_EVT_DISCONNECT) {
    // client disconnected
    os_printf("ws[%s][%u] disconnect: %u\n", server->url(), client->id());
  } else if (type == WS_EVT_ERROR) {
    // error was received from the other end
    os_printf("ws[%s][%u] error(%u): %s\n", server->url(), client->id(), *((uint16_t *)arg), (char *)data);
  } else if (type == WS_EVT_PONG) {
    // pong message was received (in response to a ping request maybe)
    os_printf("ws[%s][%u] pong[%u]: %s\n", server->url(), client->id(), len, (len) ? (char *)data : "");
  } else if (type == WS_EVT_DATA) {
    // do nothing as client is not sending message to server
    os_printf("ws[%s][%u] data received\n", server->url(), client->id());
  }
}

// function to read LDR value
void readLDRValue() {

  // Read
  int tempSensorVal = analogRead(ANALOG_READ_PIN);

  // Check if value read is different then send a websocket message to the client
  if (tempSensorVal != sensorVal) {
    Serial.println(tempSensorVal);
    sensorVal = tempSensorVal;

    // send message to clients when Connected
    webSocket.printfAll(std::to_string(sensorVal).c_str());

    // adding a little delay
    delay(10);
  }
}
 
void setup() {
  Serial.begin(115200);
  
  if(!SPIFFS.begin()){
    Serial.println("An Error has occurred while mounting SPIFFS");
    return;
  }
  
  File file = SPIFFS.open("/index.html", "r");
  if(!file){
    Serial.println("Failed to open file for reading");
    return;
  }
  
  Serial.println();
  Serial.println("File Content:");
  while(file.available()){
    Serial.write(file.read());
  }

   // Connect to WIFI
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  if (WiFi.waitForConnectResult() != WL_CONNECTED) {
    Serial.printf("WiFi Failed!\n");
    return;
  }

  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // attach AsyncWebSocket
  webSocket.onEvent(onEvent);
  server.addHandler(&webSocket);

  // Route for root index.html
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/index.html", "text/html");
  });

   server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/index.html", "text/html");
  });

  // Route for root index.css
  server.on("/index.css", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/index.css", "text/css");
  });

  // Route for root entireframework.min.css
  server.on("/entireframework.min.css", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/entireframework.min.css", "text/css");
  });

  // Route for root index.js
  server.on("/index.js", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/index.js", "text/javascript");
  });

  server.onNotFound(notFound);

  // Start the server
  server.begin();
}
 
void loop() {
  // Read the LDR values continuously
  readLDRValue();
  delay(8000);
}
