"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { ChatFeed, Message } from "react-chat-ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Sidebar } from "@/components/sidebar";
import { SYSTEM_PROMPT } from "@/lib/data";

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

async function callChatAPI(message: string) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        systemPrompt: SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.response) {
      return data.response;
    } else {
      throw new Error(data.error || 'Invalid response format from API');
    }
  } catch (error) {
    console.error('Error calling chat API:', error);
    return "Sorry, I'm having trouble connecting to the AI service. Please try again.";
  }
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loaded = loadSessions();

    if (loaded.length === 0) {
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

  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  const handleSend = async () => {
    if (!input.trim() || !currentSession || isLoading) return;

    const userMessage = input;
    setInput("");
    setIsLoading(true);

    const userMessageObj = new Message({ id: 0, message: userMessage });
    const updatedSessionsWithUser = sessions.map((s) =>
      s.id === currentSession.id
        ? { ...s, messages: [...s.messages, userMessageObj] }
        : s
    );
    setSessions(updatedSessionsWithUser);
    saveSessions(updatedSessionsWithUser);

    try {
      const botResponse = await callChatAPI(userMessage);

      const botMessageObj = new Message({ id: 1, message: botResponse });
      const finalUpdatedSessions = updatedSessionsWithUser.map((s) =>
        s.id === currentSession.id
          ? { ...s, messages: [...s.messages, botMessageObj] }
          : s
      );
      setSessions(finalUpdatedSessions);
      saveSessions(finalUpdatedSessions);
    } catch (error) {
      console.error("Error getting bot response:", error);
      const errorMessage = new Message({
        id: 1,
        message:
          "Sorry, I'm having trouble responding right now. Please try again.",
      });
      const errorUpdatedSessions = updatedSessionsWithUser.map((s) =>
        s.id === currentSession.id
          ? { ...s, messages: [...s.messages, errorMessage] }
          : s
      );
      setSessions(errorUpdatedSessions);
      saveSessions(errorUpdatedSessions);
    } finally {
      setIsLoading(false);
    }
  };

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

  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-2 px-4 sm:px-6 lg:px-8 flex">
        {/* <Sidebar
          handleNewSession={handleNewSession}
          sessions={sessions}
          setSelectedSessionId={setSelectedSessionId}
          selectedSessionId={selectedSessionId}
        /> */}
        <div className="flex-1 pt-12">
          <Card className="p-0 bg-card border-foreground/10 flex flex-col h-[620px] max-w-[100vw] mx-auto border border-gray-800 rounded-lg ">
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
                    maxWidth: "70%"
                  },
                  userBubble: {
                    backgroundColor: "var(--muted)",
                    color: "var(--foreground)",
                    border: "#e0e0e0"
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
                placeholder={
                  isLoading ? "AI is thinking..." : "Type your message..."
                }
                autoFocus
                disabled={!currentSession || isLoading}
              />
              <Button
                type="submit"
                className="bg-primary text-primary-foreground py-6 px-12 rounded-sm cursor-pointer"
                disabled={!currentSession || isLoading || !input.trim()}
              >
                {isLoading ? "..." : "Send"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}