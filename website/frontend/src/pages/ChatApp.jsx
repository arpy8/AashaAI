import React, { useState, useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface';
import MoodCheckIn from '@/components/MoodCheckIn';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, PhoneCall, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Link } from 'react-router-dom';

export default function ChatApp() {
    const [currentMood, setCurrentMood] = useState(null);
    const [urgencyFilter, setUrgencyFilter] = useState('All');
    const [sessionId, setSessionId] = useState(null);
    const [crisisActive, setCrisisActive] = useState(false);

    return (
        <div className="flex flex-col w-full h-[calc(100vh-5rem)] overflow-hidden">
            {/* Crisis Banner */}
            {crisisActive && (
                <div className="sticky top-16 z-40 w-full bg-destructive/90 backdrop-blur-md text-destructive-foreground p-4 shadow-lg flex flex-col md:flex-row items-center justify-between animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 w-full md:w-auto mb-3 md:mb-0">
                        <div className="bg-white/20 p-2 rounded-full">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">Help is Available Right Now</h2>
                            <p className="text-sm opacity-90">You are not alone. Please reach out to someone who can help immediately.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <a href="tel:988" className="flex-1 md:flex-none">
                            <Button variant="secondary" className="w-full bg-white text-destructive hover:bg-white/90 font-bold h-11">
                                <PhoneCall className="w-4 h-4 mr-2" />
                                Call 988 (Lifeline)
                            </Button>
                        </a>
                        <Button
                            variant="outline"
                            size="icon"
                            className="text-white border-white/20 hover:bg-white/10 flex-shrink-0"
                            onClick={() => setCrisisActive(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6 w-full h-full">
                {/* Mood Check-In */}
                {/* <section className="w-full max-w-4xl mx-auto flex-shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <MoodCheckIn
                        currentMood={currentMood}
                        onMoodChange={setCurrentMood}
                        urgencyFilter={urgencyFilter}
                        onUrgencyFilterChange={setUrgencyFilter}
                    />
                </section> */}

                <div className="w-full h-full flex flex-col relative animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150 max-w-4xl mx-auto min-h-0">

                    {/* Main Chat Interface */}
                    <section className="w-full flex-grow min-h-0 flex flex-col">
                        <ChatInterface
                            sessionId={sessionId}
                            setSessionId={setSessionId}
                            onCrisisDetected={() => setCrisisActive(true)}
                        />
                    </section>

                    {/* Privacy Note */}
                    <div className="mt-4 pb-4 flex-shrink-0 text-center flex flex-col items-center justify-center space-y-2">
                        <p className="text-sm text-muted-foreground flex items-center">
                            <Heart className="w-4 h-4 mr-2" />
                            Your conversations are confidential.
                        </p>
                        {/* <Link to="/support" className="text-sm text-primary hover:underline">
                            Browse Support Library
                        </Link> */}
                    </div>
                </div>
            </div>
        </div>
    );
}