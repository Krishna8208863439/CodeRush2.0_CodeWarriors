'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, MapPin, Cpu, Clock, AlertTriangle, ChevronRight, FileText } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden">
      {/* Dynamic Ambient Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Community Redressal Planner
            </h1>
            <p className="text-xs text-slate-400">AI-Powered Civic Operating System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-medium text-white glass-button rounded-lg shadow-md"
          >
            Register Citizen
          </Link>
        </div>
      </header>

      {/* Main Hero Banner */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs font-semibold text-cyan-400 mb-8">
          <Cpu className="w-4 h-4" />
          <span>Next-Gen Municipal Governance Platform</span>
        </div>

        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Empowering Citizens & Municipalities with Real-Time <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">AI Redressal</span>
        </h2>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl">
          Multi-channel intake (Voice, Audio, WhatsApp, SMS), automated DistilBERT category routing, YOLOv8 object detection, PostGIS heatmaps, and BullMQ SLA escalation engine.
        </p>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-5xl text-left">
          <div className="p-6 glass-panel rounded-2xl border border-slate-800 hover:border-cyan-500/50 transition-all group">
            <FileText className="w-8 h-8 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-bold text-white mb-2">Complaint Intake</h3>
            <p className="text-sm text-slate-400">7 input channels in 6 Indian languages translated automatically.</p>
          </div>

          <div className="p-6 glass-panel rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all group">
            <Cpu className="w-8 h-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-bold text-white mb-2">AI Reasoning Layer</h3>
            <p className="text-sm text-slate-400">DistilBERT category classification, Whisper STT, and EasyOCR text extraction.</p>
          </div>

          <div className="p-6 glass-panel rounded-2xl border border-slate-800 hover:border-cyan-500/50 transition-all group">
            <MapPin className="w-8 h-8 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-bold text-white mb-2">GIS Hotspot Mapping</h3>
            <p className="text-sm text-slate-400">Interactive PostGIS ward boundaries and spatial density heatmaps.</p>
          </div>

          <div className="p-6 glass-panel rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all group">
            <Clock className="w-8 h-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-bold text-white mb-2">SLA Engine</h3>
            <p className="text-sm text-slate-400">Automated job timers with L1 & L2 escalations to Department Heads & Commissioners.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 text-base font-semibold text-white glass-button rounded-xl shadow-lg flex items-center gap-2"
          >
            Access Platform Dashboards
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-500 border-t border-slate-900">
        Community Redressal Planner © 2026. Built with Next.js 14, Node.js Express, PostGIS, PyTorch, and Redis.
      </footer>
    </div>
  );
}
