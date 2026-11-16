import React from 'react';
import { DoctorBanner } from './components/DoctorBanner';
import { ChapterDashboard } from './components/ChapterDashboard';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DoctorBanner />
      <main className="flex-1">
        <ChapterDashboard />
      </main>
      <footer className="py-4 border-t border-slate-200 text-center text-xs text-slate-400">
        OMNIX · Developed for IIT Madras / Commonwealth of Learning (COL) Training of Trainers Programme
      </footer>
    </div>
  );
};

export default App;
