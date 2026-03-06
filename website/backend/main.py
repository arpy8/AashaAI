from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel, EmailStr
import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import google.generativeai as genai
from datetime import datetime
import uuid

from database import engine, get_db
from models import Base, ChatSession, ChatMessage, SupportResource
import seed

# Initialize Database
Base.metadata.create_all(bind=engine)
try:
    seed.seed_data()
except Exception as e:
    print("Seed error:", e)

# FastAPI App
app = FastAPI(title="Aasha AI API")

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini Setup
genai.configure(api_key=os.getenv("GEMINI_API_KEY", "dummy_key"))

SYSTEM_INSTRUCTION = """
You are Aasha AI, a mental health companion designed to support college students during tough times. 
Your tone should be minimalist, empathetic, supportive, and non-judgmental. Focus on "Calm Tech",keeping interactions simple, clear, and reassuring.

CRITICAL SAFETY INSTRUCTION:
If the user expresses ANY intent of self-harm, suicide, severe depression, or mentions crisis keywords (e.g., "kill myself", "end it all", "don't want to live"), you MUST include the exact string "[CRISIS_DETECTED]" in your response so the system can trigger an emergency UI banner. In these cases, immediately offer support and encourage them to use the emergency resources provided on the page.
"""

class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str

class ChatResponse(BaseModel):
    session_id: str
    reply: str
    crisis_detected: bool

class ContactRequest(BaseModel):
    name: str
    email: str
    subject: str
    message: str

class ResourceResponse(BaseModel):
    id: int
    hub_type: str
    title: str
    description: str
    intensity: str

# ── Email helper ──────────────────────────────────────────────────────────────
def send_email_background(data: ContactRequest):
    """Runs in a background thread — the HTTP response is already sent by now."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    receiver = os.getenv("CONTACT_RECEIVER", smtp_user)

    if not all([smtp_host, smtp_user, smtp_password]):
        print("[contact] SMTP env vars not set — email skipped.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Aasha AI Contact] {data.subject}"
    msg["From"] = smtp_user
    msg["To"] = receiver
    msg["Reply-To"] = data.email

    body = f"""\
New contact form submission from Aasha AI:

Name:    {data.name}
Email:   {data.email}
Subject: {data.subject}

{data.message}
"""
    msg.attach(MIMEText(body, "plain"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, receiver, msg.as_string())
        print(f"[contact] Email sent to {receiver} from {data.email}")
    except Exception as e:
        print(f"[contact] Failed to send email: {e}")


@app.post("/api/contact", status_code=202)
def contact_endpoint(request: ContactRequest, background_tasks: BackgroundTasks):
    """Accepts a contact form submission. Returns 202 immediately; email is sent in the background."""
    background_tasks.add_task(send_email_background, request)
    return {"status": "queued", "message": "Your message has been received. We'll be in touch soon!"}

@app.get("/api/resources", response_model=List[ResourceResponse])

def get_resources(hub_type: str = None, intensity: str = None, db: Session = Depends(get_db)):
    query = db.query(SupportResource)
    if hub_type:
        query = query.filter(SupportResource.hub_type == hub_type)
    if intensity:
        query = query.filter(SupportResource.intensity == intensity)
    return query.all()

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    session_id = request.session_id
    if not session_id:
        session_id = str(uuid.uuid4())
        new_session = ChatSession(session_id=session_id)
        db.add(new_session)
        db.commit()

    # Save user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=request.message,
        timestamp=datetime.utcnow().isoformat()
    )
    db.add(user_msg)
    
    # Retrieve history
    history = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.id).all()
    
    gemini_history = []
    for msg in history:
        if msg.role == "user":
            gemini_history.append({"role": "user", "parts": [msg.content]})
        else:
            gemini_history.append({"role": "model", "parts": [msg.content]})

    try:
        model = genai.GenerativeModel("gemini-2.5-flash", system_instruction=SYSTEM_INSTRUCTION)
        chat = model.start_chat(history=gemini_history[:-1]) # exclude last message as we send it
        response = chat.send_message(request.message)
        reply_text = response.text
    except Exception as e:
        reply_text = "I'm having trouble connecting to my brain right now. Please try again in a moment. But remember, you are not alone."
        print(f"Gemini API Error: {e}")

    crisis_detected = "[CRISIS_DETECTED]" in reply_text
    clean_reply = reply_text.replace("[CRISIS_DETECTED]", "").strip()

    # Save model message
    bot_msg = ChatMessage(
        session_id=session_id,
        role="model",
        content=clean_reply,
        timestamp=datetime.utcnow().isoformat()
    )
    db.add(bot_msg)
    db.commit()

    return ChatResponse(
        session_id=session_id,
        reply=clean_reply,
        crisis_detected=crisis_detected
    )
