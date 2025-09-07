"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Navbar2 } from "@/components/navbar";
import { ChatFeed, Message } from "react-chat-ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Helper functions for localStorage
const LS_KEY = "chat_sessions";
function loadSessions() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveSessions(sessions: any[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(sessions));
}

export default function ChatPage() {
  // sessions: [{id: string, messages: Message[], created: Date}]
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");

  // Load sessions from localStorage on mount
  useEffect(() => {
    const loaded = loadSessions();
    if (loaded.length === 0) {
      // Create initial session
      const initialSession = {
        id: Date.now().toString(),
        messages: [
          new Message({ id: 1, message: "Hey, how are you feeling today?" }),
        ],
        created: new Date().toISOString(),
      };
      setSessions([initialSession]);
      setSelectedSessionId(initialSession.id);
      saveSessions([initialSession]);
    } else {
      setSessions(loaded);
      setSelectedSessionId(loaded[0].id);
    }
  }, []);

  // Get current session
  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  // Send message and update localStorage
  const handleSend = () => {
    if (!input.trim() || !currentSession) return;
    const newMessages = [
      ...currentSession.messages,
      new Message({ id: 0, message: input }),
      new Message({ id: 1, message: "Thanks for your message! (Bot reply)" }),
    ];
    const updatedSessions = sessions.map((s) =>
      s.id === currentSession.id ? { ...s, messages: newMessages } : s
    );
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    setInput("");
  };

  // Start a new chat session
  const handleNewSession = () => {
    const newSession = {
      id: Date.now().toString(),
      messages: [
        new Message({ id: 1, message: "Hey, how are you feeling today?" }),
      ],
      created: new Date().toISOString(),
    };
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setSelectedSessionId(newSession.id);
    saveSessions(updatedSessions);
  };

  // Sidebar for previous chats
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar2 />
      <div className="pt-20 px-4 sm:px-6 lg:px-8 flex">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r rounded-xl mr-8 flex-shrink-0 h-[600px] overflow-y-auto">
          <div className="p-4 flex justify-between items-center">
            <span className="font-semibold text-lg text-foreground">Chats</span>
            <Button size="sm" variant="outline" className="border-border" onClick={handleNewSession}>
              + New
            </Button>
          </div>
          <ul>
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  className={`w-full text-left px-4 py-2 hover:bg-muted rounded-[10px] mb-1 text-xs ${
                    session.id === selectedSessionId ? "bg-foreground/15 font-bold" : ""
                  }`}
                  onClick={() => setSelectedSessionId(session.id)}
                >
                  Session: {new Date(session.created).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* Main Chat Area */}
        <div className="flex-1 pt-10">
          <div className="max-w-[52vw] mx-auto">
            <Card className="p-0 bg-card border-foreground/10 flex flex-col h-[600px]">
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <ChatFeed
                  messages={currentSession?.messages || []}
                  showSenderName={false}
                  bubblesCentered={false}
                  bubbleStyles={{
                    text: {
                      fontSize: 16,
                      color: "var(--foreground)",
                    },
                    chatbubble: {
                      backgroundColor: "var(--primary)",
                      borderRadius: "1rem",
                      padding: "0.75rem 1rem",
                      marginBottom: "0.5rem",
                      maxWidth: "70%",
                    },
                    userBubble: {
                      backgroundColor: "var(--muted)",
                      color: "var(--foreground)",
                    },
                  }}
                />
              </div>
              <form
                className="flex items-center gap-2 px-6 py-4 bg-card gap-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <Input
                  className="flex-1 bg-input text-foreground border-foreground/10 py-6"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  autoFocus
                  disabled={!currentSession}
                />
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground py-6 px-12 rounded-sm cursor-pointer"
                  disabled={!currentSession}
                >
                  Send
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}