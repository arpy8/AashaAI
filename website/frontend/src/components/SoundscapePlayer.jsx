import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, CloudRain, Waves, Music, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SOUNDS = [
    { id: 'rain', label: 'Light Rain', icon: CloudRain, src: '/audios/501242__shelbyshark__lightrainthunder.wav' },
    { id: 'ocean', label: 'Ocean Waves', icon: Waves, src: '/audios/163124__mmiron__ocean_waves_3.wav' },
    { id: 'brown', label: 'Brown Noise', icon: Music, src: '/audios/737409__tracyradio__brown-noise.mp3' },
    // { id: 'special', label: 'AashaAI Special', icon: Sparkles, src: '/audios/737409__tracyradio__brown-noise.mp3' }
];

export default function SoundscapePlayer() {
    const [activeSound, setActiveSound] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.loop = true;
        }

        if (activeSound) {
            const sound = SOUNDS.find(s => s.id === activeSound);
            if (sound) {
                audioRef.current.src = sound.src;
                audioRef.current.play().catch(e => console.error("Audio play failed:", e));
            }
        } else {
            audioRef.current.pause();
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, [activeSound]);

    const toggleSound = (soundId) => {
        setActiveSound(prev => prev === soundId ? null : soundId);
    };

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-full relative border border-transparent shadow-none hover:text-primary hover:bg-primary/10"
                aria-label="Ambient Sounds"
            >
                {activeSound ? (
                    <>
                        <Volume2 className="h-[1.2rem] w-[1.2rem] text-primary" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    </>
                ) : (
                    <VolumeX className="h-[1.2rem] w-[1.2rem] text-foreground/60" />
                )}
            </Button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 top-full z-50 w-64 glass-card border flex flex-col border-white/10 dark:border-white/5 mt-2 p-3 space-y-1 rounded-2xl shadow-xl shadow-black/20 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
                            Ambient Background
                        </div>
                        {SOUNDS.map(sound => {
                            const isActive = activeSound === sound.id;
                            const Icon = sound.icon;
                            return (
                                <button
                                    key={sound.id}
                                    onClick={() => toggleSound(sound.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-white/5 text-foreground/80'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-4 h-4" />
                                        <span className="text-sm tracking-wide">{sound.label}</span>
                                    </div>
                                    {isActive && (
                                        <div className="flex gap-0.5 h-3 items-end">
                                            <span className="w-1 bg-primary/60 rounded-full animate-[bounce_1s_infinite] h-full" />
                                            <span className="w-1 bg-primary/60 rounded-full animate-[bounce_1.2s_infinite] h-2/3" />
                                            <span className="w-1 bg-primary/60 rounded-full animate-[bounce_0.8s_infinite] h-4/5" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
