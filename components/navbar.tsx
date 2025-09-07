"use client";

import CardNav from './CardNav'

export function Navbar() {
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