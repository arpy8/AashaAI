/**
 * @file main.c
 * @brief AashaAI ESP32-S3 firmware — wake-word detection, VAD, streaming, and
 *        Opus audio playback via WebSocket.
 *
 * Architecture:
 *   Core 0 — WiFi, WebSocket client, WakeNet, recording, Opus decode
 *   Core 1 — I2S playback renderer (playback_task, spawned on demand)
 */

#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include "esp_wn_iface.h"
#include "esp_wn_models.h"
#include "model_path.h"
#include "driver/gpio.h"
#include "driver/i2s_std.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "nvs_flash.h"
#include "esp_http_client.h"
#include "esp_crt_bundle.h"
#include "cJSON.h"
#include "opus.h"
#include "esp_websocket_client.h"

// ─── Sample rates ─────────────────────────────────────────────────────────────
#define SAMPLE_RATE        16000
#define SERVER_SAMPLE_RATE 24000

// ─── Pin configuration ────────────────────────────────────────────────────────
#define LED_PIN   GPIO_NUM_13
#define I2S_BCLK  GPIO_NUM_10
#define I2S_WS    GPIO_NUM_11
#define I2S_DIN   GPIO_NUM_12
#define SPK_DOUT  GPIO_NUM_9
#define SPK_BCLK  GPIO_NUM_8
#define SPK_LRC   GPIO_NUM_7

// ─── WiFi / Server ────────────────────────────────────────────────────────────
#define WIFI_SSID      "poopoo"
#define WIFI_PASSWORD  "hellohello"
#define SERVER_WS_URL  "ws://192.168.137.1:8000"

// ─── VAD / recording parameters ───────────────────────────────────────────────
static float SILENCE_THRESHOLD     = 300.0f;
#define SPEECH_ENERGY_MULTIPLIER    1.3f
#define SILENCE_DURATION_MS         1000
#define NO_SPEECH_TIMEOUT_MS        2000
#define CALIBRATION_SAMPLES         50
#define SILENCE_MULTIPLIER          1.5f
#define ENERGY_SMOOTHING_FACTOR     0.3f
#define MAX_RECORDING_SECONDS       20
#define GAIN_BOOSTER                4

// ─── Opus / streaming parameters ──────────────────────────────────────────────
#define AUDIO_FRAME_SIZE          480
#define STREAMING_CHUNK_BYTES     (AUDIO_FRAME_SIZE * 2)
#define STREAMING_BUFFER_SAMPLES  5760
#define RESAMPLE_RATIO            1.5f

// ─── Playback parameters ──────────────────────────────────────────────────────
#define MAX_PLAYBACK_CHUNK_SAMPLES  480

// ─── Core pinning ─────────────────────────────────────────────────────────────
#define CORE_NETWORK   0
#define CORE_PLAYBACK  1

// ─── Globals ──────────────────────────────────────────────────────────────────
static float              smoothed_energy = 0.0f;
static i2s_chan_handle_t  rx_handle       = NULL;
static i2s_chan_handle_t  tx_handle       = NULL;
static const char        *TAG             = "WAKENET";

static uint8_t  *streaming_audio_buffer = NULL;
static size_t    streaming_buffer_size  = 0;
static size_t    streaming_buffer_pos   = 0;
static bool      is_streaming_audio     = false;

static uint8_t      *playback_buffer          = NULL;
static size_t        playback_buffer_capacity = 0;
static size_t        playback_write_pos       = 0;
static size_t        playback_read_pos        = 0;
static bool          playback_started         = false;
static bool          playback_complete        = false;
static TaskHandle_t  playback_task_handle     = NULL;

static esp_websocket_client_handle_t ws_client     = NULL;
static SemaphoreHandle_t             ws_sem         = NULL;
static bool                          ws_connected   = false;
static bool                          audio_streaming = false;

static OpusDecoder *opus_decoder      = NULL;
static int16_t     *opus_decode_buffer = NULL;

static int16_t *streaming_stereo_buffer = NULL;
static int16_t *resample_buffer         = NULL;
static SemaphoreHandle_t playback_mutex = NULL;

// ─── WAV header ───────────────────────────────────────────────────────────────
typedef struct {
    char     riff[4];
    uint32_t file_size;
    char     wave[4];
    char     fmt[4];
    uint32_t fmt_size;
    uint16_t audio_format;
    uint16_t num_channels;
    uint32_t sample_rate;
    uint32_t byte_rate;
    uint16_t block_align;
    uint16_t bits_per_sample;
    char     data[4];
    uint32_t data_size;
} __attribute__((packed)) wav_header_t;

