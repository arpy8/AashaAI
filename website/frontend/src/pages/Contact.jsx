import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Github, Heart, Send, CheckCircle, AlertCircle } from 'lucide-react';

const CONTACT_CARDS = [
    {
        icon: Mail,
        title: 'Email Us',
        desc: 'For general questions, partnerships, or feedback.',
        value: 'arpitsengar99@gmail.com',
        href: 'mailto:arpitsengar99@gmail.com',
    },
    {
        icon: Github,
        title: 'Open Source',
        desc: 'Browse the code, open issues, or contribute.',
        value: 'github.com/arpy8/AashaAI',
        href: 'https://github.com/arpy8/AashaAI',
    },
    {
        icon: Heart,
        title: 'Mental Health Crisis',
        desc: 'If you need immediate support, please reach out to a helpline.',
        value: 'Call: 14416',
        href: 'tel:14416 ',
    },
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7860';

export default function Contact() {
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            setSubmitted(true);
        } catch (err) {
            setError('Something went wrong. Please try again or email us directly.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex flex-col w-full">
            {/* Ambient bg */}
            <div className="fixed inset-0 bg-background -z-10" />

            {/* ── Hero ── */}
            <section className="relative w-full py-24 px-4 text-center overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

                <div className="relative max-w-2xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <Badge variant="outline" className="px-4 py-1.5 text-xs tracking-widest uppercase border-primary/30 text-primary bg-primary/5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse mr-2 inline-block" />
                        Get in Touch
                    </Badge>

                    <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground">
                        We'd love to <span className="text-primary">hear from you.</span>
                    </h1>

                    <p className="text-lg text-muted-foreground font-light leading-relaxed">
                        Whether you have a question, a thought, or just want to say hello —
                        we're here and we're listening.
                    </p>
                </div>
            </section>

            {/* ── Contact Cards ── */}
            <section className="w-full px-4 pb-16">
                <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {CONTACT_CARDS.map(({ icon: Icon, title, desc, value, href }) => (
                        <a
                            key={title}
                            href={href}
                            target={href.startsWith('http') ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            className="glass-card p-6 space-y-3 group block no-underline"
                        >
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                            </div>
                            <div>
                                <p className="font-medium text-foreground">{title}</p>
                                <p className="text-sm text-muted-foreground font-light leading-relaxed mt-1">{desc}</p>
                                <p className="text-sm text-primary mt-2 font-medium group-hover:underline">{value}</p>
                            </div>
                        </a>
                    ))}
                </div>
            </section>

            {/* ── Contact Form ── */}
            <section className="w-full px-4 pb-24">
                <div className="max-w-2xl mx-auto">
                    <div className="glass-panel rounded-3xl p-8 md:p-12">
                        {submitted ? (
                            <div className="text-center space-y-4 py-8 animate-in fade-in zoom-in-95 duration-500">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                    <CheckCircle className="w-8 h-8 text-primary" strokeWidth={1.5} />
                                </div>
                                <h2 className="text-2xl font-medium tracking-tight">Message received!</h2>
                                <p className="text-muted-foreground font-light leading-relaxed">
                                    Thank you for reaching out. We'll get back to you within 1–2 business days.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-4 rounded-full px-8"
                                    onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                                >
                                    Send another message
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-8 space-y-1">
                                    <div className="flex items-center gap-2 text-primary mb-2">
                                        <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                                        <span className="text-xs tracking-widest uppercase font-medium">Send a Message</span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground">
                                        Start a conversation
                                    </h2>
                                    <p className="text-muted-foreground font-light text-sm">
                                        All fields are required. We respect your privacy and will never share your information.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label htmlFor="name" className="text-sm font-medium text-foreground">
                                                Your name
                                            </label>
                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                required
                                                value={form.name}
                                                onChange={handleChange}
                                                placeholder="John Doe"
                                                className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="email" className="text-sm font-medium text-foreground">
                                                Email address
                                            </label>
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                required
                                                value={form.email}
                                                onChange={handleChange}
                                                placeholder="you@example.com"
                                                className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="subject" className="text-sm font-medium text-foreground">
                                            Subject
                                        </label>
                                        <input
                                            id="subject"
                                            name="subject"
                                            type="text"
                                            required
                                            value={form.subject}
                                            onChange={handleChange}
                                            placeholder="What's on your mind?"
                                            className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="message" className="text-sm font-medium text-foreground">
                                            Message
                                        </label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            rows={5}
                                            required
                                            value={form.message}
                                            onChange={handleChange}
                                            placeholder="Tell us more..."
                                            className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition resize-none"
                                        />
                                    </div>

                                    {error && (
                                        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in duration-300">
                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.5} />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        size="lg"
                                        className="w-full rounded-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                                                Sending…
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                Send Message <Send className="w-4 h-4" />
                                            </span>
                                        )}
                                    </Button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
