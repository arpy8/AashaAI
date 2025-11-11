import io
import os
import re
import wave
import asyncio
import tempfile
import websockets
import numpy as np
import soundfile as sf
from google import genai
from piper import PiperVoice
from markdown import markdown
from bs4 import BeautifulSoup
from google.genai import types
from collections import defaultdict
from faster_whisper import WhisperModel

# Configuration
STT_MODEL_SIZE = "tiny"
TTS_MODEL = "tts_models/en_US-libritts_r-medium.onnx"
LLM_MODEL = "gemini-2.5-flash"
WEBSOCKET_HOST = "0.0.0.0"
WEBSOCKET_PORT = 7860
CHUNK_SIZE = 4096
SAMPLE_RATE = 16000

CHANNELS = 1
SAMPLE_WIDTH = 2

PROMPT = "You are Aashu. Aashu acts bossy." 

# Initialize models
print("Loading models...")
tts_voice = PiperVoice.load(f"{os.getcwd()}/{TTS_MODEL}")
stt_model = WhisperModel(STT_MODEL_SIZE, device="cpu", compute_type="int8")
llm_client = genai.Client()
print("Models loaded successfully!")

clients = set()
audio_buffers = defaultdict(io.BytesIO)

def sanitize_text(input_text):
    """Remove markdown and emojis from text"""
    html = markdown(input_text)
    text = ''.join(BeautifulSoup(html, features="html.parser").get_text())
    
    emoj = re.compile("["
        u"\U0001F600-\U0001F64F"  
        u"\U0001F300-\U0001F5FF"  
        u"\U0001F680-\U0001F6FF"  
        u"\U0001F1E0-\U0001F1FF"  
        u"\U00002500-\U00002BEF"
        u"\U00002702-\U000027B0"
        u"\U000024C2-\U0001F251"
        u"\U0001f926-\U0001f937"
        u"\U00010000-\U0010ffff"
        u"\u2640-\u2642" 
        u"\u2600-\u2B55"
        u"\u200d"
        u"\u23cf"
        u"\u23e9"
        u"\u231a"
        u"\ufe0f"
        u"\u3030"
    "]+", re.UNICODE)
    return re.sub(emoj, '', text)


def convert_to_text(file_path: str) -> tuple:
    """Convert audio file to text using Whisper"""
    segments, info = stt_model.transcribe(file_path, beam_size=5)
    speech = " ".join(segment.text for segment in segments)
    return speech, info.language, info.language_probability


def generate_response(query):
    """Generate LLM response"""
    try:
        response = llm_client.models.generate_content(
            model=LLM_MODEL, 
            contents=query,
            config=types.GenerateContentConfig(
                system_instruction=PROMPT
            ),
        )
        return response.text
    except Exception as e:
        print(f"Unexpected error during LLM generation: {e}")
        return "I'm so sorry, but I'm kinda busy right now."

def convert_to_speech(text, output_file):
    """Convert text to speech and save as WAV"""
    with wave.open(output_file, "wb") as wav_file:
        tts_voice.synthesize_wav(text, wav_file)

async def send_to_clients(message):
    for ws in clients.copy():
        try:
            await ws.send(message)
        except:
            clients.remove(ws)


async def process_and_stream_audio(websocket, input_filename):
    """Process audio message through STT -> LLM -> TTS pipeline"""
    try:
        
        print("Converting speech to text")
        await websocket.send("Converting to speech to text")
        speech_text, lang, prob = convert_to_text(input_filename)
        await websocket.send(f"Transcription: {speech_text}")
        print(f"Transcription: {speech_text}")

        if not speech_text.strip():
            return None, "No speech detected"
        
        print("Generating LLM response")
        await websocket.send("Generating LLM response")

        llm_response = sanitize_text(
                        generate_response(speech_text)
                    )
        print(f"Response: {llm_response}")
        
        print("Converting to speech")
        await websocket.send("Converting to speech")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_output:
            temp_output_path = temp_output.name
        convert_to_speech(llm_response, temp_output_path)
        
        print("Playing audio")
        await websocket.send("Playing audio")

        message, samplerate = sf.read(temp_output_path, dtype='float32')
        print(f"Loaded: {temp_output_path} ({samplerate} Hz, {len(message)} samples)")
        
        if samplerate != SAMPLE_RATE:
            x_old = np.linspace(0, len(message), len(message))
            x_new = np.linspace(0, len(message), int(len(message) * SAMPLE_RATE / samplerate))
            message = np.interp(x_new, x_old, message)

            print(f"Resampled to {SAMPLE_RATE} Hz")

        if len(message.shape) > 1:
            message = np.mean(message, axis=1)

        message = (np.clip(message, -1, 1) * 127 + 128).astype(np.uint8)

        for i in range(0, len(message), CHUNK_SIZE):
            chunk = message[i:i+CHUNK_SIZE].tobytes()
            await send_to_clients(chunk)
            await asyncio.sleep(CHUNK_SIZE / SAMPLE_RATE)

        
        await websocket.send("Done playing dawg")

    finally:
        if 'temp_output_path' in locals() and os.path.exists(temp_output_path):
            os.unlink(temp_output_path)


async def handle_client(websocket):
    """Handle WebSocket client connection"""
    client_id = id(websocket)
    clients.add(websocket)
    audio_buffers[client_id] = io.BytesIO()
    
    remote_addr = websocket.remote_address if hasattr(websocket, 'remote_address') else "unknown"
    print(f"Client {client_id} connected from {remote_addr}")
    
    try:
        async for message in websocket:
            try:
                if isinstance(message, bytes):
                    try:
                        audio_buffers[client_id].write(message)
                    except KeyError:
                        audio_buffers[client_id] = io.BytesIO()
                        audio_buffers[client_id].write(message)
                
                elif isinstance(message, str):
                    if message == "ping":
                        await websocket.send("pong")
                    elif message == "pause":
                        print(f"Pausing recording for client {client_id}...")
                        await websocket.send("Recording paused")

                    elif message == "stop":
                        print(f"Saving recording for client {client_id}...")
                        
                        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_input:
                            temp_input_path = temp_input.name

                        with wave.open(temp_input_path, "wb") as wav_file:
                            wav_file.setnchannels(CHANNELS)
                            wav_file.setsampwidth(SAMPLE_WIDTH)
                            wav_file.setframerate(SAMPLE_RATE)
                            wav_file.writeframes(audio_buffers[client_id].getvalue())

                        print(f"✅ Saved {temp_input_path} ({audio_buffers[client_id].tell()} bytes)")
                        audio_buffers[client_id].close()
                        del audio_buffers[client_id]

                        await websocket.send("Processing your audio")
                        await process_and_stream_audio(websocket, temp_input_path)
                else:
                    await websocket.send("Unknown message type")


            except Exception as e:
                print(f"Error processing message: {e}")
                import traceback
                traceback.print_exc()
                try:
                    await websocket.send(str(e))
                except:
                    pass
    
    except websockets.exceptions.ConnectionClosed:
        print(f"Client {client_id} disconnected")
    except Exception as e:
        print(f"Connection error for client {client_id}: {e}")
    
    finally:
        clients.discard(websocket)
        print(f"Connection closed for client {client_id}")


async def main():
    print(f"Starting server on ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
    async with websockets.serve(
        handle_client, 
        WEBSOCKET_HOST, 
        WEBSOCKET_PORT,
        ping_interval=20,           
        ping_timeout=10,            
        max_size=10*1024*1024  
    ):
        print("Server is running. Press Ctrl+C to stop.")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped by user")