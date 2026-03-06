"""
AashaAI: Mental Health Voice Bot — WebSocket server
==========================================
Protocol (matches ESP32 firmware):

  ESP32  → server : binary  — raw PCM chunks (16-bit, 24 kHz, mono) during speech
  ESP32  → server : text    — {"type":"instruction","msg":"end_of_speech"}
  server → ESP32  : text    — {"type":"server",     "msg":"RESPONSE.CREATED"}
  server → ESP32  : text    — {"type":"transcript", "msg":"<text>"}
  server → ESP32  : text    — {"type":"response",   "msg":"<text>"}
  server → ESP32  : binary  — Opus-encoded audio packets (one packet per frame)
  server → ESP32  : text    — {"type":"server",     "msg":"RESPONSE.COMPLETE"}
  server → ESP32  : text    — {"type":"error",      "msg":"<reason>"}  (on error)

KEY FIX — real-time Opus pacing:
  Previously all TTS audio was generated then blasted in a tight loop with only
  asyncio.sleep(0) between packets.  This caused the ESP32 ring buffer to flood
  immediately then starve once the burst was over, producing repeated underruns.

  Now each Opus packet is sent with a delay of FRAME_PACING_S (≈ 16 ms) so the
  ESP32 receives audio at roughly the same rate it consumes it.  The result is a
  smooth, continuously-filled ring buffer and zero underruns under normal WiFi.
"""

import io
import json
import logging
import os
import time
import wave
from contextlib import asynccontextmanager
from datetime import datetime

import asyncio
import httpx
import numpy as np
import opuslib
import soundfile as sf
import torch
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse
from faster_whisper import WhisperModel

from google import genai
from google.genai import types

load_dotenv()

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY")

SERVER_SAMPLE_RATE = 24000   # ESP32 resamples mic to 24 kHz before sending
OPUS_FRAME_MS      = 20      # 20 ms Opus frames → 480 samples @ 24 kHz
OPUS_FRAME_SAMPLES = SERVER_SAMPLE_RATE * OPUS_FRAME_MS // 1000  # 480

# ─── FIX: Real-time pacing ────────────────────────────────────────────────────
# Send each Opus packet with a slight lead over real-time so the ESP32 ring
# buffer is kept comfortably ahead of playback without ever being flooded.
#
# FRAME_PACING_FACTOR < 1.0  →  send slightly faster than real-time.
# 0.90 = 90% of frame duration = 18 ms per packet.  Compared to the previous
# 0.80 (16 ms), this gives the ESP32 a larger cushion on lossy WiFi where a
# single retransmit stall can otherwise drain the ring buffer mid-utterance.
#
# Why not asyncio.sleep(0)? That effectively sends all packets as fast as TCP
# allows — flooding the ESP32 ring buffer then leaving it starved.
#
# Why deadline-based and not per-packet sleep?
# asyncio.sleep has ~15.6 ms granularity on Windows.  Sleeping 18 ms per
# packet often sleeps 30+ ms instead, and that error ACCUMULATES across the
# entire stream.  A 50-packet response drifts by up to 25 *extra* seconds on
# Windows.  We instead track the stream start time and compute the remaining
# sleep to the *absolute* deadline — so errors average out rather than stack.
FRAME_DURATION_S   = OPUS_FRAME_MS / 1000.0          # 0.020 s
FRAME_PACING_FACTOR = 0.90                            # 90% of real-time
FRAME_PACING_S      = FRAME_DURATION_S * FRAME_PACING_FACTOR  # 0.018 s

# ─── System prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a warm, empathetic voice companion for college students going
through stress, anxiety, burnout, or difficult emotional times.

Listen carefully and respond with genuine care. Keep responses under 60 words —
short enough for voice, but substantive enough that the student feels truly heard.

Match the emotional tone of the student:
  - If they sound distressed or overwhelmed, be calm, grounding, and validating.
  - If they need practical guidance, be clear, structured, and encouraging.
  - If they just need to vent, listen and reflect without jumping to solutions.

