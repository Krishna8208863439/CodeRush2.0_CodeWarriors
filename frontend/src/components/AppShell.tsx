'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/signup';

  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-white font-sans antialiased">
        {children}
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div>
            <p className="font-bold text-slate-200">Community Redressal Planner © 2026</p>
            <p className="text-slate-400 mt-1">
              Enterprise Municipal Governance Portal • Relational Data &amp; Transparent Audit Engine
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-slate-400">
            <a href="#" className="hover:text-slate-200 underline underline-offset-4">Privacy &amp; Data Governance</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-200 underline underline-offset-4">WCAG Accessibility</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-200 underline underline-offset-4">Municipal Support Line</a>
          </div>
        </div>
      </footer>
    </>
  );
}
