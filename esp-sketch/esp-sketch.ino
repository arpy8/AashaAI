#include <WiFi.h>
#include <driver/i2s.h>
#include <driver/dac.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>
#include "secrets.h"

#define I2S_WS 15
#define I2S_SD 32
#define I2S_SCK 14
#define I2S_PORT I2S_NUM_0

#define RECORD_BUTTON 26
#define LED_BUILTIN 2

#define DAC_CHANNEL DAC_CHANNEL_1

#define SAMPLE_RATE 8000
#define BUFFER_SIZE 4096
#define RECORD_TIME 3

WebSocketsClient webSocket;
bool isRecording = false;
bool isReceivingAudio = false;

hw_timer_t* timer = NULL;
uint8_t* playbackBuffer = NULL;
size_t playbackSize = 0;
size_t playbackIndex = 0;
bool isPlaying = false;

void IRAM_ATTR onTimer() {
  if (isPlaying && playbackIndex < playbackSize) {
    if (playbackIndex >= 44) {
      int16_t sample16 = *(int16_t*)(playbackBuffer + playbackIndex);
      uint8_t sample8 = (sample16 >> 8) + 128;
      dac_output_voltage(DAC_CHANNEL, sample8);
      playbackIndex += 2;
    } else {
      playbackIndex += 2;
    }
  } else if (playbackIndex >= playbackSize) {
    isPlaying = false;
    dac_output_voltage(DAC_CHANNEL, 128);
  }
}

void setupI2SMicrophone() {
  Serial.print("Microphone...");

  const i2s_config_t i2s_config = {
    .mode = i2s_mode_t(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT,
    .communication_format = i2s_comm_format_t(I2S_COMM_FORMAT_STAND_I2S),
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 512,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  esp_err_t err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("Failed to install I2S driver: %d\n", err);
    return;
  }

  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD
  };

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("Failed to set I2S pins: %d\n", err);
    return;
  }

  i2s_zero_dma_buffer(I2S_PORT);
  // Serial.println("I2S initialized successfully (RIGHT channel)");
  Serial.println("✓");
}

void send_audio_chunk() {
  const int samples = 1024;
  int32_t buffer32[samples];
  size_t bytes_read;

  esp_err_t result = i2s_read(I2S_PORT, buffer32, samples * sizeof(int32_t),
                              &bytes_read, portMAX_DELAY);

  if (result != ESP_OK) {
    Serial.printf("I2S read error: %d\n", result);
    return;
  }

  // Convert 32-bit to 16-bit PCM with bit shift of 16
  int16_t pcm16[samples];
  for (int i = 0; i < samples; i++) {
    pcm16[i] = (int16_t)(buffer32[i] >> 16);
  }

  webSocket.sendBIN((uint8_t*)pcm16, sizeof(pcm16));
}

void setupDACOutput() {
  Serial.print("Speaker...");

  dac_output_enable(DAC_CHANNEL);
  dac_output_voltage(DAC_CHANNEL, 128);

  timer = timerBegin(0, 80, true);
  timerAttachInterrupt(timer, &onTimer, true);
  timerAlarmWrite(timer, 1000000 / SAMPLE_RATE, true);
  timerAlarmEnable(timer);

  Serial.println("✓");
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to server");
      webSocket.sendTXT("{\"command\":\"ping\"}");
      break;

    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected");
      isReceivingAudio = false;
      break;

    case WStype_TEXT:
      {
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, payload);

        if (!error) {
          const char* status = doc["status"];
          const char* message = doc["message"];

          Serial.print("[WS] Status: ");

          if (strcmp(status, "processing") == 0) {
            Serial.println(message);
          } else if (strcmp(status, "success") == 0) {
            Serial.println(status);
            Serial.print("Response: ");
            Serial.println(doc["text"].as<const char*>());

            int audioSize = doc["audio_size"];
            Serial.print("Audio size: ");
            Serial.print(audioSize);
            Serial.println(" bytes");

            if (playbackBuffer != NULL) {
              free(playbackBuffer);
            }
            playbackBuffer = (uint8_t*)malloc(audioSize);
            playbackSize = audioSize;
            playbackIndex = 0;
            isReceivingAudio = true;
            isPlaying = false;
          } else if (strcmp(status, "complete") == 0) {
            Serial.println("✓ Audio received. Starting playback...");
            isReceivingAudio = false;
            playbackIndex = 0;
            isPlaying = true;
          } else if (strcmp(status, "error") == 0) {
            Serial.print("x Error: ");
            Serial.println(message);
          } else if (strcmp(status, "pong") == 0) {
            Serial.println("✓ Server connection OK");
          }
        }
      }
      break;

    case WStype_BIN:
      for (size_t i = 0; i < length; i++) {
        dac_output_voltage(DAC_CHANNEL_1, payload[i]);
        delayMicroseconds(125);
      }
      break;

    case WStype_ERROR:
      Serial.println("[WS] Error occurred");
      break;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(RECORD_BUTTON, INPUT_PULLDOWN);

  Serial.println("\n\n╔═══════════════════════════════════╗");
  Serial.println("║           Aasha AI v1.0           ║");
  Serial.println("╚═══════════════════════════════════╝\n");

  Serial.print("WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("✓");

  setupI2SMicrophone();

  setupDACOutput();

  Serial.print("Wifi addr: ");
  Serial.println(WiFi.localIP());
  Serial.print("Server addr: ");
  Serial.print(ws_host);
  Serial.print(":");
  Serial.println(ws_port);

  webSocket.begin(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  Serial.println("\nSetup complete!");

  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
}

void loop() {
  webSocket.loop();
  static bool lastButtonState = LOW;
  bool button = digitalRead(RECORD_BUTTON);
  if (button == HIGH && lastButtonState == LOW) {
    digitalWrite(LED_BUILTIN, HIGH);
    Serial.println("Recording started...");
    isRecording = true;
  } else if (button == LOW && lastButtonState == HIGH) {
    digitalWrite(LED_BUILTIN, LOW);
    Serial.println("Recording stopped.");
    isRecording = false;
    webSocket.sendTXT("{\"command\":\"stop\"}");
  }
  lastButtonState = button;

  if (isRecording && webSocket.isConnected()) {
    uint8_t buffer[BUFFER_SIZE];
    size_t bytesRead;
    i2s_read(I2S_NUM_0, &buffer, BUFFER_SIZE, &bytesRead, portMAX_DELAY);
    if (bytesRead > 0) webSocket.sendBIN(buffer, bytesRead);
  }

  delay(10);
}