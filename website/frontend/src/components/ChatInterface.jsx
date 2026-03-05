import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Download, MessageCircleHeart, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';

export default function ChatInterface({ sessionId, setSessionId, onCrisisDetected }) {
    const [messages, setMessages] = useState([
        { role: 'model', content: "Hi there. I'm Aasha AI. I'm here to listen, support, and help you find resources. How are you doing today?" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMessage = { role: 'user', content: inputValue };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch('https://arpy8-aasha-ai-backend-server.hf.space/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: userMessage.content
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if (data.session_id && !sessionId) {
                setSessionId(data.session_id);
            }

            setMessages(prev => [...prev, { role: 'model', content: data.reply }]);

            if (data.crisis_detected) {
                onCrisisDetected(true);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'model', content: "I'm having a hard time connecting right now, but please hold on. If you need immediate human connection, you can text HOME to 741741 anytime." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleQuickReply = (text) => {
        setInputValue(text);
        // We defer sending slightly so the state update catches up, or we can just call an internal send with the text
        setTimeout(() => {
            const userMessage = { role: 'user', content: text };
            setMessages(prev => [...prev, userMessage]);
            setInputValue('');
            setIsLoading(true);
            executeChatRequest(text);
        }, 50);
    };

    const executeChatRequest = async (messageText) => {
        try {
            const response = await fetch('https://arpy8-aasha-ai-backend-server.hf.space/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: messageText })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();


            if (data.session_id && !sessionId) setSessionId(data.session_id);
            setMessages(prev => [...prev, { role: 'model', content: data.reply }]);

            // Text to speech
            if (ttsEnabled && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(data.reply);
                // Try to find a calming or female voice if available
                const voices = window.speechSynthesis.getVoices();
                const preferredVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google US English'));
                if (preferredVoice) utterance.voice = preferredVoice;
                utterance.rate = 0.95; // Slightly slower for a calmer feel
                utterance.pitch = 1.0;
                window.speechSynthesis.speak(utterance);
            }

            if (data.crisis_detected) onCrisisDetected(true);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'model', content: "I'm having a hard time connecting right now, but please hold on." }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Original handleSend now uses executeChatRequest payload formatting
    const handleSendOriginal = async () => {
        if (!inputValue.trim()) return;
        const text = inputValue;
        const userMessage = { role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        executeChatRequest(text);
    };

    const exportChat = () => {
        const textContent = messages.map(m => `${m.role === 'user' ? 'You' : 'Aasha AI'}:\n${m.content}\n`).join('\n-------------------\n\n');
        const element = document.createElement("a");
        const file = new Blob([textContent], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = "Aasha_AI_Journal.txt";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const quickReplies = [
        "I'm feeling overwhelmed by my classes.",
        "I just need someone to listen.",
        "Can you help me calm down right now?",
    ];

    const toggleTTS = () => {
        if (ttsEnabled) {
            window.speechSynthesis.cancel();
        }
        setTtsEnabled(!ttsEnabled);
    };

    return (
        <Card className="w-full h-full flex flex-col glass-card border-0 rounded-3xl overflow-hidden min-h-0">
            <CardHeader className="bg-white/5 dark:bg-black/20 border-b border-white/10 dark:border-white/5 py-5 px-8 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-medium text-foreground">Aasha AI</CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                            Online & ready to listen
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className={`rounded-full hover:bg-white/10 ${ttsEnabled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={toggleTTS} aria-label="Toggle Text-to-Speech">
                        {ttsEnabled ? <Volume2 className="w-5 h-5 drop-shadow-[0_0_8px_hsl(var(--primary))]" /> : <VolumeX className="w-5 h-5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10" onClick={exportChat} aria-label="Export Chat">
                        <Download className="w-5 h-5" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0 relative min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    <div className="flex flex-col gap-6 pb-4">
                        {messages.map((message, i) => (
                            <div
                                key={i}
                                className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 
                    ${message.role === 'user' ? 'bg-secondary' : 'bg-primary/10'}`}>
                                        {message.role === 'user' ? (
                                            <User className="w-4 h-4 text-secondary-foreground" />
                                        ) : (
                                            <Bot className="w-4 h-4 text-primary" />
                                        )}
                                    </div>
                                    <div
                                        className={`p-5 rounded-3xl shadow-sm text-[15px] leading-relaxed tracking-wide font-light
                    ${message.role === 'user'
                                                ? 'bg-primary/20 text-foreground rounded-tr-sm border border-primary/20 shadow-inner shadow-primary/5'
                                                : 'glass-panel text-foreground rounded-tl-sm'
                                            }`}
                                    >
                                        <ReactMarkdown
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex w-full justify-start">
                                <div className="max-w-[80%] flex gap-3 flex-row">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1">
                                        <Bot className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/50 text-foreground rounded-tl-sm border border-white/5 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                        <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {messages.length === 1 && !isLoading && (
                            <div className="flex flex-col items-center justify-center mt-10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <span className="text-sm font-medium text-muted-foreground">Not sure where to start?</span>
                                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                                    {quickReplies.map((reply, idx) => (
                                        <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="cursor-pointer px-4 py-2 font-medium text-xs tracking-wide bg-background/50 hover:bg-primary/20 hover:text-primary border border-white/5 transition-colors text-gray-500"
                                            onClick={() => handleQuickReply(reply)}
                                        >
                                            <MessageCircleHeart className="w-3 h-3 mr-2 inline-block opacity-70" />
                                            {reply}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </div>
            </CardContent>

            <CardFooter className="p-5 bg-white/5 dark:bg-black/20 border-t border-white/10 dark:border-white/5">
                <div className="flex w-full gap-3 items-center relative">
                    <Input
                        autoFocus
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendOriginal();
                            }
                        }}
                        placeholder="Type your message..."
                        className="flex-grow h-14 rounded-full pl-6 pr-14 bg-background/50 border border-white/10 dark:border-white/5 focus-visible:ring-1 focus-visible:ring-primary shadow-inner shadow-black/5 dark:shadow-black/20 text-[15px] font-light tracking-wide outline-none transition-all"
                        disabled={isLoading}
                    />
                    <Button
                        size="icon"
                        onClick={handleSendOriginal}
                        disabled={!inputValue.trim() || isLoading}
                        className="rounded-full h-10 w-10 absolute right-1 hover:scale-105 transition-transform"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
