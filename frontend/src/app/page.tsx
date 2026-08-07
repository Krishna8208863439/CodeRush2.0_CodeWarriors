'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Zap, Activity, Cpu, MapPin, BarChart2, Users,
  CheckCircle, ArrowRight, Radio, Lock, Globe,
  AlertTriangle, ChevronRight, Award, Leaf,
  GitBranch, Navigation, ShieldCheck, Database, Star,
} from 'lucide-react';

// ── Data ─────────────────────────────────────────────────────────────────────
const LIVE_COMPLAINTS = [
  { id: 'CVG-8924', category: 'ROAD_DAMAGE',    ward: 'Ward 4 – Arterial Route',  status: 'IN_PROGRESS', priority: 'CRITICAL', ai: 98, sla: '01:45 remaining' },
  { id: 'CVG-8910', category: 'FALLEN_TREE',    ward: 'Ward 2 – Pedestrian Path', status: 'ASSIGNED',    priority: 'HIGH',     ai: 85, sla: '08:30 remaining' },
  { id: 'CVG-8897', category: 'STREET_LIGHT',   ward: 'Ward 7 – Elm Street',      status: 'ASSIGNED',    priority: 'MEDIUM',   ai: 92, sla: '11:15 remaining' },
  { id: 'CVG-8810', category: 'GARBAGE',        ward: 'Ward 9 – Main St.',        status: 'RESOLVED',    priority: 'LOW',      ai: 88, sla: 'Completed 2d 4h' },
];

const STATS = [
  { label: 'Total Incidents',       value: '1,248', delta: '+12%',  icon: Activity,    color: 'cyan'    },
  { label: 'SLA Adherence',         value: '87.4%', delta: '+3.1%', icon: CheckCircle, color: 'emerald' },
  { label: 'Active Deployments',    value: '42',    delta: '5 zones', icon: Users,     color: 'violet'  },
  { label: 'Critical Breaches',     value: '14',    delta: 'needs action', icon: AlertTriangle, color: 'red' },
];

const AI_MODELS = [
  { name: 'DistilBERT Classifier',   task: 'Complaint Categorisation',  pct: 96, live: true  },
  { name: 'Sentence-Transformers',   task: 'Duplicate Detection',        pct: 94, live: true  },
  { name: 'spaCy NER',               task: 'Entity Extraction',          pct: 93, live: true  },
  { name: 'Whisper STT',             task: 'Voice-to-Text Intake',       pct: 95, live: true  },
  { name: 'XGBoost Priority',        task: 'Priority Scoring',           pct: 91, live: true  },
  { name: 'YOLOv8 Detector',         task: 'Image Evidence Detection',   pct: 89, live: false },
];

// Screens from stitch_civic_pulse_os — NO external images
const SCREENS = [
  {
    src: '/screen-citizen.png',
    label: 'Citizen Portal',
    desc: 'File new grievances via Text · Audio · Media. Live SLA countdown, AI category, Why AI Explained.',
    href: '/complaints/new',
    color: 'from-cyan-500 to-blue-600',
    icon: Users,
  },
  {
    src: '/screen-officer.png',
    label: 'Officer Workstation',
    desc: 'SLA Priority Queue sorted by time-to-breach. Confidence scores, ward distance, one-tap resolve.',
    href: '/dashboard/officer',
    color: 'from-emerald-500 to-teal-600',
    icon: Navigation,
  },
  {
    src: '/screen-admin.png',
    label: 'Control Tower',
    desc: 'Commissioner overview: Total incidents, SLA adherence bar, active deployments, critical breaches.',
    href: '/dashboard/executive',
    color: 'from-amber-500 to-orange-600',
    icon: BarChart2,
  },
  {
    src: '/screen-auth.png',
    label: 'Secure Auth Portal',
    desc: 'WCAG AA · ISO 27001. Citizen / Staff role selection, OTP mobile login, privacy consent.',
    href: '/login',
    color: 'from-violet-500 to-purple-600',
    icon: ShieldCheck,
  },
];

const STATUS_PILL: Record<string, string> = {
  IN_PROGRESS: 'text-amber-400  bg-amber-950/60  border-amber-700/40',
  ASSIGNED:    'text-blue-400   bg-blue-950/60   border-blue-700/40',
  RESOLVED:    'text-emerald-400 bg-emerald-950/60 border-emerald-700/40',
  SUBMITTED:   'text-slate-400  bg-slate-900/60  border-slate-700/40',
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500 animate-pulse',
  HIGH:     'bg-amber-400',
  MEDIUM:   'bg-blue-400',
  LOW:      'bg-slate-400',
};

