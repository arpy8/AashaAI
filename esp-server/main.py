import io
import os
import re
import time
import wave
import json
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
CHUNK_SIZE = 1024
SAMPLE_RATE = 16000
PROMPT = "You are Aashu. Aashu takes care of your mental health." 


# Initialize models
print("Loading models...")
tts_voice = PiperVoice.load(f"{os.getcwd()}/{TTS_MODEL}")
stt_model = WhisperModel(STT_MODEL_SIZE, device="cpu", compute_type="int8")
llm_client = genai.Client()
print("Models loaded successfully!")

clients = set()
audio_buffers = defaultdict(io.BytesIO)

def format_text(input_text):
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
    response = llm_client.models.generate_content(
        model=LLM_MODEL, 
        contents=query,
        config=types.GenerateContentConfig(
            system_instruction=PROMPT
        ),
    )
    return response.text


def convert_to_speech(text, output_file):
    """Convert text to speech and save as WAV"""
    with wave.open(output_file, "wb") as wav_file:
        tts_voice.synthesize_wav(text, wav_file)

async def send_to_clients(data):
    for ws in clients.copy():
        try:
            await ws.send(data)
        except:
            clients.remove(ws)


async def process_and_stream_audio(websocket, input_filename):
    """Process audio data through STT -> LLM -> TTS pipeline"""
    # with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_input:
    #     temp_input.write(audio_data)
    #     temp_input_path = temp_input.name
    
    try:
        
        print("Converting speech to text...")
        await websocket.send(json.dumps({
            "status": "processing",
            "message": "Converting to speech to text..."
        }))
        speech_text, lang, prob = convert_to_text(input_filename)
        print(f"Transcription: {speech_text}")
        speech_text = "i am feeling sad today"
        if not speech_text.strip():
            return None, "No speech detected"
        
        print("Generating LLM response...")
        await websocket.send(json.dumps({
            "status": "processing",
            "message": "Generating LLM response..."
        }))
        llm_response = generate_response(speech_text)
        llm_response = format_text(llm_response)
        print(f"Response: {llm_response}")
        
        print("Converting to speech...")
        await websocket.send(json.dumps({
            "status": "processing",
            "message": "Converting to speech..."
        }))
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_output:
            temp_output_path = temp_output.name
        convert_to_speech(llm_response, temp_output_path)
        
        print("Playing audio...")
        await websocket.send(json.dumps({   
            "status": "processing",
            "message": "Playing audio..."
        }))

        data, samplerate = sf.read(temp_output_path, dtype='float32')
        print(f"Loaded: {temp_output_path} ({samplerate} Hz, {len(data)} samples)")
        
        if samplerate != SAMPLE_RATE:
            factor = samplerate // SAMPLE_RATE
            data = data[::factor]
            print(f"Resampled to {SAMPLE_RATE} Hz")

        # Convert stereo to mono if needed
        # if len(data.shape) > 1:
        #     data = np.mean(data, axis=1)

        # Normalize and convert to unsigned 8-bit
        data_u8 = (np.clip(data, -1, 1) * 127 + 128).astype(np.uint8)
        
        for i in range(0, len(data_u8), CHUNK_SIZE):
            chunk = data_u8[i:i+CHUNK_SIZE].tobytes()
            await send_to_clients(chunk)
            await asyncio.sleep(CHUNK_SIZE / SAMPLE_RATE)
        
        await websocket.send(json.dumps({   
            "status": "success",
            "message": "Done playing dawg"
        }))

    finally:
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
                
                else:
                    try:
                        data = json.loads(message)
                        if data.get("command") == "ping":
                            await websocket.send(json.dumps({
                                "status": "pong",
                                "message": "Server is alive"
                            }))
                        elif data.get("command") == "stop":
                            print(f"Saving recording for client {client_id}...")

                            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_input:
                                temp_input_path = temp_input.name

                            with wave.open(temp_input_path, "wb") as wav_file:
                                wav_file.setnchannels(1)
                                wav_file.setsampwidth(1)
                                wav_file.setframerate(SAMPLE_RATE)
                                wav_file.writeframes(audio_buffers[client_id].getvalue())

                            print(f"✅ Saved {temp_input_path} ({audio_buffers[client_id].tell()} bytes)")
                            audio_buffers[client_id].close()
                            del audio_buffers[client_id]

                            await websocket.send(json.dumps({
                                "status": "processing",
                                "message": "Processing your audio..."
                            }))
                            await process_and_stream_audio(websocket, temp_input_path)


                    except json.JSONDecodeError:
                        await websocket.send(json.dumps({
                            "status": "error",
                            "message": "Invalid JSON format"
                        }))
            
            except Exception as e:
                print(f"Error processing message: {e}")
                import traceback
                traceback.print_exc()
                try:
                    await websocket.send(json.dumps({
                        "status": "error",
                        "message": str(e)
                    }))
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