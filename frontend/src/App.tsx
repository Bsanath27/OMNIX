import React from 'react';
import { DoctorBanner } from './components/DoctorBanner';
import { ChapterDashboard } from './components/ChapterDashboard';

export const App: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-[#08090f] text-slate-100 flex flex-col overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Lovable Atmospheric Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Top-center ambient radial glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[480px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-500/15 blur-[140px] rounded-full" />
        {/* Left accent sphere */}
        <div className="absolute top-[28%] left-[-12%] w-[600px] h-[600px] bg-blue-600/10 blur-[160px] rounded-full" />
        {/* Right accent sphere */}
        <div className="absolute top-[42%] right-[-10%] w-[550px] h-[550px] bg-violet-600/12 blur-[160px] rounded-full" />
        {/* Dot grid with radial falloff */}
        <div 
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 15%, #000 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 15%, #000 40%, transparent 100%)'
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <DoctorBanner />
        <main className="flex-1">
          <ChapterDashboard />
        </main>
        <footer className="py-5 border-t border-white/[0.06] text-center text-xs text-slate-500 backdrop-blur-sm">
          OMNIX · Developed for IIT Madras / Commonwealth of Learning (COL) Training of Trainers Programme
        </footer>
      </div>
    </div>
  );
};

export default App;