Never dismiss or minimize feelings. Never provide clinical diagnoses or replace
professional mental health care.

If someone expresses thoughts of self-harm or suicide, respond with warmth, take
them seriously, and clearly but gently encourage them to contact their campus
counseling center or call/text 988 (Suicide and Crisis Lifeline).

Do not output any emojis, asterisks, or characters that are not standard English.
Speak naturally, as you would in a real caring conversation.
Always respond in English."""

TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

# ─── Model globals ────────────────────────────────────────────────────────────
whisper_model: WhisperModel = None
silero_model               = None
silero_sample_rate: int    = SERVER_SAMPLE_RATE


# ─────────────────────────────────────────────────────────────────────────────
# Model loading
# ─────────────────────────────────────────────────────────────────────────────
def load_whisper() -> WhisperModel:
    logger.info("Loading Faster-Whisper model…")
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    logger.info("Faster-Whisper loaded.")
    return model


def load_silero():
    logger.info("Loading Silero TTS model…")
    model, _ = torch.hub.load(
        repo_or_dir="snakers4/silero-models",
        model="silero_tts",
        language="en",
        speaker="v3_en",
        trust_repo=True,
    )
    logger.info("Silero TTS loaded.")
    return model, SERVER_SAMPLE_RATE


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global whisper_model, silero_model, silero_sample_rate

    loop = asyncio.get_event_loop()
    whisper_model                    = await loop.run_in_executor(None, load_whisper)
    silero_model, silero_sample_rate = await loop.run_in_executor(None, load_silero)

    app.state.http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(60.0, connect=10.0),
        limits=httpx.Limits(max_connections=50, max_keepalive_connections=10),
    )
    logger.info("Startup complete.")
    yield
    await app.state.http_client.aclose()
    logger.info("Shutdown: HTTP client closed.")


# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Mental Health Voice Bot API",
    version="3.1.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Audio helpers
# ─────────────────────────────────────────────────────────────────────────────
def save_audio_to_temp(
    audio_bytes: bytes,
    source: str = "ws",
    sample_rate: int = SERVER_SAMPLE_RATE,
    channels: int = 1,
    sampwidth: int = 2,
) -> str:
    """Persist received PCM audio as WAV in temp/ for debugging."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename  = f"{source}_{timestamp}.wav"
    filepath  = os.path.join(TEMP_DIR, filename)

    is_wav = audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE"
    if is_wav:
        with open(filepath, "wb") as f:
            f.write(audio_bytes)
    else:
        with wave.open(filepath, "wb") as wf:
            wf.setnchannels(channels)
            wf.setsampwidth(sampwidth)
            wf.setframerate(sample_rate)
            wf.writeframes(audio_bytes)

    logger.info("Saved mic audio → %s  (%d bytes, raw_wav=%s)",
                filepath, len(audio_bytes), is_wav)
    return filepath


# ─────────────────────────────────────────────────────────────────────────────
# STT — Faster-Whisper
# ─────────────────────────────────────────────────────────────────────────────
def _run_whisper(audio_bytes: bytes) -> str:
    """Decode raw 24 kHz PCM bytes (or a WAV blob) and transcribe."""
    try:
        is_wav = audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE"
        if is_wav:
            buf = io.BytesIO(audio_bytes)
        else:
            wav_buf = io.BytesIO()
            with wave.open(wav_buf, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(SERVER_SAMPLE_RATE)
                wf.writeframes(audio_bytes)
            wav_buf.seek(0)
            buf = wav_buf

        audio_np, _ = sf.read(buf, dtype="float32")
        if audio_np.ndim > 1:
            audio_np = audio_np.mean(axis=1)

        segments, info = whisper_model.transcribe(
            audio_np,
            beam_size=5,
            language="en",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=300),
        )
        text = " ".join(seg.text for seg in segments).strip()
        logger.info("Whisper | lang=%s | %s", info.language, text[:80])
        return text
    except Exception as exc:
        logger.error("Whisper STT error: %s", exc)
        return ""


