#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <driver/i2s.h>
#include <driver/dac.h>

// WiFi credentials
const char* ssid = "poopoo";
const char* password = "hellohello";

// WebSocket server - MUST USE WSS for Hugging Face Spaces!
const char* ws_host = "arpy8-aasha-ai-esp-server.hf.space";
const uint16_t ws_port = 443;  // Changed from 8765 to 443 for WSS
const char* ws_path = "/";

// I2S configuration for INMP441 microphone
#define I2S_WS 15
#define I2S_SD 32
#define I2S_SCK 14
#define I2S_PORT I2S_NUM_0

// DAC output for LM386 (use DAC_CHANNEL_1 = GPIO25 or DAC_CHANNEL_2 = GPIO26)
#define DAC_CHANNEL DAC_CHANNEL_1  // GPIO25
#define SPEAKER_PIN 25

// Audio settings
#define SAMPLE_RATE 16000
#define BUFFER_SIZE 1024
#define RECORD_TIME 5  // seconds

WebSocketsClient webSocket;
bool isRecording = false;
bool isReceivingAudio = false;

// For DAC playback
hw_timer_t* timer = NULL;
uint8_t* playbackBuffer = NULL;
size_t playbackSize = 0;
size_t playbackIndex = 0;
bool isPlaying = false;

void IRAM_ATTR onTimer() {
  if (isPlaying && playbackIndex < playbackSize) {
    // Skip WAV header (44 bytes) and convert 16-bit to 8-bit for DAC
    if (playbackIndex >= 44) {
      // Read 16-bit sample and scale to 8-bit (0-255)
      int16_t sample16 = *(int16_t*)(playbackBuffer + playbackIndex);
      uint8_t sample8 = (sample16 >> 8) + 128;  // Convert signed to unsigned
      dac_output_voltage(DAC_CHANNEL, sample8);
      playbackIndex += 2;  // 16-bit = 2 bytes
    } else {
      playbackIndex += 2;
    }
  } else if (playbackIndex >= playbackSize) {
    isPlaying = false;
    dac_output_voltage(DAC_CHANNEL, 128);  // Silence (middle value)
  }
}

void setupI2SMicrophone() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,  // INMP441 outputs 32-bit
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 64,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_set_clk(I2S_PORT, SAMPLE_RATE, I2S_BITS_PER_SAMPLE_32BIT, I2S_CHANNEL_MONO);
}

void setupDACOutput() {
  // Enable DAC on the specified channel
  dac_output_enable(DAC_CHANNEL);
  dac_output_voltage(DAC_CHANNEL, 128);  // Set to middle value (silence)

  // Setup timer for DAC sample rate (16kHz)
  // timer = timerBegin(0, 80, true);  // Timer 0, divider 80 (1MHz), count up
  // timerAttachInterrupt(timer, &onTimer, true);
  // timerAlarmWrite(timer, 1000000 / SAMPLE_RATE, true);  // 1MHz / 16000 = 62.5
  // timerAlarmEnable(timer);

  hw_timer_t* timerBegin(uint32_t frequency);
  void timerAttachInterrupt(hw_timer_t * timer, void (*userFunc)(void));
  void timerWrite(hw_timer_t * timer, uint64_t value);

  Serial.println("DAC initialized on GPIO" + String(SPEAKER_PIN));
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected");
      isReceivingAudio = false;
      break;

    case WStype_CONNECTED:
      Serial.println("[WS] Connected to server");
      // Send a ping to test connection
      webSocket.sendTXT("{\"command\":\"ping\"}");
      break;

    case WStype_TEXT:
      {
        // Parse JSON message
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, payload);

        if (!error) {
          const char* status = doc["status"];
          const char* message = doc["message"];

          Serial.print("[WS] Status: ");
          Serial.println(status);

          if (strcmp(status, "processing") == 0) {
            Serial.println("🎤 Server is processing your audio...");
          } else if (strcmp(status, "success") == 0) {
            Serial.print("💬 Response: ");
            Serial.println(doc["text"].as<const char*>());

            int audioSize = doc["audio_size"];
            Serial.print("📊 Audio size: ");
            Serial.print(audioSize);
            Serial.println(" bytes");

            // Prepare buffer for incoming audio
            if (playbackBuffer != NULL) {
              free(playbackBuffer);
            }
            playbackBuffer = (uint8_t*)malloc(audioSize);
            playbackSize = audioSize;
            playbackIndex = 0;
            isReceivingAudio = true;
            isPlaying = false;
          } else if (strcmp(status, "complete") == 0) {
            Serial.println("✅ Audio received. Starting playback...");
            isReceivingAudio = false;
            playbackIndex = 0;
            isPlaying = true;
          } else if (strcmp(status, "error") == 0) {
            Serial.print("❌ Error: ");
            Serial.println(message);
          } else if (strcmp(status, "pong") == 0) {
            Serial.println("✓ Server connection OK");
          }
        }
      }
      break;

    case WStype_BIN:
      {
        // Received audio data chunk
        if (isReceivingAudio && playbackBuffer != NULL) {
          memcpy(playbackBuffer + playbackIndex, payload, length);
          playbackIndex += length;
          Serial.print("📦 Received chunk: ");
          Serial.print(length);
          Serial.print(" bytes (");
          Serial.print((playbackIndex * 100) / playbackSize);
          Serial.println("%)");
        }
      }
      break;

    case WStype_ERROR:
      Serial.println("[WS] Error occurred");
      break;
  }
}