// ── Sub-components ────────────────────────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums text-emerald-400 text-xs">{t} IST</span>;
}

function Bar({ pct, active }: { pct: number; active?: boolean }) {
  return (
    <div className="w-full h-2 rounded-full bg-[#1d2022]">
      <div
        className={`h-full rounded-full transition-all duration-700 ${active ? 'bg-gradient-to-r from-violet-500 to-indigo-500' : 'bg-gradient-to-r from-cyan-400 to-emerald-400'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CivicPulseOS() {
  const [activeScreen, setActiveScreen] = useState(0);
  const [activeFeed, setActiveFeed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveFeed(p => (p + 1) % LIVE_COMPLAINTS.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="min-h-screen font-sans selection:bg-violet-500 selection:text-white overflow-x-hidden"
      style={{ background: '#101415', color: '#e0e3e5' }}
    >
      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(16,20,21,0.92)', backdropFilter: 'blur(20px)', borderColor: '#272a2c' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                Civic Pulse OS
              </span>
              <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[9px] font-bold border"
                style={{ background: 'rgba(99,86,251,0.15)', color: '#c3c0ff', borderColor: 'rgba(99,86,251,0.3)' }}>
                v2.0 LIVE
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border"
            style={{ background: '#1d2022', borderColor: '#45464d' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <LiveClock />
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:border-white/20"
              style={{ borderColor: '#45464d', color: '#c6c6cd' }}>
              Sign In
            </Link>
            <Link href="/register"
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#4b41e1,#6352fa)', color: '#fff', boxShadow: '0 4px 16px rgba(75,65,225,0.3)' }}>
              File a Complaint
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(75,65,225,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(75,65,225,0.8) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #4b41e1 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold"
            style={{ background: 'rgba(75,65,225,0.1)', borderColor: 'rgba(75,65,225,0.35)', color: '#c3c0ff' }}>
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            AI-Powered Civic Governance — Community Redressal Planner
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white leading-none tracking-tight"
            style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}>
            Civic Pulse OS
            <span className="block text-transparent bg-clip-text mt-2 text-3xl md:text-4xl"
              style={{ backgroundImage: 'linear-gradient(135deg, #c3c0ff, #4b41e1)' }}>
              Community Redressal Planner
            </span>
          </h1>

          <p className="text-sm md:text-base leading-relaxed max-w-2xl mx-auto" style={{ color: '#909097' }}>
            Multilingual · AI-Classified · Duplicate-Merged · SLA-Enforced · GIS-Mapped civic grievance intelligence.
            Real models. Real escalations. Real accountability.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/complaints/new"
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#4b41e1,#6352fa)', color: '#fff', boxShadow: '0 8px 24px rgba(75,65,225,0.35)' }}>
              File a Grievance <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/map"
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold border transition-all hover:-translate-y-0.5"
              style={{ borderColor: '#45464d', color: '#bcc7de' }}>
              <MapPin className="w-4 h-4" style={{ color: '#c3c0ff' }} /> Explore Live Map
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            const colorMap: Record<string, { bg: string; txt: string; border: string }> = {
              cyan:    { bg: 'rgba(6,182,212,0.08)',   txt: '#22d3ee', border: 'rgba(6,182,212,0.2)'   },
              emerald: { bg: 'rgba(16,185,129,0.08)',  txt: '#34d399', border: 'rgba(16,185,129,0.2)'  },
              violet:  { bg: 'rgba(139,92,246,0.08)',  txt: '#a78bfa', border: 'rgba(139,92,246,0.2)'  },
              red:     { bg: 'rgba(239,68,68,0.08)',   txt: '#f87171', border: 'rgba(239,68,68,0.2)'   },
            };
            const c = colorMap[s.color];
            return (
              <div key={i} className="rounded-xl p-5 space-y-3 border"
                style={{ background: '#1d2022', borderColor: '#272a2c' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border"
                  style={{ background: c.bg, borderColor: c.border }}>
                  <Icon className="w-4 h-4" style={{ color: c.txt }} />
                </div>
                <div>
                  <p className="text-2xl font-black text-white tabular-nums">{s.value}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#909097' }}>{s.label}</p>
                </div>
                <p className="text-[10px] font-bold" style={{ color: '#c3c0ff' }}>{s.delta}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SCREENS FROM STITCH FILES ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
              Platform Screens
            </h2>
            <p className="text-xs mt-1" style={{ color: '#909097' }}>
              Actual UI designs from the stitch_civic_pulse_os design system
            </p>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {SCREENS.map((s, i) => {
            const Icon = s.icon;
            return (
              <button key={i} onClick={() => setActiveScreen(i)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border flex-shrink-0 transition-all"
                style={activeScreen === i
                  ? { background: 'rgba(75,65,225,0.2)', borderColor: 'rgba(75,65,225,0.5)', color: '#c3c0ff' }
                  : { background: '#1d2022', borderColor: '#272a2c', color: '#909097' }}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Active screen display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Phone frame showing actual stitch screenshot */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-[260px]">
              {/* Phone chrome */}
              <div className="rounded-[36px] border-[8px] border-[#272a2c] bg-[#0b0f10] shadow-2xl overflow-hidden"
                style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}>
                {/* Notch */}
                <div className="h-6 bg-[#0b0f10] flex items-center justify-center">
                  <div className="w-16 h-1.5 rounded-full bg-[#272a2c]" />
                </div>
                {/* Screenshot */}
                <div className="relative overflow-hidden" style={{ height: '480px' }}>
                  <Image
                    src={SCREENS[activeScreen].src}
                    alt={SCREENS[activeScreen].label}
                    fill
                    className="object-cover object-top"
                    priority
                    sizes="260px"
                    unoptimized
                  />
                </div>
                {/* Home bar */}
                <div className="h-5 bg-[#0b0f10] flex items-center justify-center">
                  <div className="w-20 h-1 rounded-full bg-[#272a2c]" />
                </div>
              </div>
            </div>
          </div>

          {/* Info panel + all 4 thumbnails */}
          <div className="lg:col-span-7 space-y-5">
            {/* Active screen info */}
            <div className="rounded-xl p-6 border space-y-4"
              style={{ background: '#1d2022', borderColor: '#272a2c' }}>
              <div className="flex items-center gap-3">
                {(() => { const Icon = SCREENS[activeScreen].icon; return (
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${SCREENS[activeScreen].color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                ); })()}
                <div>
                  <h3 className="text-base font-black text-white">{SCREENS[activeScreen].label}</h3>
                  <p className="text-xs" style={{ color: '#909097' }}>{SCREENS[activeScreen].desc}</p>
                </div>
              </div>
              <Link href={SCREENS[activeScreen].href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg,#4b41e1,#6352fa)', color: '#fff' }}>
                Open Portal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* All 4 screenshot thumbnails */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SCREENS.map((s, i) => (
                <button key={i} onClick={() => setActiveScreen(i)}
                  className="rounded-xl overflow-hidden border transition-all hover:-translate-y-0.5 relative group"
                  style={{ borderColor: activeScreen === i ? '#4b41e1' : '#272a2c', background: '#0b0f10' }}>
                  <div className="relative" style={{ height: '120px' }}>
                    <Image
                      src={s.src}
                      alt={s.label}
                      fill
                      className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      sizes="160px"
                      unoptimized
                    />
                    {activeScreen === i && (
                      <div className="absolute inset-0 border-2 rounded-xl pointer-events-none"
                        style={{ borderColor: '#4b41e1', background: 'rgba(75,65,225,0.12)' }} />
                    )}
                  </div>
                  <div className="p-1.5">
                    <p className="text-[10px] font-bold truncate" style={{ color: activeScreen === i ? '#c3c0ff' : '#909097' }}>
                      {s.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE FEED + AI PIPELINE ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Live Complaint Feed */}
          <div className="lg:col-span-7 rounded-xl border p-6 space-y-4"
            style={{ background: '#1d2022', borderColor: '#272a2c' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: '#22d3ee' }} /> Live Complaint Feed
              </h2>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded border"
                style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee', borderColor: 'rgba(6,182,212,0.25)' }}>
                REAL-TIME
              </span>
            </div>

            <div className="space-y-2">
              {LIVE_COMPLAINTS.map((c, i) => (
                <button key={c.id} onClick={() => setActiveFeed(i)}
                  className="w-full p-3.5 rounded-xl border text-left transition-all"
                  style={{
                    background: activeFeed === i ? '#272a2c' : '#191c1e',
                    borderColor: activeFeed === i ? '#4b41e1' : '#272a2c',
                  }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[c.priority]}`} />
                        <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: '#909097' }}>#{c.id}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                          style={{ background: '#272a2c', color: '#bcc7de', borderColor: '#45464d' }}>
                          {c.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs flex items-center gap-1" style={{ color: '#909097' }}>
                        <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#45464d' }} /> {c.ward}
                      </p>
                      {activeFeed === i && (
                        <p className="text-[10px] font-mono font-bold mt-1" style={{ color: '#c3c0ff' }}>
                          SLA: {c.sla}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_PILL[c.status]}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: '#c3c0ff' }}>
                        {c.ai}% Conf.
                      </span>
                    </div>
                  </div>
                  {activeFeed === i && (
                    <div className="mt-2.5">
                      <Bar pct={c.ai} active />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <Link href="/map"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border text-xs font-bold transition-all"
              style={{ borderColor: '#272a2c', color: '#909097' }}>
              View Full GIS Map <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* AI Pipeline */}
          <div className="lg:col-span-5 rounded-xl border p-6 space-y-4"
            style={{ background: '#1d2022', borderColor: '#272a2c' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4" style={{ color: '#c3c0ff' }} /> AI Inference Pipeline
              </h2>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded border"
                style={{ background: 'rgba(99,86,251,0.1)', color: '#c3c0ff', borderColor: 'rgba(99,86,251,0.3)' }}>
                MODEL BOUNDARY
              </span>
            </div>

            <div className="space-y-3">
              {AI_MODELS.map((m, i) => (
                <div key={i} className="p-3 rounded-xl border space-y-2"
                  style={{ background: '#191c1e', borderColor: '#272a2c' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{m.name}</p>
                      <p className="text-[10px]" style={{ color: '#909097' }}>{m.task}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${m.live ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span className="text-[9px] font-bold uppercase" style={{ color: m.live ? '#34d399' : '#fbbf24' }}>
                        {m.live ? 'live' : 'pending'}
                      </span>
                    </div>
                  </div>
                  {m.live && (
                    <div className="flex items-center gap-2">
                      <Bar pct={m.pct} />
                      <span className="text-[10px] font-mono font-bold tabular-nums flex-shrink-0" style={{ color: '#c3c0ff' }}>
                        {m.pct}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="relative rounded-2xl overflow-hidden border p-8 md:p-12 text-center space-y-5"
          style={{ background: 'linear-gradient(135deg, #1d2022, #191c1e)', borderColor: 'rgba(75,65,225,0.3)' }}>
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(rgba(75,65,225,0.6) 1px, transparent 1px), linear-gradient(90deg,rgba(75,65,225,0.6) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-bold"
              style={{ borderColor: 'rgba(75,65,225,0.35)', background: 'rgba(75,65,225,0.1)', color: '#c3c0ff' }}>
              <Award className="w-3.5 h-3.5" /> Hackathon-to-Production Grade
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white"
              style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
              Transform Municipal Governance
            </h2>
            <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: '#909097' }}>
              Civic Pulse OS is deployable via Docker Compose in under 10 minutes.
              Real PostgreSQL+PostGIS · Real Redis queues · Real ML models · Real DPDPA-compliant privacy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/complaints/new"
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg,#4b41e1,#6352fa)', color: '#fff', boxShadow: '0 8px 24px rgba(75,65,225,0.35)' }}>
                <Zap className="w-4 h-4" /> Submit First Complaint
              </Link>
              <Link href="/analytics"
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold border transition-all"
                style={{ borderColor: '#45464d', color: '#bcc7de' }}>
                <BarChart2 className="w-4 h-4" style={{ color: '#c3c0ff' }} /> View Analytics
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: '#272a2c', background: '#101415' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold" style={{ color: '#bcc7de' }}>Civic Pulse OS · Community Redressal Planner</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]" style={{ color: '#45464d' }}>
            <Link href="/help"           className="hover:text-white transition-colors">Help Center</Link>
            <Link href="/privacy-center" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/complaints/open-data" className="hover:text-white transition-colors">Open Data API</Link>
          </div>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: '#45464d' }}>
            <Leaf className="w-3 h-3" style={{ color: '#34d399' }} />
            <span>Swachh Bharat · Smart City Mission · DPDPA 2023</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
