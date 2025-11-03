import os
import re
import wave
from google import genai
from piper import PiperVoice
from markdown import markdown
from google.genai import types
from bs4 import BeautifulSoup
from faster_whisper import WhisperModel


STT_MODEL_SIZE = "tiny"
TTS_MODEL="tts_models/en_US-libritts_r-medium.onnx"
# TTS_MODEL="tts_models/en_US-libritts-high.onnx"
LLM_MODEL = "gemini-2.5-flash"
INPUT_FILE = "input.mp3"
OUTPUT_FILE = "output.wav"
PROMPT = "You are Aashu. Aashu takes care of your mental health."
# "You are Katy. Katy replies in a slutty manner."

tts_voice = PiperVoice.load(f"{os.getcwd()}/{TTS_MODEL}")
stt_model = WhisperModel(STT_MODEL_SIZE, device="cpu", compute_type="int8")
llm_client = genai.Client()

def format_text(input_text):
    # remove markdown
    html = markdown(input_text)
    text = ''.join(BeautifulSoup(html, features="html.parser").get_text())
    
    # remove emojis
    emoj = re.compile("["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
        u"\U00002500-\U00002BEF"  # chinese char
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
        u"\ufe0f"  # dingbats
        u"\u3030"
    "]+", re.UNICODE)
    return re.sub(emoj, '', text)
    
def convert_to_text(file_path:str="input.mp3") -> tuple:
    segments, info = stt_model.transcribe(file_path, beam_size=5)
    speech = "\n".join(segment.text for segment in segments)
    return speech, info.language, info.language_probability

def generate_response(query):
    response = llm_client.models.generate_content(
        model=LLM_MODEL, contents=f"{query}", 
        config=types.GenerateContentConfig(
        system_instruction=PROMPT),
    )
    return response.text

def convert_to_speech(text, output_file="output.mp3"):
    with wave.open(output_file, "wb") as wav_file:
        tts_voice.synthesize_wav(text, wav_file)

def main():
    speech_text, _, _ = convert_to_text(INPUT_FILE)
    print(speech_text)

    llm_response = generate_response(speech_text)
    llm_response = format_text(llm_response)
    print(llm_response)

    _ = convert_to_speech(llm_response, OUTPUT_FILE)

if __name__=="__main__":
    import time
    start = time.time()
    main()
    print(time.time()-start)

    # play output audio
    import pygame

    pygame.mixer.init()
    pygame.mixer.music.load(OUTPUT_FILE)
    pygame.mixer.music.play()

    while pygame.mixer.music.get_busy():
        time.sleep(1)