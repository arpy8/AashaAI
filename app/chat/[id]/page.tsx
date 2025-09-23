"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
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

// Gemini API function
async function callGeminiAPI(message: string, apiKey: string) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: message,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Invalid response format from Gemini API");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Sorry, I'm having trouble connecting to the AI service. Please try again.";
  }
}

export default function ChatPage() {
  // sessions: [{id: string, messages: Message[], created: Date}]
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Load sessions and API key from localStorage on mount
  useEffect(() => {
    const loaded = loadSessions();
    const savedApiKey = localStorage.getItem("gemini_api_key") || "";
    setApiKey(savedApiKey);
    
    if (!savedApiKey) {
      setShowApiKeyInput(true);
    }

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

  // Save API key
  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("gemini_api_key", apiKey.trim());
      setShowApiKeyInput(false);
    }
  };

  // Send message and get Gemini response
  const handleSend = async () => {
    if (!input.trim() || !currentSession || isLoading) return;
    
    if (!apiKey) {
      setShowApiKeyInput(true);
      return;
    }

    const userMessage = input;
    setInput("");
    setIsLoading(true);

    // Add user message immediately
    const userMessageObj = new Message({ id: 0, message: userMessage });
    const updatedSessionsWithUser = sessions.map((s) =>
      s.id === currentSession.id 
        ? { ...s, messages: [...s.messages, userMessageObj] }
        : s
    );
    setSessions(updatedSessionsWithUser);
    saveSessions(updatedSessionsWithUser);

    try {
      // Get response from Gemini
      const botResponse = await callGeminiAPI(userMessage, apiKey);
      
      // Add bot message
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
      // Add error message
      const errorMessage = new Message({ 
        id: 1, 
        message: "Sorry, I'm having trouble responding right now. Please try again." 
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

  // API Key Input Modal
  if (showApiKeyInput) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <h2 className="text-xl font-semibold mb-4">Enter Gemini API Key</h2>
          <p className="text-sm text-muted-foreground mb-4">
            To use this chat, you'll need a Gemini API key. You can get one from the{" "}
            <a 
              href="https://makersuite.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google AI Studio
            </a>
            .
          </p>
          <Input
            type="password"
            placeholder="Enter your Gemini API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mb-4"
          />
          <div className="flex gap-2">
            <Button onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
              Save & Continue
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowApiKeyInput(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Sidebar for previous chats
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="pt-20 px-4 sm:px-6 lg:px-8 flex">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r rounded-xl mr-8 flex-shrink-0 h-[600px] overflow-y-auto">
          <div className="p-4 flex justify-between items-center">
            <span className="font-semibold text-lg text-foreground">Chats</span>
            <Button size="sm" variant="outline" className="border-border" onClick={handleNewSession}>
              + New
            </Button>
          </div>
          <div className="px-4 mb-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-xs w-full justify-start"
              onClick={() => setShowApiKeyInput(true)}
            >
              🔑 Change API Key
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
                  placeholder={isLoading ? "AI is thinking..." : "Type your message..."}
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
    </div>
  );
}