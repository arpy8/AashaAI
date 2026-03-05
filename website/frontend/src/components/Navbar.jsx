import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Menu, X } from 'lucide-react';
import SoundscapePlayer from '@/components/SoundscapePlayer';

const NAV_LINKS = [
    { label: 'Home', href: '/' },
    { label: 'Chat', href: '/chat' },
    { label: 'Breathe', href: '/breathe' },
    { label: 'Vent', href: '/vent' },
    { label: 'Support', href: '/support' },
    { label: 'Insights', href: '/dashboard' },
    { label: 'Hardware', href: '/hardware' },
];

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

    // Close mobile menu on route change
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

                    {/* Desktop links */}
                    <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
                        {NAV_LINKS.map(({ label, href }) => (
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
                            {mobileOpen
                                ? <X className="h-4 w-4" />
                                : <Menu className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile drawer — slides down inside the pill */}
                <div
                    className={`
                        md:hidden overflow-hidden transition-all duration-300 ease-in-out
                        ${mobileOpen ? 'max-h-80 opacity-100 pb-3' : 'max-h-0 opacity-0'}
                    `}
                >
                    <div className="flex flex-col gap-1 px-4 pt-1">
                        {NAV_LINKS.map(({ label, href }) => (
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
                    </div>
                </div>
            </header>

            {/* Push page content below the fixed navbar */}
            <div className="h-20" aria-hidden="true" />
        </>
    );
}
