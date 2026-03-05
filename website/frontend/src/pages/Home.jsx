import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Users, Heart, Github, Linkedin, Twitter, Cpu, ArrowRight } from 'lucide-react';
import Orb from '@/components/Orb';

export default function Home() {
    const scrollToAbout = () => {
        document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="flex flex-col w-full">
            {/* Animated Ambient Background Blobs */}
            <div className="fixed inset-0 overflow-hidden bg-background">
                <Orb
                    hue={160}
                    hoverIntensity={2}
                    rotateOnHover={true}
                    forceHoverState={false}
                    backgroundColor='#131415'
                />
            </div>

            {/* Hero Section */}
            <section className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-4 relative z-10">
                <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="inline-flex items-center justify-center p-2 px-4 rounded-full bg-secondary/20 dark:bg-secondary/10 mb-2 border border-secondary/20 shadow-inner">
                        <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse mr-2"></span>
                        <span className="text-xs font-medium tracking-widest uppercase text-foreground/80">Aasha AI Companion</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-foreground">
                        Your safe space <br className="hidden md:block" /> for academic stress.
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
                        A judgment-free zone designed to support you through tough academic and emotional moments.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                        <Link to="/chat">
                            <Button size="lg" className="w-full sm:w-auto text-md h-14 px-10 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all tracking-wide font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                                Start Chatting
                            </Button>
                        </Link>
                        <Button variant="outline" size="lg" className="w-full sm:w-auto text-md h-14 px-10 rounded-full tracking-wide hover:bg-secondary/20" onClick={scrollToAbout}>
                            Learn More
                        </Button>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about-section" className="w-full py-32 px-4 relative">
                <div className="max-w-5xl mx-auto relative z-10">
                    <div className="text-center mb-20 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-medium tracking-tight">About Aasha AI</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light tracking-wide">
                            We believe everyone deserves a safe space to navigate academic and emotional stress without judgment.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                        <Card className="glass-card shadow-none border-0">
                            <CardContent className="p-8 flex flex-col items-center text-center space-y-6 pt-10">
                                <div className="w-14 h-14 rounded-full bg-primary/10 flex flex-col items-center justify-center">
                                    <Heart className="w-7 h-7 text-primary" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-xl font-medium tracking-wide">Empathy First</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed font-light text-balance">
                                    Designed to listen rather than solve, giving you the space to process your feelings on your own terms.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="glass-card shadow-none border-0">
                            <CardContent className="p-8 flex flex-col items-center text-center space-y-6 pt-10">
                                <div className="w-14 h-14 rounded-full bg-primary/10 flex flex-col items-center justify-center">
                                    <Shield className="w-7 h-7 text-primary" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-xl font-medium tracking-wide">Privacy Centered</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed font-light text-balance">
                                    Your conversations are not tracked for marketing. This is your safe haven.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="glass-card shadow-none border-0">
                            <CardContent className="p-8 flex flex-col items-center text-center space-y-6 pt-10">
                                <div className="w-14 h-14 rounded-full bg-primary/10 flex flex-col items-center justify-center">
                                    <Users className="w-7 h-7 text-primary" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-xl font-medium tracking-wide">Community Tied</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed font-light text-balance">
                                    Built to connect you directly with campus and professional resources when you need them most.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="glass-panel rounded-3xl p-10 md:p-16 text-center max-w-3xl mx-auto">
                        <h3 className="text-2xl font-medium mb-8 tracking-wide">Our Mission</h3>
                        <div className="space-y-6 text-muted-foreground font-light text-lg">
                            <p className="leading-relaxed">
                                Aasha AI was built to address the growing silent struggles within academic institutions. Too often, students feel overwhelmed, isolated, or anxious without a clear path to simply vent and find validation.
                            </p>
                            <p className="leading-relaxed">
                                We are not a replacement for professional therapy. We are a bridge,a supportive companion available 24/7 to provide immediate emotional relief, coping strategies, and clear pathways to critical support networks.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Team Section ── */}
            <section className="w-full py-32 px-4 relative">
                <div className="max-w-5xl mx-auto relative z-10">
                    <div className="text-center mb-20 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-medium tracking-tight">The Team</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light tracking-wide">
                            A small group of passionate builders who believe technology should feel human.
                        </p>
                    </div>

                    {(() => {
                        const members = [
                            {
                                name: 'Arpit Sengar',
                                role: 'Project Lead',
                                bio: 'Architecting Aasha end-to-end, from system design and backend APIs to the physical hardware companion.',
                                initials: 'AR',
                                color: 'from-primary/30 to-primary/10',
                            },
                            {
                                name: 'Aditya Jain',
                                role: 'Backend Developer',
                                bio: 'Crafting the server-side logic, AI integration, and database pipelines that power Aasha\'s responses.',
                                initials: 'AJ',
                                color: 'from-secondary/30 to-secondary/10',
                            },
                            {
                                name: 'Harshit Jain',
                                role: 'Frontend Developer',
                                bio: 'Bringing Aasha to life in the browser, building smooth, accessible interfaces that feel warm and safe.',
                                initials: 'HJ',
                                color: 'from-accent/30 to-accent/10',
                            },
                            {
                                name: 'Siddharth Mohril',
                                role: 'UX Designer',
                                bio: 'Shaping the look, feel, and flow of Aasha, ensuring every interaction is thoughtful and human-centered.',
                                initials: 'SM',
                                color: 'from-primary/20 to-secondary/10',
                            },
                            {
                                name: 'Aditya Bhardwaj',
                                role: 'Data Engineer',
                                bio: 'Structuring and managing the data pipelines and model inputs that keep Aasha informed and responsive.',
                                initials: 'AB',
                                color: 'from-secondary/20 to-accent/10',
                            },
                        ];
                        const renderCard = ({ name, role, bio, initials, color }) => (
                            <Card key={name + role} className="glass-card shadow-none border-0 group w-full">
                                <CardContent className="p-8 flex flex-col items-center text-center space-y-5 pt-10">
                                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-xl font-semibold text-foreground/80 group-hover:scale-105 transition-transform`}>
                                        {initials}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground text-lg">{name}</p>
                                        <p className="text-xs text-primary uppercase tracking-widest mt-0.5">{role}</p>
                                    </div>
                                    <p className="text-muted-foreground text-sm leading-relaxed font-light text-balance">{bio}</p>
                                </CardContent>
                            </Card>
                        );
                        return (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {members.slice(0, 3).map(renderCard)}
                                </div>
                                <div className="flex flex-col sm:flex-row justify-center gap-8 mt-8">
                                    {members.slice(3).map(m => (
                                        <div key={m.name} className="w-full sm:w-[calc(33.333%-1rem)]">
                                            {renderCard(m)}
                                        </div>
                                    ))}
                                </div>
                            </>
                        );
                    })()}
                </div>
            </section>

            {/* ── Hardware Companion Teaser ── */}
            <section className="w-full py-16 px-4 pb-32 relative">
                <div className="max-w-5xl mx-auto">
                    <div className="glass-panel rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12 group hover:bg-white/10 transition-all duration-300">
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                            <Cpu className="w-10 h-10 text-primary" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-3">
                            <p className="text-xs text-primary uppercase tracking-widest font-medium">Hardware</p>
                            <h3 className="text-2xl font-medium tracking-tight">Meet the Desktop Companion</h3>
                            <p className="text-muted-foreground font-light leading-relaxed text-sm max-w-xl">
                                Aasha AI in a compact physical device, ESP32-S3 powered, with a MEMS mic and a warm 52 mm speaker.
                                Sit it on your desk and just talk.
                            </p>
                        </div>
                        <Link to="/hardware" className="shrink-0">
                            <Button className="rounded-full px-8 h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                                Learn More <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
