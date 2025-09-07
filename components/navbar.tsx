"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 mx-auto mt-2 max-w-4xl 
                  rounded-full p-[2px] backdrop-blur-md bg-background/80 shadow-lg border border-2"
    >
      <div className={"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">HireLink</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/jobs"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Jobs
            </Link>
            <Link
              href="/profile"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Profile
            </Link>
            <Link
              href="/tracker"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Tracker
            </Link>
            <Link
              href="/insights"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Insights
            </Link>
          </div>

          <Link href="">
            <Button className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90">
              Log Out
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}


import CardNav from './CardNav'


export function Navbar2() {
  const items = [
    {
      label: "Menu",
      bgColor: "#0D0716",
      textColor: "#fff",
      links: [
        { label: "Home", ariaLabel: "Home", href: "/" },
        { label: "Chat", ariaLabel: "Chat", href: "/chat/new" },
        { label: "Insights", ariaLabel: "Insights", href: "/insights" }
      ]
    },
    {
      label: "Profile", 
      bgColor: "#170D27",
      textColor: "#fff",
      links: [
        { label: "Settings", ariaLabel: "Settings", href: "/profile" },
      ]
    },
    {
      label: "About Us",
      bgColor: "#271E37", 
      textColor: "#fff",
      links: [
        { label: "Features", ariaLabel: "Features", href: "/#features" },
        { label: "Email", ariaLabel: "Email us", href: "mailto:arpitsengar99@gmail.com" },
        { label: "LinkedIn", ariaLabel: "LinkedIn", href: "https://linkedin.com/in/arpitsengar" }
      ]
    }
  ];

  return (
  <CardNav
      logo={"/logo-full.png"}
      logoAlt="Company Logo"
      items={items}
      baseColor="#000"
      menuColor="#fff"
      buttonBgColor="#3b6de6"
      buttonTextColor="#fff"
      ease="power3.out"
    />
  );
};