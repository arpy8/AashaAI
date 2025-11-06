import os
import re
import wave
import json
import asyncio
import tempfile
import websockets
from google import genai
from piper import PiperVoice
from markdown import markdown
from bs4 import BeautifulSoup
from google.genai import types
from faster_whisper import WhisperModel


# Configuration
STT_MODEL_SIZE = "tiny"
TTS_MODEL = "tts_models/en_US-libritts_r-medium.onnx"
LLM_MODEL = "gemini-2.5-flash"
WEBSOCKET_HOST = "0.0.0.0"
WEBSOCKET_PORT = 7860
CHUNK_SIZE = 1024
PROMPT = "You are Aashu. Aashu takes care of your mental health." 

# Initialize models
print("Loading models...")
tts_voice = PiperVoice.load(f"{os.getcwd()}/{TTS_MODEL}")
stt_model = WhisperModel(STT_MODEL_SIZE, device="cpu", compute_type="int8")
llm_client = genai.Client()
print("Models loaded successfully!")


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


async def process_audio(audio_data):
    """Process audio data through STT -> LLM -> TTS pipeline"""
    # Save received audio to temporary file
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_input:
        temp_input.write(audio_data)
        temp_input_path = temp_input.name
    
    try:
        # Speech to text
        print("Converting speech to text...")
        speech_text, lang, prob = convert_to_text(temp_input_path)
        print(f"Transcription: {speech_text}")
        
        if not speech_text.strip():
            return None, "No speech detected"
        
        # Generate LLM response
        print("Generating response...")
        llm_response = generate_response(speech_text)
        llm_response = format_text(llm_response)
        print(f"Response: {llm_response}")
        
        # Text to speech
        print("Converting to speech...")
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_output:
            temp_output_path = temp_output.name
        
        convert_to_speech(llm_response, temp_output_path)
        
        # Read the output audio
        with open(temp_output_path, "rb") as f:
            audio_response = f.read()
        
        # Cleanup
        os.unlink(temp_output_path)
        
        return audio_response, llm_response
        
    finally:
        # Cleanup input file
        os.unlink(temp_input_path)


async def handle_client(websocket, path):
    """Handle WebSocket client connection"""
    client_id = id(websocket)
    remote_addr = websocket.remote_address if hasattr(websocket, 'remote_address') else "unknown"
    print(f"Client {client_id} connected from {remote_addr}")
    
    try:
        async for message in websocket:
            try:
                # Check if message is binary (audio data) or text (JSON command)
                if isinstance(message, bytes):
                    print(f"Received {len(message)} bytes of audio data")
                    
                    # Send processing status
                    await websocket.send(json.dumps({
                        "status": "processing",
                        "message": "Processing your audio..."
                    }))
                    
                    audio_response, text_response = await process_audio(message)
                    
                    if audio_response:
                        # Send text response first
                        await websocket.send(json.dumps({
                            "status": "success",
                            "text": text_response,
                            "audio_size": len(audio_response)
                        }))
                        
                        # Send audio data in chunks
                        for i in range(0, len(audio_response), CHUNK_SIZE):
                            chunk = audio_response[i:i + CHUNK_SIZE]
                            await websocket.send(chunk)
                        
                        # Send end marker
                        await websocket.send(json.dumps({
                            "status": "complete",
                            "message": "Audio transmission complete"
                        }))
                        
                        print(f"Sent {len(audio_response)} bytes of audio response")
                    else:
                        await websocket.send(json.dumps({
                            "status": "error",
                            "message": text_response
                        }))
                
                else:
                    try:
                        data = json.loads(message)
                        if data.get("command") == "ping":
                            await websocket.send(json.dumps({
                                "status": "pong",
                                "message": "Server is alive"
                            }))
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
        print(f"Connection closed for client {client_id}")


async def main():
    """Start WebSocket server"""
    print(f"Starting WebSocket server on ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
    print("Note: Hugging Face Spaces will automatically handle SSL/TLS")
    
    # Additional server configuration for better connection handling
    async with websockets.serve(
        handle_client, 
        WEBSOCKET_HOST, 
        WEBSOCKET_PORT,
        ping_interval=20,  # Send ping every 20 seconds
        ping_timeout=10,   # Wait 10 seconds for pong
        max_size=10*1024*1024  # 10MB max message size
    ):
        print("Server is running. Press Ctrl+C to stop.")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped by user")