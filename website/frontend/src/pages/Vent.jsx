import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function Vent() {
    const [text, setText] = useState('');
    const [isBurning, setIsBurning] = useState(false);
    const [isCleared, setIsCleared] = useState(false);

    const handleBurn = () => {
        if (!text.trim()) return;
        setIsBurning(true);
        setTimeout(() => {
            setText('');
            setIsBurning(false);
            setIsCleared(true);
            setTimeout(() => setIsCleared(false), 3000);
        }, 2000);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 relative z-10 w-full">
            <div className="max-w-3xl w-full text-center space-y-10">
                <div className="space-y-4">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-red-500/10 mb-2">
                        <ShieldAlert className="w-6 h-6 text-red-500" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tight">The Venting Sandbox</h1>
                    <p className="text-muted-foreground text-lg font-light tracking-wide max-w-xl mx-auto text-balance">
                        Write down whatever is frustrating, overwhelming, or upsetting you right now. When you're ready, hit release. Nothing is saved. Nothing is judged.
                    </p>
                </div>

                <div className="relative w-full max-w-2xl mx-auto">
                    <AnimatePresence>
                        {!isBurning && !isCleared && (
                            <motion.textarea
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, filter: "blur(10px) brightness(2)", scale: 1.05, transition: { duration: 1.5 } }}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Start typing what's on your mind..."
                                className="w-full h-64 p-6 rounded-3xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 resize-none outline-none focus:ring-1 focus:ring-red-500/50 transition-all font-light leading-relaxed tracking-wide shadow-inner shadow-black/20"
                            />
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {isCleared && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-transparent border border-dashed border-white/10 rounded-3xl"
                            >
                                <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" strokeWidth={1} />
                                <p className="text-muted-foreground font-light tracking-wide text-lg">It's gone. Take a deep breath.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <motion.div
                    animate={{ opacity: isBurning || isCleared ? 0 : 1 }}
                    className="flex justify-center"
                >
                    <Button
                        size="lg"
                        className="rounded-full px-8 h-12 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 tracking-wide font-medium group transition-all"
                        onClick={handleBurn}
                        disabled={!text.trim() || isBurning}
                    >
                        <Flame className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                        Release & Destroy
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