// ─── Forward declarations ─────────────────────────────────────────────────────
void led_init(void);
void wifi_init(void);
void blink(int n);
void i2s_mic_init(void);
void i2s_speaker_init(void);
float calculate_audio_energy(int16_t *buffer, int sample_count);
void init_recording_buffer(void);
void start_streaming(void);
void stop_streaming(void);
size_t get_buffered_audio_size(void);
void reset_playback_buffer(void);
static void playback_task(void *arg);
static void wake_word_task(void *arg);
static void websocket_event_handler(void *handler_args, esp_event_base_t base,
                                    int32_t event_id, void *event_data);
static size_t resample_16k_to_24k(int16_t *input, size_t input_samples,
                                   int16_t *output);
void websocket_init(void);
static esp_err_t send_audio_chunk_websocket(int16_t *audio_data,
                                             size_t sample_count);
static esp_err_t send_end_of_speech(void);
void process_query(int16_t *buffer, int audio_chunksize, int sample_count);
void calibrate_silence_threshold(int16_t *buffer, int audio_chunksize,
                                  int sample_count);

// ═════════════════════════════════════════════════════════════════════════════
// Peripheral init
// ═════════════════════════════════════════════════════════════════════════════

/** @brief Configure and enable the status LED GPIO. */
void led_init(void)
{
    gpio_config_t io_conf = {
        .pin_bit_mask  = (1ULL << LED_PIN),
        .mode          = GPIO_MODE_OUTPUT,
        .pull_up_en    = GPIO_PULLUP_DISABLE,
        .pull_down_en  = GPIO_PULLDOWN_DISABLE,
        .intr_type     = GPIO_INTR_DISABLE,
    };
    gpio_config(&io_conf);
    gpio_set_level(LED_PIN, 0);
}

/** @brief Initialise WiFi in station mode and block until connected. */
void wifi_init(void)
{
    ESP_ERROR_CHECK(nvs_flash_init());
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid     = WIFI_SSID,
            .password = WIFI_PASSWORD,
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "Connecting to WiFi…");
    ESP_ERROR_CHECK(esp_wifi_connect());
    vTaskDelay(pdMS_TO_TICKS(5000));
    ESP_LOGI(TAG, "WiFi connected");
}

/** @brief Configure I2S0 as a Philips-standard mono receiver for the INMP441. */
void i2s_mic_init(void)
{
    i2s_chan_config_t chan_cfg =
        I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    ESP_ERROR_CHECK(i2s_new_channel(&chan_cfg, NULL, &rx_handle));

    i2s_std_config_t std_cfg = {
        .clk_cfg  = I2S_STD_CLK_DEFAULT_CONFIG(SAMPLE_RATE),
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(
                        I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_STEREO),
        .gpio_cfg = {
            .mclk        = I2S_GPIO_UNUSED,
            .bclk        = I2S_BCLK,
            .ws          = I2S_WS,
            .dout        = I2S_GPIO_UNUSED,
            .din         = I2S_DIN,
            .invert_flags = {
                .mclk_inv = false,
                .bclk_inv = false,
                .ws_inv   = false,
            },
        },
    };
    std_cfg.slot_cfg.slot_mask = I2S_STD_SLOT_LEFT;

    ESP_ERROR_CHECK(i2s_channel_init_std_mode(rx_handle, &std_cfg));
    ESP_ERROR_CHECK(i2s_channel_enable(rx_handle));
}

/** @brief Configure I2S1 as a stereo transmitter for the MAX98357A amplifier. */
void i2s_speaker_init(void)
{
    i2s_chan_config_t chan_cfg =
        I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_1, I2S_ROLE_MASTER);
    ESP_ERROR_CHECK(i2s_new_channel(&chan_cfg, &tx_handle, NULL));

    i2s_std_config_t std_cfg = {
        .clk_cfg  = I2S_STD_CLK_DEFAULT_CONFIG(SERVER_SAMPLE_RATE),
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(
                        I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_STEREO),
        .gpio_cfg = {
            .mclk        = I2S_GPIO_UNUSED,
            .bclk        = SPK_BCLK,
            .ws          = SPK_LRC,
            .dout        = SPK_DOUT,
            .din         = I2S_GPIO_UNUSED,
            .invert_flags = {
                .mclk_inv = false,
                .bclk_inv = false,
                .ws_inv   = false,
            },
        },
    };
    ESP_ERROR_CHECK(i2s_channel_init_std_mode(tx_handle, &std_cfg));
    ESP_ERROR_CHECK(i2s_channel_enable(tx_handle));
}

// ═════════════════════════════════════════════════════════════════════════════
// Audio helpers
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @brief Compute RMS energy of a PCM buffer with exponential smoothing.
 * @return Smoothed energy value.
 */
