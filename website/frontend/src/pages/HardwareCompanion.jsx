import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Cpu, Mic, Volume2, Battery, Wifi, Package,
    Zap, Shield, Radio, ArrowRight
} from 'lucide-react';

const SPECS = [
    { icon: Cpu, label: 'Processor', value: 'ESP32-S3', desc: 'Dual-core 240 MHz + dedicated AI accelerator' },
    { icon: Volume2, label: 'Audio Amp', value: 'MAX98357A', desc: 'I2S Class-D, up to 3.2 W output' },
    { icon: Mic, label: 'Microphone', value: 'INMP441', desc: 'Omnidirectional MEMS, 24-bit I2S' },
    { icon: Battery, label: 'Battery', value: '1000 mAh Li-Po', desc: 'Charged via TP4056 USB-C module' },
    { icon: Volume2, label: 'Speaker', value: '4 Ohm / 52 mm', desc: 'Full-range driver, warm & clear audio' },
    { icon: Package, label: 'Form Factor', value: 'Compact & Portable', desc: 'Fits in the palm of your hand' },
];

const FEATURES = [
    {
        icon: Wifi,
        title: 'Always Connected',
        body: 'Streams directly to the Aasha AI backend over Wi-Fi, so every conversation is powered by the same Gemini model you use on the web.',
    },
    {
        icon: Mic,
        title: 'Hands-Free Voice',
        body: 'The INMP441 MEMS mic picks up your voice clearly across a room, letting you speak naturally without touching a screen.',
    },
    {
        icon: Zap,
        title: 'Instant Response',
        body: "The ESP32-S3's dedicated vector extensions keep wake-word detection and audio preprocessing on-device for near-zero latency.",
    },
    {
        icon: Shield,
        title: 'Private by Design',
        body: 'Audio is processed locally for wake detection; only your voice query is sent to the server, no continuous cloud listening.',
    },
    {
        icon: Battery,
        title: 'All-Day Battery',
        body: 'The 1 000 mAh Li-Po keeps you company for hours. The TP4056 module charges safely over USB-C.',
    },
    {
        icon: Radio,
        title: 'Rich Sound',
        body: 'A 52 mm full-range speaker driven by the MAX98357A fills your desk with warm, natural audio, not tinny phone-speaker sound.',
    },
];

export default function HardwareCompanion() {
    return (
        <div className="flex flex-col w-full">
            {/* Fixed ambient bg */}
            <div className="fixed inset-0 bg-background -z-10" />

            {/* ── Hero ── */}
            <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center text-center px-4 py-24 overflow-hidden">
                {/* Glow blob */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

                <div className="relative max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <Badge variant="outline" className="px-4 py-1.5 text-xs tracking-widest uppercase border-primary/30 text-primary bg-primary/5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse mr-2 inline-block" />
                        Physical Companion
                    </Badge>

                    <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-foreground">
                        Aasha AI, <br className="hidden md:block" />
                        <span className="text-primary">off the screen.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
                        The same empathetic AI companion you know, now in a compact, portable
                        desktop device that listens and responds with its own voice.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Link to="/chat">
                            <Button size="lg" className="rounded-full px-8 h-12 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                                Try the Web Version <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        {/* <Button variant="outline" size="lg" className="rounded-full px-8 h-12 hover:bg-secondary/20">
                            Get Notified
                        </Button> */}
                    </div>
                </div>

                {/* Product image */}
                <div className="relative mt-16 md:mt-24">
                    <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-3xl scale-95 pointer-events-none" />
                    <div className="relative bg-white/5 border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-sm shadow-2xl">
                        <img
                            src="/hardware-companion.png"
                            alt="Aasha AI Desktop Hardware Companion"
                            className="w-full max-w-sm md:max-w-md mx-auto rounded-2xl object-cover"
                        />
                        <p className="text-xs text-muted-foreground mt-4 text-center tracking-wide">
                            Prototype render · Final product may vary
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Specs ── */}
            <section className="w-full py-24 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16 space-y-3">
                        <h2 className="text-3xl md:text-4xl font-medium tracking-tight">Under the Hood</h2>
                        <p className="text-muted-foreground font-light max-w-xl mx-auto">
                            Purpose-built hardware for always-on conversational AI, every component chosen for quality and efficiency.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {SPECS.map(({ icon: Icon, label, value, desc }) => (
                            <div
                                key={label}
                                className="glass-card p-6 space-y-3 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                                    <p className="text-base font-semibold text-foreground">{value}</p>
                                    <p className="text-sm text-muted-foreground font-light mt-1">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="w-full py-24 px-4 bg-foreground/[0.02]">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16 space-y-3">
                        <h2 className="text-3xl md:text-4xl font-medium tracking-tight">Built to Companion</h2>
                        <p className="text-muted-foreground font-light max-w-xl mx-auto">
                            Every feature designed around one goal, being there for you, wherever you are.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {FEATURES.map(({ icon: Icon, title, body }) => (
                            <div key={title} className="flex gap-5 p-6 glass-card">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="font-medium text-foreground">{title}</h3>
                                    <p className="text-sm text-muted-foreground font-light leading-relaxed">{body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="w-full py-24 px-4">
                <div className="max-w-3xl mx-auto text-center glass-panel rounded-3xl p-12 space-y-6">
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight">
                        Same heart. New form.
                    </h2>
                    <p className="text-muted-foreground font-light leading-relaxed max-w-xl mx-auto">
                        The Aasha AI hardware companion is in active development. While you wait,
                        the full web experience is available right now, no hardware required.
                    </p>
                    <Link to="/chat">
                        <Button size="lg" className="mt-8 rounded-full px-10 h-12 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                            Start a Conversation
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}
