import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Menu, X, ChevronDown, Wind, Mic2, BookOpen, BarChart2 } from 'lucide-react';
import SoundscapePlayer from '@/components/SoundscapePlayer';

// Top-level links (always visible)
const TOP_LINKS = [
    { label: 'Home', href: '/' },
    { label: 'Chat', href: '/chat' },
    { label: 'Hardware', href: '/hardware' },
    { label: 'Contact', href: '/contact' },
];

// Links that live inside the "Explore" dropdown
const DROPDOWN_LINKS = [
    { label: 'Breathe', href: '/breathe', icon: Wind, desc: 'Guided breathing exercises' },
    { label: 'Vent', href: '/vent', icon: Mic2, desc: 'Let it all out safely' },
    { label: 'Support', href: '/support', icon: BookOpen, desc: 'Resources & helplines' },
    { label: 'Insights', href: '/dashboard', icon: BarChart2, desc: 'Your mood overview' },
];

// All links flattened (for mobile drawer)
const ALL_MOBILE_LINKS = [
    ...TOP_LINKS,
    ...DROPDOWN_LINKS.map(({ label, href }) => ({ label, href })),
];

function ExploreDropdown({ isActive }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const location = useLocation();
    const anyActive = DROPDOWN_LINKS.some(l => location.pathname.startsWith(l.href));

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close on route change
    useEffect(() => { setOpen(false); }, [location.pathname]);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                aria-haspopup="true"
                aria-expanded={open}
                className={`
                    relative flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg font-medium
                    transition-colors duration-200 select-none
                    ${anyActive
                        ? 'text-foreground bg-foreground/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}
                `}
            >
                {anyActive && (
                    <span className="absolute inset-x-2 -bottom-0.5 h-px bg-primary rounded-full" />
                )}
                Explore
                <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? 'rotate-180' : 'rotate-0'}`}
                    strokeWidth={2}
                />
            </button>

            {/* Dropdown panel */}
            <div
                className={`
                    absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2
                    w-64
                    rounded-2xl border border-white/10
                    backdrop-blur-xl
                    bg-background/95
                    shadow-[0_16px_48px_rgba(0,0,0,0.3)]
                    p-2 space-y-0.5
                    transition-all duration-250 ease-out
                    origin-top
                    ${open
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
                `}
            >
                {/* Small arrow */}
                <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 rounded-[2px] bg-background/80 border-l border-t border-white/10" />

                {DROPDOWN_LINKS.map(({ label, href, icon: Icon, desc }) => {
                    const active = location.pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            to={href}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl
                                transition-colors duration-150 group
                                ${active
                                    ? 'bg-primary/10 text-foreground'
                                    : 'hover:bg-foreground/5 text-muted-foreground hover:text-foreground'}
                            `}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                                ${active ? 'bg-primary/20' : 'bg-foreground/5 group-hover:bg-primary/10'}`}>
                                <Icon className={`w-4 h-4 transition-colors ${active ? 'text-primary' : 'group-hover:text-primary'}`} strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium leading-none text-foreground">{label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{desc}</p>
                            </div>
                            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

export default function Navbar() {
    const { theme, setTheme } = useTheme();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    const isActive = (href) =>
        href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

    return (
        <>
            {/* ── Fixed floating pill ── */}
            <header
                className={`
                    fixed top-4 left-1/2 -translate-x-1/2 z-[200]
                    w-[90%] max-w-[820px]
                    rounded-2xl
                    border border-white/10
                    backdrop-blur-xl
                    transition-all duration-300
                    ${scrolled
                        ? 'bg-background/70 shadow-[0_8px_32px_rgba(0,0,0,0.35)]'
                        : 'bg-background/50 shadow-[0_4px_16px_rgba(0,0,0,0.2)]'}
                `}
            >
                <div className="flex items-center justify-between h-14 px-4">

                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex items-center gap-2.5 group shrink-0"
                        aria-label="Go to homepage"
                    >
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center transition-colors group-hover:bg-primary/35">
                            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse" />
                        </div>
                        <span className="font-semibold text-sm tracking-widest uppercase text-foreground hidden sm:block">
                            Aasha AI
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
                        {TOP_LINKS.map(({ label, href }) => (
                            <Link
                                key={href}
                                to={href}
                                className={`
                                    relative px-3 py-1.5 text-sm rounded-lg font-medium
                                    transition-colors duration-200
                                    ${isActive(href)
                                        ? 'text-foreground bg-foreground/10'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}
                                `}
                            >
                                {isActive(href) && (
                                    <span className="absolute inset-x-2 -bottom-0.5 h-px bg-primary rounded-full" />
                                )}
                                {label}
                            </Link>
                        ))}

                        {/* Explore dropdown */}
                        <ExploreDropdown />
                    </nav>

                    {/* Right controls */}
                    <div className="flex items-center gap-1 shrink-0">
                        <SoundscapePlayer />

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            className="rounded-full w-8 h-8 hover:text-primary hover:bg-primary/10"
                            aria-label="Toggle theme"
                        >
                            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 hover:text-primary hover:bg-primary/10" />
                            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground hover:text-primary hover:bg-primary/10" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>

                        {/* Mobile hamburger */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden rounded-full w-8 h-8"
                            onClick={() => setMobileOpen((v) => !v)}
                            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={mobileOpen}
                        >
                            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile drawer */}
                <div
                    className={`
                        md:hidden overflow-hidden transition-all duration-300 ease-in-out
                        ${mobileOpen ? 'max-h-[28rem] opacity-100 pb-3' : 'max-h-0 opacity-0'}
                    `}
                >
                    <div className="flex flex-col gap-0.5 px-4 pt-1">
                        {/* Top links */}
                        {TOP_LINKS.map(({ label, href }) => (
                            <Link
                                key={href}
                                to={href}
                                className={`
                                    px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                                    ${isActive(href)
                                        ? 'text-foreground bg-foreground/10'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}
                                `}
                            >
                                {label}
                            </Link>
                        ))}

                        {/* Explore section divider */}
                        <p className="px-3 pt-3 pb-1 text-[10px] font-medium tracking-widest uppercase text-muted-foreground/60">
                            Explore
                        </p>

                        {DROPDOWN_LINKS.map(({ label, href, icon: Icon }) => {
                            const active = location.pathname.startsWith(href);
                            return (
                                <Link
                                    key={href}
                                    to={href}
                                    className={`
                                        flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                                        ${active
                                            ? 'text-foreground bg-foreground/10'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}
                                    `}
                                >
                                    <Icon className={`w-4 h-4 ${active ? 'text-primary' : ''}`} strokeWidth={1.5} />
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Push page content below the fixed navbar */}
            <div className="h-20" aria-hidden="true" />
        </>
    );
}