float calculate_audio_energy(int16_t *buffer, int sample_count)
{
    float sum = 0.0f;
    for (int i = 0; i < sample_count; i++) {
        float s = (float)buffer[i];
        sum += s * s;
    }
    float energy = sqrtf(sum / sample_count);
    smoothed_energy = (ENERGY_SMOOTHING_FACTOR * energy) +
                      ((1.0f - ENERGY_SMOOTHING_FACTOR) * smoothed_energy);
    return smoothed_energy;
}

/**
 * @brief Linear-interpolation resampler: 16 kHz → 24 kHz (ratio 1.5×).
 * @return Number of output samples written.
 */
static size_t resample_16k_to_24k(int16_t *input, size_t input_samples,
                                   int16_t *output)
{
    size_t output_samples = (size_t)(input_samples * RESAMPLE_RATIO);
    for (size_t i = 0; i < output_samples; i++) {
        float   src_idx = (float)i / RESAMPLE_RATIO;
        size_t  idx0    = (size_t)src_idx;
        size_t  idx1    = idx0 + 1;
        float   frac    = src_idx - idx0;

        if (idx1 >= input_samples)
            idx1 = input_samples - 1;

        float sample = (1.0f - frac) * input[idx0] + frac * input[idx1];
        if (sample >  32767.0f) sample =  32767.0f;
        if (sample < -32768.0f) sample = -32768.0f;
        output[i] = (int16_t)sample;
    }
    return output_samples;
}

// ─── Ring-buffer helpers ──────────────────────────────────────────────────────

/** @brief Return the number of bytes currently held in the playback ring buffer. */
size_t get_buffered_audio_size(void)
{
    if (playback_write_pos >= playback_read_pos)
        return playback_write_pos - playback_read_pos;
    return (playback_buffer_capacity - playback_read_pos) + playback_write_pos;
}

/** @brief Reset all playback ring-buffer state. */
void reset_playback_buffer(void)
{
    playback_write_pos = 0;
    playback_read_pos  = 0;
    playback_started   = false;
    playback_complete  = false;
}

// ═════════════════════════════════════════════════════════════════════════════
// Memory init
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @brief Allocate all PSRAM buffers and initialise the Opus decoder.
 *
 * Must be called once from app_main before any audio activity.
 */
void init_recording_buffer(void)
{
    playback_mutex = xSemaphoreCreateMutex();
    if (!playback_mutex) {
        ESP_LOGE(TAG, "Failed to create playback mutex");
        return;
    }

    size_t psram_free = heap_caps_get_free_size(MALLOC_CAP_SPIRAM);

    streaming_buffer_size  = 96000;
    streaming_audio_buffer = (uint8_t *)heap_caps_malloc(streaming_buffer_size,
                                                          MALLOC_CAP_SPIRAM);
    if (!streaming_audio_buffer) {
        ESP_LOGE(TAG, "Failed to allocate streaming buffer");
        return;
    }

    playback_buffer_capacity = psram_free / 2;
    playback_buffer = (uint8_t *)heap_caps_malloc(playback_buffer_capacity,
                                                   MALLOC_CAP_SPIRAM);
    if (!playback_buffer) {
        ESP_LOGE(TAG, "Failed to allocate playback buffer");
        return;
    }

    opus_decode_buffer = (int16_t *)heap_caps_malloc(
        STREAMING_BUFFER_SAMPLES * sizeof(int16_t), MALLOC_CAP_SPIRAM);
    if (!opus_decode_buffer) {
        ESP_LOGE(TAG, "Failed to allocate Opus decode buffer");
        return;
    }

    int opus_error;
    opus_decoder = opus_decoder_create(SERVER_SAMPLE_RATE, 1, &opus_error);
    if (opus_error != OPUS_OK) {
        ESP_LOGE(TAG, "Failed to create Opus decoder: %d", opus_error);
        return;
    }

    size_t max_resampled = (size_t)(1024 * RESAMPLE_RATIO) + 16;
    resample_buffer = (int16_t *)heap_caps_malloc(
        max_resampled * sizeof(int16_t), MALLOC_CAP_SPIRAM);
    if (!resample_buffer) {
        ESP_LOGE(TAG, "Failed to allocate resample buffer");
        return;
    }

    ESP_LOGI(TAG, "Streaming buffer : %u bytes (PSRAM)", streaming_buffer_size);
    ESP_LOGI(TAG, "Playback buffer  : %u bytes (PSRAM)", playback_buffer_capacity);
    ESP_LOGI(TAG, "Opus decode buf  : %u bytes (PSRAM)",
             STREAMING_BUFFER_SAMPLES * sizeof(int16_t));
    ESP_LOGI(TAG, "Resample buffer  : %u bytes (PSRAM)",
             max_resampled * sizeof(int16_t));
}