async def stt_faster_whisper(audio_bytes: bytes) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run_whisper, audio_bytes)


# ─────────────────────────────────────────────────────────────────────────────
# LLM — Gemini
# ─────────────────────────────────────────────────────────────────────────────
_gemini_client = genai.Client()

async def chat_gemini(prompt: str, _unused_client=None) -> str:
    """Call Gemini 2.5 Flash via the google-genai SDK with async + retry."""
    for attempt in range(3):
        try:
            response = await _gemini_client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=120,
                    temperature=0.6,
                ),
            )
            reply = response.text.strip()
            reply = reply.encode("ascii", "ignore").decode("ascii")
            logger.info("Gemini reply: %s", reply[:80])
            return reply

        except Exception as exc:
            if attempt < 2 and ("503" in str(exc) or "UNAVAILABLE" in str(exc)
                                 or "exhausted" in str(exc).lower()):
                wait = 2 ** attempt
                logger.warning("Gemini error (attempt %d), retrying in %ds: %s",
                               attempt + 1, wait, exc)
                await asyncio.sleep(wait)
                continue
            logger.error("Gemini LLM error: %s", exc)
            return "Sorry, something went wrong."

    return "Sorry, I couldn't understand that."


# ─────────────────────────────────────────────────────────────────────────────
# TTS — Silero  (returns raw PCM bytes, 16-bit, 24 kHz, mono)
# ─────────────────────────────────────────────────────────────────────────────
def _run_silero_tts(text: str) -> bytes:
    """Synthesise speech with Silero TTS. Returns raw 16-bit PCM bytes."""
    try:
        with torch.no_grad():
            audio_tensor = silero_model.apply_tts(
                text=text,
                speaker="en_0",
                sample_rate=silero_sample_rate,
            )
        audio_np   = audio_tensor.numpy()
        audio_i16  = (audio_np * 32767).clip(-32768, 32767).astype(np.int16)
        pcm_bytes  = audio_i16.tobytes()

        # Debug WAV
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        wav_path  = os.path.join(TEMP_DIR, f"tts_{timestamp}.wav")
        with wave.open(wav_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(silero_sample_rate)
            wf.writeframes(pcm_bytes)
        logger.info("TTS WAV → %s  (%d PCM bytes)", wav_path, len(pcm_bytes))
        return pcm_bytes
    except Exception as exc:
        logger.error("Silero TTS error: %s", exc)
        return b""


# ─────────────────────────────────────────────────────────────────────────────
# Opus encoder helper
# ─────────────────────────────────────────────────────────────────────────────
def encode_pcm_to_opus(pcm_bytes: bytes) -> list[bytes]:
    """
    Encode raw 16-bit mono 24 kHz PCM into a list of Opus packets.
    Each packet covers OPUS_FRAME_MS ms (480 samples at 24 kHz).
    """
    encoder = opuslib.Encoder(
        SERVER_SAMPLE_RATE, 1, opuslib.APPLICATION_VOIP
    )
    samples = np.frombuffer(pcm_bytes, dtype=np.int16)
    packets: list[bytes] = []

    for offset in range(0, len(samples) - OPUS_FRAME_SAMPLES + 1,
                        OPUS_FRAME_SAMPLES):
        frame  = samples[offset : offset + OPUS_FRAME_SAMPLES].tobytes()
        packet = encoder.encode(frame, OPUS_FRAME_SAMPLES)
        packets.append(packet)

    logger.info("Opus: %d PCM bytes → %d packets", len(pcm_bytes), len(packets))
    return packets


# ─────────────────────────────────────────────────────────────────────────────
# Shared pipeline: STT → LLM
# Returns (transcript, reply, saved_path)
# ─────────────────────────────────────────────────────────────────────────────
async def run_pipeline(
    audio_bytes: bytes,
    client: httpx.AsyncClient,
    source: str = "ws",
) -> tuple[str, str, str]:
    loop       = asyncio.get_event_loop()
    saved_path = await loop.run_in_executor(
        None, save_audio_to_temp, audio_bytes, source
    )

    transcript = await stt_faster_whisper(audio_bytes)
    if not transcript:
        raise ValueError("NO_SPEECH")

    reply = await chat_gemini(transcript, client)
    return transcript, reply, saved_path


# ─────────────────────────────────────────────────────────────────────────────
# Helpers: send typed JSON frames
# ─────────────────────────────────────────────────────────────────────────────
async def ws_send_json(ws: WebSocket, **kwargs) -> None:
    await ws.send_text(json.dumps(kwargs))


# ─────────────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "3.1.0"}


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket endpoint — primary ESP32 interface
# ─────────────────────────────────────────────────────────────────────────────
@app.websocket("/")
async def websocket_chat(websocket: WebSocket):
    """
    Streaming protocol:
      1. ESP32 streams binary PCM chunks while the user speaks.
      2. ESP32 sends {"type":"instruction","msg":"end_of_speech"}.
      3. Server sends RESPONSE.CREATED, runs STT+LLM+TTS, streams Opus binary
         packets back with real-time pacing, then sends RESPONSE.COMPLETE.
      4. Steps 1–3 repeat for subsequent utterances.
    """
    await websocket.accept()
    client_host = websocket.client.host
    logger.info("WebSocket connected: %s", client_host)

    audio_chunks: list[bytes] = []

    try:
        while True:
            message = await websocket.receive()

            # ── Incoming binary: raw PCM audio chunk ─────────────────────────
            if "bytes" in message and message["bytes"]:
                audio_chunks.append(message["bytes"])
                continue

            # ── Incoming text: JSON control message ──────────────────────────
            if "text" not in message or not message["text"]:
                continue

            try:
                data = json.loads(message["text"])
            except json.JSONDecodeError:
                logger.warning("Non-JSON text frame: %s", message["text"][:80])
                continue

            msg_type = data.get("type", "")
            msg_body = data.get("msg", "")

            # ── end_of_speech ─────────────────────────────────────────────────
            if msg_type == "instruction" and msg_body == "end_of_speech":
                if not audio_chunks:
                    logger.warning("end_of_speech with no audio buffered")
                    await ws_send_json(websocket,
                                       type="error", msg="no audio received")
                    continue

                audio_bytes  = b"".join(audio_chunks)
                audio_chunks = []
                logger.info("end_of_speech: %d PCM bytes accumulated",
                            len(audio_bytes))

                await ws_send_json(websocket, type="server",
                                   msg="RESPONSE.CREATED")

                # ── STT + LLM ─────────────────────────────────────────────────
                client = app.state.http_client
                try:
                    transcript, reply, saved_path = await run_pipeline(
                        audio_bytes, client, source="ws"
                    )
                except ValueError as ve:
                    logger.warning("Pipeline error: %s", ve)
                    await ws_send_json(websocket, type="error", msg=str(ve))
                    await ws_send_json(websocket, type="server",
                                       msg="RESPONSE.COMPLETE")
                    continue

                logger.info("Audio saved: %s", saved_path)

                await ws_send_json(websocket, type="transcript", msg=transcript)
                await ws_send_json(websocket, type="response",   msg=reply)

                # ── TTS → Opus → binary frames with real-time pacing ──────────
                #
                # FIX: The original code used asyncio.sleep(0) which effectively
                # sent all packets as fast as TCP could carry them — flooding the
                # ESP32 ring buffer immediately and then leaving it starved for
                # the remainder of playback (causing repeated underruns).
                #
                # We now pace each packet at FRAME_PACING_S (≈ 16 ms, 80% of
                # the 20 ms frame duration).  This keeps the ESP32 ring buffer
                # filled at roughly the same rate as consumption, giving it a
                # small but stable lead cushion without any risk of overflow.
                #
                # FRAME_PACING_FACTOR = 0.80 means we stay ~20% ahead of the
                # playback clock — enough to absorb WiFi jitter without building
                # up enough surplus to overflow the ring buffer.
                loop      = asyncio.get_event_loop()
                pcm_bytes = await loop.run_in_executor(
                    None, _run_silero_tts, reply
                )

                if pcm_bytes:
                    opus_packets = await loop.run_in_executor(
                        None, encode_pcm_to_opus, pcm_bytes
                    )
                    total = len(opus_packets)
                    logger.info(
                        "Streaming %d Opus packets at %.0f ms/pkt pacing "
                        "(%.0f%% real-time)",
                        total,
                        FRAME_PACING_S * 1000,
                        FRAME_PACING_FACTOR * 100,
                    )
                    # Deadline-based pacing: instead of sleeping FRAME_PACING_S
                    # per packet (which accumulates timer granularity errors,
                    # especially on Windows where asyncio.sleep has ~15 ms
                    # resolution), we track the stream start time and sleep only
                    # the remaining time to the absolute per-packet deadline.
                    stream_start = time.monotonic()
                    for idx, packet in enumerate(opus_packets):
                        await websocket.send_bytes(packet)
                        deadline = stream_start + (idx + 1) * FRAME_PACING_S
                        remaining = deadline - time.monotonic()
                        if remaining > 0:
                            await asyncio.sleep(remaining)
                    logger.info("All %d Opus packets sent", total)
                else:
                    logger.error("TTS returned empty audio")

                await ws_send_json(websocket, type="server",
                                   msg="RESPONSE.COMPLETE")
                logger.info("Pipeline complete for %s", client_host)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", client_host)
    except Exception as exc:
        logger.error("WebSocket error for %s: %s", client_host, exc)
        try:
            await ws_send_json(websocket, type="error", msg=str(exc))
            await websocket.close()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# HTTP POST — fallback / testing endpoint
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/chat")
async def http_chat(request: Request):
    """
    Accept a raw PCM body (same format as WebSocket), run the full pipeline,
    and stream back:  header text  +  "---AUDIO---\\n"  +  raw PCM bytes.
    """
    try:
        audio_data = await request.body()
        if not audio_data:
            return Response(content=b"ERROR:NO_AUDIO", status_code=400)

        logger.info("HTTP audio: %d bytes", len(audio_data))
        client = app.state.http_client

        try:
            transcript, reply, saved_path = await run_pipeline(
                audio_data, client, source="http"
            )
        except ValueError as ve:
            return Response(content=f"ERROR:{ve}".encode(), status_code=400)

        logger.info("HTTP audio saved: %s", saved_path)

        loop      = asyncio.get_event_loop()
        pcm_bytes = await loop.run_in_executor(None, _run_silero_tts, reply)

        async def response_generator():
            yield f"TRANSCRIPT:{transcript}\nREPLY:{reply}\n---AUDIO---\n".encode()
            chunk_size = 4096
            for i in range(0, len(pcm_bytes), chunk_size):
                yield pcm_bytes[i : i + chunk_size]
                await asyncio.sleep(0)

        return StreamingResponse(
            response_generator(),
            media_type="application/octet-stream",
            headers={
                "X-Transcript":       transcript[:200],
                "X-Reply":            reply[:200],
                "X-Audio-SampleRate": str(silero_sample_rate),
                "X-Audio-Channels":   "1",
                "X-Audio-BitDepth":   "16",
                "X-Saved-File":       os.path.basename(saved_path),
                "Cache-Control":      "no-cache",
            },
        )
    except Exception as exc:
        logger.error("HTTP chat error: %s", exc)
        return Response(content=f"ERROR:{exc}".encode(), status_code=500)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        workers=1,
        log_level="info",
        access_log=True,
        reload=False,
    )