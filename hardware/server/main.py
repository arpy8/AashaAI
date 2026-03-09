"""
AashaAI hardware server — WebSocket voice pipeline.

Protocol (ESP32 ↔ server):
  ESP32  → server : binary  — raw PCM chunks (16-bit, 24 kHz, mono)
  ESP32  → server : text    — {"type":"instruction","msg":"end_of_speech"}
  server → ESP32  : text    — {"type":"server",     "msg":"RESPONSE.CREATED"}
  server → ESP32  : text    — {"type":"transcript", "msg":"<text>"}
  server → ESP32  : text    — {"type":"response",   "msg":"<text>"}
  server → ESP32  : binary  — Opus-encoded audio packets (one per frame)
  server → ESP32  : text    — {"type":"server",     "msg":"RESPONSE.COMPLETE"}
  server → ESP32  : text    — {"type":"error",      "msg":"<reason>"}
"""

import asyncio
import io
import json
import logging
import os
import time
import wave
from contextlib import asynccontextmanager
from datetime import datetime

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

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("aasha")

def _sep(title: str = "", width: int = 60) -> str:
    """Return a titled separator line for log readability."""
    if title:
        pad = width - len(title) - 4
        return f"{'─' * 2} {title} {'─' * max(pad, 2)}"
    return "─" * width

# ─── Config ───────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY")

SERVER_SAMPLE_RATE = 24000
OPUS_FRAME_MS      = 20
OPUS_FRAME_SAMPLES = SERVER_SAMPLE_RATE * OPUS_FRAME_MS // 1000  # 480

# Deadline-based Opus pacing: each packet is sent at 90% of its real-time
# deadline.  Tracking absolute deadlines (rather than sleeping per-packet)
# prevents timer-granularity errors from accumulating across a long stream.
FRAME_DURATION_S    = OPUS_FRAME_MS / 1000.0
FRAME_PACING_FACTOR = 0.90
FRAME_PACING_S      = FRAME_DURATION_S * FRAME_PACING_FACTOR

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


# ─── Model loading ────────────────────────────────────────────────────────────

def load_whisper() -> WhisperModel:
    """Load the Faster-Whisper base.en model on CPU with int8 quantisation."""
    logger.info("Loading Faster-Whisper model…")
    model = WhisperModel("medium.en", device="cpu", compute_type="int8")
    logger.info("Faster-Whisper loaded.")
    return model


def load_silero():
    """Load the Silero v3 English TTS model from torch.hub."""
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


# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models and create shared HTTP client on startup; clean up on shutdown."""
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


# ─── App ──────────────────────────────────────────────────────────────────────

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


# ─── Audio helpers ────────────────────────────────────────────────────────────

def save_audio_to_temp(
    audio_bytes: bytes,
    source: str = "ws",
    sample_rate: int = SERVER_SAMPLE_RATE,
    channels: int = 1,
    sampwidth: int = 2,
) -> str:
    """Persist received PCM audio as a WAV file in temp/ for debugging."""
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

    duration_s = len(audio_bytes) / (sample_rate * sampwidth * channels)
    logger.info(
        "  mic audio saved  path=%-40s  size=%d B  duration=%.2f s  wav=%s",
        os.path.basename(filepath), len(audio_bytes), duration_s, is_wav,
    )
    return filepath


# ─── STT — Faster-Whisper ─────────────────────────────────────────────────────

def _run_whisper(audio_bytes: bytes) -> str:
    """Transcribe raw 24 kHz PCM bytes (or a WAV blob) using Faster-Whisper."""
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
        segments_list = list(segments)
        text = " ".join(seg.text for seg in segments_list).strip()
        logger.info(
            "  STT done  lang=%s  prob=%.2f  segments=%d  text=%r",
            info.language, info.language_probability,
            len(segments_list), text[:120],
        )
        return text
    except Exception as exc:
        logger.error("  STT error: %s", exc)
        return ""


async def stt_faster_whisper(audio_bytes: bytes) -> str:
    """Async wrapper that offloads Whisper inference to a thread executor."""
    logger.info("  STT start  input=%d B  (%.2f s audio)",
                len(audio_bytes), len(audio_bytes) / (SERVER_SAMPLE_RATE * 2))
    t0 = time.monotonic()
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _run_whisper, audio_bytes)
    logger.info("  STT took %.2f s", time.monotonic() - t0)
    return result


# ─── LLM — Gemini ─────────────────────────────────────────────────────────────

_gemini_client = genai.Client()


