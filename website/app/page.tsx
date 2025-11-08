"use client";

import Lenis from "lenis";
import Link from "next/link";
import OrbWrapper from "@/components/bg";
import Footer from "@/components/footer";
import TeamSection from "@/components/team";
import { Navbar } from "@/components/navbar";
import Features from "@/components/home/features";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles } from "lucide-react";
import ContentSection from "@/components/home/content";
import { useEffect } from "react";

export default function LandingPage() {
  useEffect (()=> {
    const lenis = new Lenis();
    function raf(time: any) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }, [])
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar className="fixed" />
      {/* Hero Section */}
      <section className="relative py-56 px-4 sm:px-6 lg:px-8 overflow-hidden bg-transparent">
        <OrbWrapper />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="mb-8 inline-flex items-center px-4 py-2 rounded-full bg-card border border-gray-900">
            <Sparkles className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm text-muted-foreground">
              AI-Powered Mental Health Support
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-2 text-balance">
            Share. Connect. Prosper.
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-16 text-balance max-w-3xl mx-auto">
            College can be overwhelming. We're here to help you.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/chat/new">
              <Button
                size="lg"
                className="relative rounded-sm px-8 py-6 text-lg font-semibold text-white
                            hover:shadow-[0_0_30px_rgba(99,102,241,0.9)]
                              transition-all duration-500 ease-in-out
                                bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500
                                  shadow-[0_0_20px_rgba(99,102,241,0.6)] cursor-pointer"
              >
                Chat Now
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="#content">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-6 hover:bg-card bg-transparent text-foreground/60 hover:text-foreground cursor-pointer"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ContentSection />
      <Features />
      <TeamSection />
      <Footer />
    </div>
  );
}