// ═════════════════════════════════════════════════════════════════════════════
// Streaming control
// ═════════════════════════════════════════════════════════════════════════════

/** @brief Begin accumulating mic audio for transmission. */
void start_streaming(void)
{
    streaming_buffer_pos = 0;
    is_streaming_audio   = true;
    ESP_LOGI(TAG, "Audio streaming started");
}

/** @brief Stop accumulating mic audio. */
void stop_streaming(void)
{
    is_streaming_audio = false;
    ESP_LOGI(TAG, "Audio streaming stopped");
}

// ═════════════════════════════════════════════════════════════════════════════
// Playback task  (pinned to Core 1)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @brief Drain the playback ring buffer through the I2S DMA in 20 ms chunks.
 *
 * Spawned exclusively from the RESPONSE.COMPLETE handler after all Opus frames
 * have been decoded into the ring buffer, so underruns are not possible.
 * Signals @c ws_sem on completion to unblock process_query().
 */
static void playback_task(void *arg)
{
    ESP_LOGI(TAG, "Playback task started on core %d", xPortGetCoreID());
    gpio_set_level(LED_PIN, 1);

    while (get_buffered_audio_size() > 0)
    {
        size_t available      = get_buffered_audio_size();
        size_t samples_to_play = available / sizeof(int16_t);

        if (samples_to_play == 0)
            break;

        if (samples_to_play > MAX_PLAYBACK_CHUNK_SAMPLES)
            samples_to_play = MAX_PLAYBACK_CHUNK_SAMPLES;

        size_t bytes_needed = samples_to_play * sizeof(int16_t);

        if (xSemaphoreTake(playback_mutex, pdMS_TO_TICKS(100)) == pdTRUE)
        {
            size_t avail_locked = get_buffered_audio_size();
            if (avail_locked < bytes_needed)
                bytes_needed = avail_locked & ~1u;
            samples_to_play = bytes_needed / sizeof(int16_t);

            if (samples_to_play == 0) {
                xSemaphoreGive(playback_mutex);
                break;
            }

            if (playback_read_pos + bytes_needed <= playback_buffer_capacity)
            {
                int16_t *src = (int16_t *)(playback_buffer + playback_read_pos);
                for (size_t i = 0; i < samples_to_play; i++) {
                    streaming_stereo_buffer[2 * i]     = src[i];
                    streaming_stereo_buffer[2 * i + 1] = src[i];
                }
                playback_read_pos += bytes_needed;
            }
            else
            {
                size_t first_bytes  = playback_buffer_capacity - playback_read_pos;
                size_t second_bytes = bytes_needed - first_bytes;
                size_t s1 = first_bytes  / sizeof(int16_t);
                size_t s2 = second_bytes / sizeof(int16_t);

                int16_t *src1 = (int16_t *)(playback_buffer + playback_read_pos);
                for (size_t i = 0; i < s1; i++) {
                    streaming_stereo_buffer[2 * i]     = src1[i];
                    streaming_stereo_buffer[2 * i + 1] = src1[i];
                }
                int16_t *src2 = (int16_t *)playback_buffer;
                for (size_t i = 0; i < s2; i++) {
                    streaming_stereo_buffer[2 * (s1 + i)]     = src2[i];
                    streaming_stereo_buffer[2 * (s1 + i) + 1] = src2[i];
                }
                playback_read_pos = second_bytes % playback_buffer_capacity;
            }

            xSemaphoreGive(playback_mutex);
        }
        else
        {
            ESP_LOGW(TAG, "Playback mutex timeout");
            vTaskDelay(pdMS_TO_TICKS(5));
            continue;
        }

        size_t bytes_to_write = samples_to_play * 2 * sizeof(int16_t);
        size_t written        = 0;

        esp_err_t ret = i2s_channel_write(tx_handle,
                                          streaming_stereo_buffer,
                                          bytes_to_write,
                                          &written,
                                          pdMS_TO_TICKS(200));
        if (ret != ESP_OK) {
            ESP_LOGE(TAG, "I2S write error: %s", esp_err_to_name(ret));
            break;
        }
        if (written < bytes_to_write) {
            ESP_LOGW(TAG, "Partial I2S write: %u/%u bytes", written, bytes_to_write);
        }
    }

    vTaskDelay(pdMS_TO_TICKS(100));

    gpio_set_level(LED_PIN, 0);
    ESP_LOGI(TAG, "Playback complete");

    xSemaphoreGive(ws_sem);

    playback_task_handle = NULL;
    vTaskDelete(NULL);
}