def _sanitize_for_tts(text: str) -> str:
    """
    Prepare a Gemini reply for Silero TTS.

    Silero expects plain ASCII-range text.  The previous approach used
    encode("ascii", "ignore") which silently *drops* non-ASCII bytes,
    mangling or truncating sentences whenever Gemini emits an em-dash,
    smart quote, ellipsis, or similar typographic character.

    This function instead *transliterates* common Unicode punctuation to
    their plain-ASCII equivalents so the full sentence survives intact,
    then strips any remaining non-ASCII characters that have no reasonable
    ASCII stand-in.
    """
    replacements = {
        "\u2019": "'",    # right single quotation mark -> apostrophe
        "\u2018": "'",    # left  single quotation mark -> apostrophe
        "\u201c": '"',   # left  double quotation mark -> straight quote
        "\u201d": '"',   # right double quotation mark -> straight quote
        "\u2014": " - ",  # em dash                     -> spaced hyphen
        "\u2013": " - ",  # en dash                     -> spaced hyphen
        "\u2026": "...",  # horizontal ellipsis          -> three dots
        "\u00e9": "e",    # e-acute (cafe, resume, etc.)
        "\u00e8": "e",
        "\u00ea": "e",
        "\u00e0": "a",
        "\u00e2": "a",
        "\u00f4": "o",
        "\u00fb": "u",
        "\u00e7": "c",
        "\u00f1": "n",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    # Drop anything still outside printable ASCII
    text = text.encode("ascii", "ignore").decode("ascii")
    return text.strip()


async def chat_gemini(prompt: str, _unused_client=None) -> str:
    """Call Gemini 2.5 Flash with automatic retry on transient server errors."""
    for attempt in range(3):
        try:
            response = await _gemini_client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=200,   # raised: 120 was cutting replies mid-sentence
                    temperature=0.6,
                ),
            )
            reply = _sanitize_for_tts(response.text)
            word_count = len(reply.split())
            logger.info(
                "  LLM done  words=%d  chars=%d  reply=%r",
                word_count, len(reply), reply[:120],
            )
            return reply

        except Exception as exc:
            if attempt < 2 and ("503" in str(exc) or "UNAVAILABLE" in str(exc)
                                 or "exhausted" in str(exc).lower()):
                wait = 2 ** attempt
                logger.warning("Gemini error (attempt %d), retrying in %ds: %s",
                               attempt + 1, wait, exc)
                await asyncio.sleep(wait)
                continue
            logger.error("  LLM error (attempt %d): %s", attempt + 1, exc)
            return "Sorry, something went wrong."

    return "Sorry, I couldn't understand that."


# ─── TTS — Silero ─────────────────────────────────────────────────────────────

