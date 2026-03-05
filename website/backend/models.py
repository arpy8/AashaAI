from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.session_id"))
    role = Column(String) # 'user' or 'model'
    content = Column(Text)
    timestamp = Column(String)

class SupportResource(Base):
    __tablename__ = "support_resources"
    id = Column(Integer, primary_key=True, index=True)
    hub_type = Column(String, index=True) # 'Academic Resilience' or 'Emotional Well-being'
    title = Column(String)
    description = Column(Text)
    intensity = Column(String) # 'Low' or 'High'
