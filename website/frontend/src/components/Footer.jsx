import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Github, Twitter, Linkedin, Cpu } from 'lucide-react';

const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Chat', to: '/chat' },
    { label: 'Breathe', to: '/breathe' },
    { label: 'Vent', to: '/vent' },
    { label: 'Support Library', to: '/support' },
    { label: 'Dashboard', to: '/dashboard' },
];

const socialLinks = [
    { icon: Github, href: 'https://github.com/arpy8/aashaai', label: 'GitHub' },
    { icon: Twitter, href: 'https://x.com/arpy8_', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com/in/arpitsengar', label: 'LinkedIn' },
];

export default function Footer() {
    return (
        <footer className="relative z-10 w-full border-t border-white/5 bg-background/60 backdrop-blur-lg">
            <div className="max-w-5xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

                    {/* Brand */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse" />
                            <span className="text-base font-semibold tracking-wide text-foreground">Aasha AI</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-xs">
                            A judgment-free companion for students navigating academic stress and emotional overwhelm.
                        </p>
                        <Link
                            to="/hardware"
                            className="inline-flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary transition-colors mt-1"
                        >
                            <Cpu className="w-3.5 h-3.5" />
                            Hardware Companion
                        </Link>
                    </div>

                    {/* Navigation */}
                    <div className="space-y-3">
                        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">Navigate</p>
                        <ul className="space-y-2">
                            {navLinks.map(({ label, to }) => (
                                <li key={to}>
                                    <Link
                                        to={to}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
                                    >
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Social / Info */}
                    <div className="space-y-3">
                        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">Follow</p>
                        <div className="flex gap-3">
                            {socialLinks.map(({ icon: Icon, href, label }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/20 hover:bg-white/5 transition-all"
                                >
                                    <Icon className="w-4 h-4" />
                                </a>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground/50 font-light leading-relaxed max-w-xs pt-2">
                            Not a replacement for professional mental health care. If you are in crisis, please contact a licensed professional or emergency services.
                        </p>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground/50 font-light">
                        © {new Date().getFullYear()} Aasha AI. Built with care for students.
                    </p>
                    <p className="text-xs text-muted-foreground/40 flex items-center gap-1 font-light">
                        Made with <Heart className="w-3 h-3 text-primary/60 fill-primary/40" /> by the Aasha team
                    </p>
                </div>
            </div>
        </footer>
    );
}