def _run_silero_tts(text: str) -> bytes:
    """Synthesise speech with Silero TTS. Returns raw 16-bit PCM bytes at 24 kHz."""
    try:
        t0 = time.monotonic()
        with torch.no_grad():
            audio_tensor = silero_model.apply_tts(
                text=text,
                speaker="en_0",
                sample_rate=silero_sample_rate,
            )
        audio_np  = audio_tensor.numpy()
        audio_i16 = (audio_np * 32767).clip(-32768, 32767).astype(np.int16)
        pcm_bytes = audio_i16.tobytes()
        tts_duration_s = len(pcm_bytes) / (silero_sample_rate * 2)
        tts_elapsed    = time.monotonic() - t0

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        wav_path  = os.path.join(TEMP_DIR, f"tts_{timestamp}.wav")
        with wave.open(wav_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(silero_sample_rate)
            wf.writeframes(pcm_bytes)
        logger.info(
            "  TTS done  took=%.2f s  audio_duration=%.2f s  pcm=%d B  rtf=%.2fx  file=%s",
            tts_elapsed, tts_duration_s, len(pcm_bytes),
            tts_elapsed / max(tts_duration_s, 0.001),
            os.path.basename(wav_path),
        )
        return pcm_bytes
    except Exception as exc:
        logger.error("  TTS error: %s", exc)
        return b""


# ─── Opus encoder ─────────────────────────────────────────────────────────────

def encode_pcm_to_opus(pcm_bytes: bytes) -> list[bytes]:
    """
    Encode raw 16-bit mono 24 kHz PCM into a list of Opus packets.

    Each packet covers OPUS_FRAME_MS milliseconds (480 samples at 24 kHz).
    """
    encoder = opuslib.Encoder(SERVER_SAMPLE_RATE, 1, opuslib.APPLICATION_VOIP)
    samples  = np.frombuffer(pcm_bytes, dtype=np.int16)
    packets: list[bytes] = []

    for offset in range(0, len(samples) - OPUS_FRAME_SAMPLES + 1, OPUS_FRAME_SAMPLES):
        frame  = samples[offset : offset + OPUS_FRAME_SAMPLES].tobytes()
        packet = encoder.encode(frame, OPUS_FRAME_SAMPLES)
        packets.append(packet)

    audio_duration_s = len(pcm_bytes) / (SERVER_SAMPLE_RATE * 2)
    logger.info(
        "  Opus encode  pcm=%d B  packets=%d  audio=%.2f s  avg_pkt=%.0f B",
        len(pcm_bytes), len(packets), audio_duration_s,
        len(pcm_bytes) / max(len(packets), 1) / (OPUS_FRAME_SAMPLES * 2) * sum(len(p) for p in packets) / max(len(packets), 1),
    )
    return packets


# ─── Shared pipeline ──────────────────────────────────────────────────────────

async def run_pipeline(
    audio_bytes: bytes,
    client: httpx.AsyncClient,
    source: str = "ws",
) -> tuple[str, str, str]:
    """
    Run the full STT → LLM pipeline.

    Returns:
        (transcript, reply, saved_path)

    Raises:
        ValueError: if no speech is detected in the audio.
    """
    pipeline_start = time.monotonic()
    loop           = asyncio.get_event_loop()

    logger.info(_sep("STT"))
    saved_path = await loop.run_in_executor(
        None, save_audio_to_temp, audio_bytes, source
    )
    transcript = await stt_faster_whisper(audio_bytes)
    if not transcript:
        logger.warning("  STT returned empty — no speech detected")
        raise ValueError("NO_SPEECH")

    logger.info(_sep("LLM"))
    t_llm = time.monotonic()
    reply = await chat_gemini(transcript, client)
    logger.info("  LLM took %.2f s", time.monotonic() - t_llm)

    logger.info("  pipeline total %.2f s", time.monotonic() - pipeline_start)
    return transcript, reply, saved_path


# ─── WebSocket helpers ────────────────────────────────────────────────────────

async def ws_send_json(ws: WebSocket, **kwargs) -> None:
    """Serialise keyword arguments as JSON and send as a text frame."""
    await ws.send_text(json.dumps(kwargs))


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Return server health status."""
    return {"status": "healthy", "version": "3.1.0"}


# ─── WebSocket endpoint ───────────────────────────────────────────────────────

@app.websocket("/")
async def websocket_chat(websocket: WebSocket):
    """
    Primary ESP32 interface over WebSocket.

    Flow per utterance:
      1. ESP32 streams binary PCM chunks while the user speaks.
      2. ESP32 sends {"type":"instruction","msg":"end_of_speech"}.
      3. Server sends RESPONSE.CREATED, runs STT → LLM → TTS, streams Opus
         packets with deadline-based pacing, then sends RESPONSE.COMPLETE.
      4. Steps 1–3 repeat for subsequent utterances.

    Disconnect handling:
      WebSocketDisconnect is caught and logged cleanly.  The low-level
      websockets library raises on any attempt to receive() after the close
      frame arrives, so we also catch Exception and distinguish disconnect
      signals by checking the message type before every receive().
    """
    await websocket.accept()
    client_host = websocket.client.host
    logger.info(_sep("ESP32 CONNECTED"))
    logger.info("  host=%s", client_host)

    audio_chunks: list[bytes] = []
    session_start = time.monotonic()
    utterance_n   = 0

    try:
        while True:
            # ── Receive next frame ────────────────────────────────────────────
            try:
                message = await websocket.receive()
            except WebSocketDisconnect:
                # Clean close initiated by the client.
                raise
            except Exception as exc:
                # The underlying websockets library raises
                # "Cannot call receive() once a disconnect message has been
                # received" when the close frame has already been processed.
                # Treat any receive-time exception as a clean disconnect.
                logger.info(
                    "WebSocket receive() raised after close for %s: %s",
                    client_host, exc,
                )
                return

            # ── Detect close frame delivered as a message dict ────────────────
            msg_type = message.get("type", "")
            if msg_type == "websocket.disconnect":
                logger.info("WebSocket close frame received from %s", client_host)
                return

            # ── Binary: accumulate PCM audio ──────────────────────────────────
            if "bytes" in message and message["bytes"]:
                audio_chunks.append(message["bytes"])
                n = len(audio_chunks)
                if n == 1:
                    logger.info("  [ESP32→SVR] first PCM chunk received — recording in progress")
                elif n % 20 == 0:
                    accumulated = sum(len(c) for c in audio_chunks)
                    logger.info(
                        "  [ESP32→SVR] buffering...  chunks=%d  accumulated=%d B  (%.2f s)",
                        n, accumulated, accumulated / (SERVER_SAMPLE_RATE * 2),
                    )
                continue

            # ── Text: handle control messages ─────────────────────────────────
            if "text" not in message or not message["text"]:
                continue

            try:
                data = json.loads(message["text"])
            except json.JSONDecodeError:
                logger.warning("Non-JSON text frame: %s", message["text"][:80])
                continue

            instruction_type = data.get("type", "")
            instruction_body = data.get("msg", "")

            if instruction_type != "instruction" or instruction_body != "end_of_speech":
                logger.debug("Ignoring unhandled message: %s", data)
                continue

            # ── end_of_speech: run the pipeline ───────────────────────────────
            if not audio_chunks:
                logger.warning("  [ESP32→SVR] end_of_speech but no audio buffered — ignoring")
                await ws_send_json(websocket, type="error", msg="no audio received")
                continue

            utterance_n  += 1
            audio_bytes   = b"".join(audio_chunks)
            audio_chunks  = []
            audio_dur_s   = len(audio_bytes) / (SERVER_SAMPLE_RATE * 2)
            utterance_start = time.monotonic()

            logger.info(_sep(f"UTTERANCE #{utterance_n}"))
            logger.info(
                "  [ESP32→SVR] end_of_speech  chunks=%d  pcm=%d B  duration=%.2f s",
                len(audio_chunks) + 1 if audio_chunks else 1,
                len(audio_bytes), audio_dur_s,
            )

            logger.info("  [SVR→ESP32] sending RESPONSE.CREATED")
            await ws_send_json(websocket, type="server", msg="RESPONSE.CREATED")

            client = app.state.http_client
            try:
                transcript, reply, saved_path = await run_pipeline(
                    audio_bytes, client, source="ws"
                )
            except ValueError as ve:
                logger.warning("  pipeline error: %s — sending error + RESPONSE.COMPLETE", ve)
                await ws_send_json(websocket, type="error", msg=str(ve))
                await ws_send_json(websocket, type="server", msg="RESPONSE.COMPLETE")
                continue

            logger.info(_sep("TTS + OPUS"))
            logger.info("  [SVR→ESP32] sending transcript: %r", transcript[:80])
            await ws_send_json(websocket, type="transcript", msg=transcript)
            logger.info("  [SVR→ESP32] sending response:   %r", reply[:80])
            await ws_send_json(websocket, type="response",   msg=reply)

            loop      = asyncio.get_event_loop()
            pcm_bytes = await loop.run_in_executor(None, _run_silero_tts, reply)

            if pcm_bytes:
                t_enc = time.monotonic()
                opus_packets = await loop.run_in_executor(
                    None, encode_pcm_to_opus, pcm_bytes
                )
                total        = len(opus_packets)
                total_bytes  = sum(len(p) for p in opus_packets)
                stream_dur_s = total * FRAME_PACING_S
                logger.info(
                    "  [SVR→ESP32] streaming %d Opus packets  "
                    "pacing=%.0f ms/pkt (%.0f%% RT)  "
                    "total_opus=%d B  expected_stream_time=%.2f s",
                    total, FRAME_PACING_S * 1000, FRAME_PACING_FACTOR * 100,
                    total_bytes, stream_dur_s,
                )
                stream_start = time.monotonic()
                for idx, packet in enumerate(opus_packets):
                    await websocket.send_bytes(packet)
                    if idx == 0:
                        logger.info("  [SVR→ESP32] first Opus packet sent")
                    deadline  = stream_start + (idx + 1) * FRAME_PACING_S
                    remaining = deadline - time.monotonic()
                    if remaining > 0:
                        await asyncio.sleep(remaining)
                actual_stream_s = time.monotonic() - stream_start
                logger.info(
                    "  [SVR→ESP32] all %d Opus packets sent  "
                    "actual_stream_time=%.2f s  expected=%.2f s  drift=%.0f ms",
                    total, actual_stream_s, stream_dur_s,
                    (actual_stream_s - stream_dur_s) * 1000,
                )
            else:
                logger.error("  TTS returned empty audio — nothing to stream")

            logger.info("  [SVR→ESP32] sending RESPONSE.COMPLETE")
            await ws_send_json(websocket, type="server", msg="RESPONSE.COMPLETE")

            utterance_elapsed = time.monotonic() - utterance_start
            logger.info(
                _sep(f"UTTERANCE #{utterance_n} DONE"),
            )
            logger.info(
                "  total wall time for this utterance: %.2f s  "
                "(session uptime: %.0f s)",
                utterance_elapsed, time.monotonic() - session_start,
            )

    except WebSocketDisconnect:
        logger.info(
            _sep("ESP32 DISCONNECTED"),
        )
        logger.info(
            "  host=%s  utterances=%d  session_uptime=%.0f s",
            client_host, utterance_n, time.monotonic() - session_start,
        )
    except Exception as exc:
        logger.error(_sep("SESSION ERROR"))
        logger.error("  host=%s  error=%s", client_host, exc)
        try:
            await ws_send_json(websocket, type="error", msg=str(exc))
            await websocket.close()
        except Exception:
            pass


# ─── HTTP fallback endpoint ───────────────────────────────────────────────────

@app.post("/api/chat")
async def http_chat(request: Request):
    """
    Accept a raw PCM body and return the full pipeline result as a stream.

    Response format:
        TRANSCRIPT:<text>\\nREPLY:<text>\\n---AUDIO---\\n<raw PCM bytes>
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