void recordAndSendAudio() {
  Serial.println("\n🎙️ Recording audio for " + String(RECORD_TIME) + " seconds...");

  // Stop any ongoing playback
  isPlaying = false;
  dac_output_voltage(DAC_CHANNEL, 128);

  // Create WAV header
  const int headerSize = 44;
  const int dataSize = SAMPLE_RATE * RECORD_TIME * 2;  // 16-bit samples
  uint8_t wavHeader[headerSize];

  // WAV header construction
  memcpy(wavHeader, "RIFF", 4);
  uint32_t fileSize = dataSize + headerSize - 8;
  memcpy(wavHeader + 4, &fileSize, 4);
  memcpy(wavHeader + 8, "WAVE", 4);
  memcpy(wavHeader + 12, "fmt ", 4);
  uint32_t fmtSize = 16;
  memcpy(wavHeader + 16, &fmtSize, 4);
  uint16_t audioFormat = 1;
  memcpy(wavHeader + 20, &audioFormat, 2);
  uint16_t numChannels = 1;
  memcpy(wavHeader + 22, &numChannels, 2);
  uint32_t sampleRate = SAMPLE_RATE;
  memcpy(wavHeader + 24, &sampleRate, 4);
  uint32_t byteRate = SAMPLE_RATE * 2;
  memcpy(wavHeader + 28, &byteRate, 4);
  uint16_t blockAlign = 2;
  memcpy(wavHeader + 32, &blockAlign, 2);
  uint16_t bitsPerSample = 16;
  memcpy(wavHeader + 34, &bitsPerSample, 2);
  memcpy(wavHeader + 36, "data", 4);
  memcpy(wavHeader + 40, &dataSize, 4);

  // Allocate buffer for entire WAV file
  uint8_t* wavData = (uint8_t*)malloc(headerSize + dataSize);
  if (!wavData) {
    Serial.println("❌ Failed to allocate memory!");
    return;
  }

  // Copy header
  memcpy(wavData, wavHeader, headerSize);

  // Record audio
  size_t bytesRead;
  size_t totalBytesRead = 0;
  int32_t i2s_buffer[BUFFER_SIZE / 4];

  Serial.println("Recording:");
  while (totalBytesRead < dataSize) {
    // Read 32-bit samples from INMP441
    i2s_read(I2S_PORT, i2s_buffer, BUFFER_SIZE, &bytesRead, portMAX_DELAY);

    // Convert 32-bit to 16-bit
    int samples = bytesRead / 4;
    for (int i = 0; i < samples && totalBytesRead < dataSize; i++) {
      int16_t sample16 = i2s_buffer[i] >> 14;  // Shift right to get 16-bit
      memcpy(wavData + headerSize + totalBytesRead, &sample16, 2);
      totalBytesRead += 2;
    }

    // Progress indicator
    if (totalBytesRead % (SAMPLE_RATE * 2) == 0) {
      Serial.print("█");
    }
  }

  Serial.println("\n✅ Recording complete!");
  Serial.println("📤 Sending to server...");

  // Send binary data to server
  if (webSocket.isConnected()) {
    webSocket.sendBIN(wavData, headerSize + dataSize);
    Serial.println("✓ Audio sent to server!");
  } else {
    Serial.println("❌ Not connected to server!");
  }

  free(wavData);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n╔═══════════════════════════════════╗");
  Serial.println("║   ESP32 Voice Assistant v1.0    ║");
  Serial.println("╚═══════════════════════════════════╝\n");

  // Connect to WiFi
  Serial.print("📡 Connecting to WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi connected!");
  Serial.print("🌐 IP address: ");
  Serial.println(WiFi.localIP());

  // Setup I2S for microphone
  Serial.println("🎤 Initializing INMP441 microphone...");
  setupI2SMicrophone();

  // Setup DAC for speaker (LM386)
  Serial.println("📊 Initializing LM386 amplifier...");
  setupDACOutput();

  // Connect to WebSocket with SSL
  Serial.print("🔌 Connecting to secure server wss://");
  Serial.print(ws_host);
  Serial.print(":");
  Serial.println(ws_port);

  // Use beginSSL for secure WebSocket connection
  webSocket.beginSSL(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  // Disable SSL certificate verification (use with caution!)
  // This is necessary for some servers with self-signed certificates
  webSocket.setInsecure();

  Serial.println("\n✅ Setup complete!");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("Commands:");
  Serial.println("  'r' or 'R' - Record and send audio");
  Serial.println("  's' - Show status");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

void loop() {
  webSocket.loop();

  // Check serial commands
  if (Serial.available() > 0) {
    char cmd = Serial.read();

    if (cmd == 'r' || cmd == 'R') {
      if (webSocket.isConnected()) {
        recordAndSendAudio();
      } else {
        Serial.println("❌ Not connected to server. Reconnecting...");
      }
    } else if (cmd == 's' || cmd == 'S') {
      Serial.println("\n📊 Status:");
      Serial.print("  WiFi: ");
      Serial.println(WiFi.status() == WL_CONNECTED ? "✓ Connected" : "✗ Disconnected");
      Serial.print("  WebSocket: ");
      Serial.println(webSocket.isConnected() ? "✓ Connected" : "✗ Disconnected");
      Serial.print("  Playing: ");
      Serial.println(isPlaying ? "Yes" : "No");
      Serial.print("  IP: ");
      Serial.println(WiFi.localIP());
      Serial.println();
    }
  }
}