import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wind } from 'lucide-react';

export default function Breathe() {
    const [phase, setPhase] = useState('idle'); // idle, inhale, hold, exhale
    const [timeLeft, setTimeLeft] = useState(0);

    const phases = {
        inhale: { duration: 4, text: 'Inhale...', next: 'hold', scale: 1.5, color: 'bg-primary/40' },
        hold: { duration: 7, text: 'Hold...', next: 'exhale', scale: 1.5, color: 'bg-secondary/40' },
        exhale: { duration: 8, text: 'Exhale...', next: 'inhale', scale: 1, color: 'bg-accent/40' }
    };

    useEffect(() => {
        if (phase === 'idle') return;

        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            const nextPhase = phases[phase].next;
            setPhase(nextPhase);
            setTimeLeft(phases[nextPhase].duration);
        }
    }, [phase, timeLeft]);

    const startExercise = () => {
        setPhase('inhale');
        setTimeLeft(phases.inhale.duration);
    };

    const stopExercise = () => {
        setPhase('idle');
        setTimeLeft(0);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 relative z-10 w-full">
            <div className="max-w-2xl w-full text-center space-y-12">
                <div className="space-y-4">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-2">
                        <Wind className="w-6 h-6 text-primary" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tight">Guided Breathing</h1>
                    <p className="text-muted-foreground text-lg font-light tracking-wide max-w-xl mx-auto">
                        Following the 4-7-8 method. Find a comfortable position, relax your shoulders, and follow the visual guide.
                    </p>
                </div>

                <div className="relative h-80 flex items-center justify-center">
                    <AnimatePresence>
                        {phase !== 'idle' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: phases[phase].scale }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: phase === 'inhale' || phase === 'exhale' ? phases[phase].duration : 1, ease: 'easeInOut' }}
                                className={`absolute inset-0 m-auto w-48 h-48 rounded-full blur-xl mix-blend-screen transition-colors duration-1000 ${phases[phase].color}`}
                            />
                        )}
                    </AnimatePresence>

                    <div className="relative z-10 glass-card rounded-full w-48 h-48 flex flex-col items-center justify-center border border-white/10 shadow-lg shadow-black/20">
                        {phase === 'idle' ? (
                            <button
                                onClick={startExercise}
                                className="w-full h-full rounded-full flex flex-col items-center justify-center hover:bg-white/5 transition-colors group cursor-pointer"
                            >
                                <span className="text-lg font-medium tracking-wide group-hover:scale-105 transition-transform">Start</span>
                            </button>
                        ) : (
                            <div className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-white/5 rounded-full transition-colors" onClick={stopExercise}>
                                <span className="text-sm text-muted-foreground uppercase tracking-widest mb-1">{phases[phase].text}</span>
                                <span className="text-4xl font-light">{timeLeft}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
