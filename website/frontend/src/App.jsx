import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Home from '@/pages/Home';
import ChatApp from '@/pages/ChatApp';
import SupportLibrary from '@/pages/SupportLibrary';
import Breathe from '@/pages/Breathe';
import Vent from '@/pages/Vent';
import Dashboard from '@/pages/Dashboard';
import HardwareCompanion from '@/pages/HardwareCompanion';

export default function App() {
  const location = useLocation();
  const hideFooter = location.pathname === '/chat';
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<ChatApp />} />
          <Route path="/support" element={<SupportLibrary />} />
          <Route path="/breathe" element={<Breathe />} />
          <Route path="/vent" element={<Vent />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hardware" element={<HardwareCompanion />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