// ═════════════════════════════════════════════════════════════════════════════
// WebSocket event handler  (runs on Core 0)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @brief Handle all WebSocket lifecycle and data events.
 *
 * Text frames carry JSON control messages; binary frames carry Opus-encoded
 * audio packets that are decoded directly into the playback ring buffer.
 */
static void websocket_event_handler(void *handler_args, esp_event_base_t base,
                                    int32_t event_id, void *event_data)
{
    esp_websocket_event_data_t *data = (esp_websocket_event_data_t *)event_data;

    switch (event_id)
    {
    case WEBSOCKET_EVENT_CONNECTED:
        ESP_LOGI(TAG, "WebSocket connected");
        ws_connected = true;
        break;

    case WEBSOCKET_EVENT_DISCONNECTED:
        ESP_LOGI(TAG, "WebSocket disconnected");
        ws_connected       = false;
        audio_streaming    = false;
        is_streaming_audio = false;
        playback_complete  = true;
        reset_playback_buffer();
        xSemaphoreGive(ws_sem);
        break;

    case WEBSOCKET_EVENT_DATA:

        if (data->op_code == 0x01)
        {
            char *text = strndup((char *)data->data_ptr, data->data_len);
            if (!text) break;

            ESP_LOGI(TAG, "WS text: %s", text);

            cJSON *json = cJSON_Parse(text);
            if (json)
            {
                cJSON *type = cJSON_GetObjectItem(json, "type");
                cJSON *msg  = cJSON_GetObjectItem(json, "msg");

                if (type && cJSON_IsString(type))
                {
                    if (strcmp(type->valuestring, "server") == 0 &&
                        msg && cJSON_IsString(msg))
                    {
                        if (strcmp(msg->valuestring, "RESPONSE.CREATED") == 0)
                        {
                            audio_streaming = true;
                            reset_playback_buffer();
                            ESP_LOGI(TAG, "RESPONSE.CREATED — buffering audio");
                        }
                        else if (strcmp(msg->valuestring, "RESPONSE.COMPLETE") == 0)
                        {
                            audio_streaming   = false;
                            playback_complete = true;
                            ESP_LOGI(TAG, "RESPONSE.COMPLETE — launching playback "
                                     "(%u bytes buffered)",
                                     get_buffered_audio_size());

                            if (!playback_started)
                            {
                                playback_started = true;
                                xTaskCreatePinnedToCore(
                                    playback_task,
                                    "playback_task",
                                    8192,
                                    NULL,
                                    5,
                                    &playback_task_handle,
                                    CORE_PLAYBACK);
                            }
                        }
                    }
                    else if (strcmp(type->valuestring, "audio_start") == 0)
                    {
                        audio_streaming = true;
                        reset_playback_buffer();
                        ESP_LOGI(TAG, "audio_start — buffering");
                    }
                    else if (strcmp(type->valuestring, "audio_end") == 0)
                    {
                        audio_streaming   = false;
                        playback_complete = true;
                        ESP_LOGI(TAG, "audio_end — launching playback");

                        if (!playback_started)
                        {
                            playback_started = true;
                            xTaskCreatePinnedToCore(
                                playback_task,
                                "playback_task",
                                8192,
                                NULL,
                                5,
                                &playback_task_handle,
                                CORE_PLAYBACK);
                        }
                    }
                    else if (strcmp(type->valuestring, "transcript") == 0 && msg)
                    {
                        ESP_LOGI(TAG, "Transcript: %s", msg->valuestring);
                    }
                    else if (strcmp(type->valuestring, "response") == 0 && msg)
                    {
                        ESP_LOGI(TAG, "Response: %s", msg->valuestring);
                    }
                    else if (strcmp(type->valuestring, "error") == 0 && msg)
                    {
                        ESP_LOGE(TAG, "Server error: %s", msg->valuestring);
                        audio_streaming = false;
                        reset_playback_buffer();
                        xSemaphoreGive(ws_sem);
                    }
                }
                cJSON_Delete(json);
            }
            free(text);
        }

        else if (data->op_code == 0x02)
        {
            if (!audio_streaming) {
                ESP_LOGW(TAG, "Binary frame received but audio_streaming=false, ignoring");
                break;
            }

            if (data->data_len > 0 && opus_decoder && opus_decode_buffer)
            {
                int frame_size = opus_decode(
                    opus_decoder,
                    (const unsigned char *)data->data_ptr,
                    data->data_len,
                    opus_decode_buffer,
                    STREAMING_BUFFER_SAMPLES,
                    0);

                if (frame_size > 0)
                {
                    size_t bytes_decoded = frame_size * sizeof(int16_t);
                    size_t current_buf   = get_buffered_audio_size();
                    size_t free_space    = playback_buffer_capacity - current_buf - 1;

                    if (free_space < bytes_decoded) {
                        ESP_LOGW(TAG, "Ring buffer full — dropping %u decoded bytes",
                                 bytes_decoded);
                        break;
                    }

                    if (xSemaphoreTake(playback_mutex, pdMS_TO_TICKS(100)) == pdTRUE)
                    {
                        uint8_t *src = (uint8_t *)opus_decode_buffer;
                        for (size_t i = 0; i < bytes_decoded; i++) {
                            playback_buffer[playback_write_pos] = src[i];
                            playback_write_pos =
                                (playback_write_pos + 1) % playback_buffer_capacity;
                        }
                        xSemaphoreGive(playback_mutex);
                    }

                    ESP_LOGI(TAG, "Opus decode: %d bytes in → %u PCM bytes (buf: %u)",
                             data->data_len, bytes_decoded, get_buffered_audio_size());
                }
                else
                {
                    ESP_LOGE(TAG, "Opus decode failed: %d", frame_size);
                }
            }
        }
        break;

    case WEBSOCKET_EVENT_ERROR:
        ESP_LOGE(TAG, "WebSocket error");
        ws_connected       = false;
        audio_streaming    = false;
        is_streaming_audio = false;
        playback_complete  = true;
        reset_playback_buffer();
        xSemaphoreGive(ws_sem);
        break;
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// WebSocket init
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @brief Initialise the WebSocket client and block until connected (or timeout).
 *
 * Also allocates the DMA-aligned stereo interleave buffer used by playback_task.
 */
void websocket_init(void)
{
    ws_sem = xSemaphoreCreateBinary();

    streaming_stereo_buffer = (int16_t *)heap_caps_malloc(
        MAX_PLAYBACK_CHUNK_SAMPLES * 2 * sizeof(int16_t),
        MALLOC_CAP_DMA | MALLOC_CAP_INTERNAL);

    if (!streaming_stereo_buffer) {
        ESP_LOGE(TAG, "Failed to allocate stereo buffer");
        return;
    }

    esp_websocket_client_config_t ws_cfg = {
        .uri                  = SERVER_WS_URL,
        .reconnect_timeout_ms = 5000,
        .network_timeout_ms   = 10000,
        .buffer_size          = 32768,
        .task_stack           = 16384,
    };

    ws_client = esp_websocket_client_init(&ws_cfg);
    esp_websocket_register_events(ws_client, WEBSOCKET_EVENT_ANY,
                                  websocket_event_handler, NULL);
    esp_websocket_client_start(ws_client);

    int retry = 0;
    while (!ws_connected && retry < 10) {
        vTaskDelay(pdMS_TO_TICKS(500));
        retry++;
    }

    if (ws_connected)
        ESP_LOGI(TAG, "WebSocket initialised");
    else
        ESP_LOGE(TAG, "WebSocket connection failed after retries");
}

// ═════════════════════════════════════════════════════════════════════════════
// Send helpers
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @brief Resample a PCM chunk from 16 kHz to 24 kHz and send it as a binary
 *        WebSocket frame.
 */
static esp_err_t send_audio_chunk_websocket(int16_t *audio_data,
                                             size_t sample_count)
{
    if (!ws_connected || !is_streaming_audio)
        return ESP_FAIL;

    size_t resampled_count = resample_16k_to_24k(audio_data, sample_count,
                                                   resample_buffer);
    size_t bytes_to_send   = resampled_count * sizeof(int16_t);

    if (esp_websocket_client_send_bin(ws_client, (char *)resample_buffer,
                                      bytes_to_send, pdMS_TO_TICKS(1000)) < 0) {
        ESP_LOGE(TAG, "Failed to send audio chunk");
        return ESP_FAIL;
    }
    return ESP_OK;
}

/**
 * @brief Send a JSON @c end_of_speech instruction to the server, signalling
 *        that the user has finished speaking.
 */
static esp_err_t send_end_of_speech(void)
{
    cJSON *json = cJSON_CreateObject();
    cJSON_AddStringToObject(json, "type", "instruction");
    cJSON_AddStringToObject(json, "msg",  "end_of_speech");

    char *json_str = cJSON_PrintUnformatted(json);
    cJSON_Delete(json);

    if (!json_str)
        return ESP_FAIL;

    ESP_LOGI(TAG, "Sending end_of_speech");
    int ret = esp_websocket_client_send_text(ws_client, json_str,
                                              strlen(json_str),
                                              pdMS_TO_TICKS(1000));
    free(json_str);
    return (ret >= 0) ? ESP_OK : ESP_FAIL;
}

// ═════════════════════════════════════════════════════════════════════════════
// process_query
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @brief Record a full utterance, stream it to the server, and wait for
 *        playback to complete.
 *
 * VAD drives the recording loop: recording stops on SILENCE_DURATION_MS of
 * post-speech silence, NO_SPEECH_TIMEOUT_MS of no speech at all, or
 * MAX_RECORDING_SECONDS absolute cap.
 *
 * @param buffer         Shared I2S read buffer (WakeNet chunk size).
 * @param audio_chunksize Size of @p buffer in bytes.
 * @param sample_count   Number of int16_t samples in @p buffer.
 */
void process_query(int16_t *buffer, int audio_chunksize, int sample_count)
{
    if (!ws_connected) {
        ESP_LOGW(TAG, "WS not connected, waiting…");
        for (int r = 0; r < 20 && !ws_connected; r++)
            vTaskDelay(pdMS_TO_TICKS(500));
        if (!ws_connected) {
            ESP_LOGE(TAG, "Still not connected — aborting query");
            return;
        }
    }

    playback_complete = false;
    audio_streaming   = false;
    reset_playback_buffer();

    ESP_LOGI(TAG, "Recording started");
    gpio_set_level(LED_PIN, 1);
    start_streaming();

    int64_t recording_start  = esp_timer_get_time();
    int64_t silence_start    = 0;
    bool    speech_detected  = false;
    bool    in_silence       = false;
    int     chunks_recorded  = 0;
    float   speech_threshold = SILENCE_THRESHOLD * SPEECH_ENERGY_MULTIPLIER;

    while (1)
    {
        if (!ws_connected) {
            ESP_LOGW(TAG, "WS disconnected during recording");
            break;
        }

        size_t bytes_read = 0;
        i2s_channel_read(rx_handle, buffer, audio_chunksize,
                         &bytes_read, portMAX_DELAY);

        for (int i = 0; i < sample_count; i++) {
            int32_t s = (int32_t)buffer[i] * GAIN_BOOSTER;
            if (s >  32767) s =  32767;
            if (s < -32768) s = -32768;
            buffer[i] = (int16_t)s;
        }

        float energy = calculate_audio_energy(buffer, sample_count);
        chunks_recorded++;

        send_audio_chunk_websocket(buffer, sample_count);

        if (!speech_detected) {
            int64_t elapsed_ms = (esp_timer_get_time() - recording_start) / 1000;
            if (elapsed_ms >= NO_SPEECH_TIMEOUT_MS) {
                ESP_LOGW(TAG, "No speech — timeout");
                stop_streaming();
                gpio_set_level(LED_PIN, 0);
                return;
            }
        }

        if (!speech_detected && energy > speech_threshold) {
            ESP_LOGI(TAG, "Speech started (energy=%.1f)", energy);
            speech_detected = true;
            in_silence      = false;
        }

        if (speech_detected) {
            if (energy < SILENCE_THRESHOLD) {
                if (!in_silence) {
                    silence_start = esp_timer_get_time();
                    in_silence    = true;
                } else {
                    int64_t sil_ms = (esp_timer_get_time() - silence_start) / 1000;
                    if (sil_ms >= SILENCE_DURATION_MS) {
                        ESP_LOGI(TAG, "Silence detected — ending recording");
                        break;
                    }
                }
            } else {
                in_silence = false;
            }

            if (chunks_recorded > MAX_RECORDING_SECONDS *
                                  (SERVER_SAMPLE_RATE / sample_count)) {
                ESP_LOGW(TAG, "Max recording duration reached");
                break;
            }
        }

        vTaskDelay(pdMS_TO_TICKS(1));
    }

    stop_streaming();
    gpio_set_level(LED_PIN, 0);

    if (!speech_detected || !ws_connected) {
        if (!speech_detected)
            ESP_LOGW(TAG, "No speech detected in recording");
        return;
    }

    send_end_of_speech();

    if (xSemaphoreTake(ws_sem, pdMS_TO_TICKS(120000)) != pdTRUE) {
        ESP_LOGW(TAG, "Response/playback timeout");
        audio_streaming  = false;
        playback_complete = true;

        if (playback_task_handle) {
            vTaskDelete(playback_task_handle);
            playback_task_handle = NULL;
        }
    }

    vTaskDelay(pdMS_TO_TICKS(100));
}

// ═════════════════════════════════════════════════════════════════════════════
// Calibration
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @brief Measure ambient noise to set an adaptive silence threshold.
 *
 * Reads CALIBRATION_SAMPLES frames from the mic, computes their average RMS
 * energy, and clamps the resulting threshold to [150, 1500].
 */
void calibrate_silence_threshold(int16_t *buffer, int audio_chunksize,
                                  int sample_count)
{
    ESP_LOGI(TAG, "Calibrating ambient noise level…");
    float total_energy = 0.0f;

    for (int i = 0; i < CALIBRATION_SAMPLES; i++) {
        size_t bytes_read = 0;
        i2s_channel_read(rx_handle, buffer, audio_chunksize,
                         &bytes_read, portMAX_DELAY);
        total_energy += calculate_audio_energy(buffer, sample_count);
    }

    float avg_ambient = total_energy / CALIBRATION_SAMPLES;
    SILENCE_THRESHOLD = avg_ambient * SILENCE_MULTIPLIER;

    if (SILENCE_THRESHOLD < 150.0f)  SILENCE_THRESHOLD = 150.0f;
    if (SILENCE_THRESHOLD > 1500.0f) SILENCE_THRESHOLD = 1500.0f;

    ESP_LOGI(TAG, "Calibration done — silence=%.0f  speech=%.0f",
             SILENCE_THRESHOLD, SILENCE_THRESHOLD * SPEECH_ENERGY_MULTIPLIER);
}

// ═════════════════════════════════════════════════════════════════════════════
// Utility
// ═════════════════════════════════════════════════════════════════════════════

/** @brief Blink the status LED @p n times (200 ms on / 200 ms off). */
void blink(int n)
{
    for (int i = 0; i < n; i++) {
        gpio_set_level(LED_PIN, 1);
        vTaskDelay(pdMS_TO_TICKS(200));
        gpio_set_level(LED_PIN, 0);
        vTaskDelay(pdMS_TO_TICKS(200));
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Wake-word task  (pinned to Core 0)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @brief Continuously listen for the wake word and dispatch process_query().
 *
 * Runs on Core 0 alongside the WiFi driver and WebSocket client task.
 */
static void wake_word_task(void *arg)
{
    srmodel_list_t *models = esp_srmodel_init("model");
    esp_wn_iface_t *wakenet =
        (esp_wn_iface_t *)esp_wn_handle_from_name(
            esp_srmodel_filter(models, ESP_WN_PREFIX, NULL));

    model_iface_data_t *model_data =
        wakenet->create(esp_srmodel_filter(models, ESP_WN_PREFIX, NULL),
                        DET_MODE_95);
    if (!model_data) {
        ESP_LOGE(TAG, "Failed to create WakeNet model");
        vTaskDelete(NULL);
        return;
    }

    ESP_LOGI(TAG, "WakeNet ready  sample_rate=%d  chunk=%d  core=%d",
             wakenet->get_samp_rate(model_data),
             wakenet->get_samp_chunksize(model_data),
             xPortGetCoreID());

    int      audio_chunksize = wakenet->get_samp_chunksize(model_data) * sizeof(int16_t);
    int16_t *buffer          = (int16_t *)malloc(audio_chunksize);
    int      sample_count    = audio_chunksize / sizeof(int16_t);

    calibrate_silence_threshold(buffer, audio_chunksize, sample_count);

    ESP_LOGI(TAG, "Listening for wake word…");

    while (1)
    {
        size_t bytes_read = 0;
        i2s_channel_read(rx_handle, buffer, audio_chunksize,
                         &bytes_read, portMAX_DELAY);

        wakenet_state_t state = wakenet->detect(model_data, buffer);
        if (state == WAKENET_DETECTED) {
            blink(1);
            ESP_LOGI(TAG, "Wake word detected!");
            process_query(buffer, audio_chunksize, sample_count);
            ESP_LOGI(TAG, "Listening for wake word…");
        }
    }

    wakenet->destroy(model_data);
    free(buffer);
    vTaskDelete(NULL);
}

// ═════════════════════════════════════════════════════════════════════════════
// app_main
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @brief One-time hardware/software init; launches wake_word_task on Core 0
 *        then deletes itself.
 */
void app_main(void)
{
    led_init();
    wifi_init();
    i2s_mic_init();
    i2s_speaker_init();
    init_recording_buffer();
    websocket_init();

    xTaskCreatePinnedToCore(
        wake_word_task,
        "wake_word_task",
        8192,
        NULL,
        4,
        NULL,
        CORE_NETWORK);

    vTaskDelete(NULL);

    if (opus_decoder)       opus_decoder_destroy(opus_decoder);
    if (opus_decode_buffer) free(opus_decode_buffer);
    if (resample_buffer)    free(resample_buffer);
}