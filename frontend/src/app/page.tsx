'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, Camera, Zap, MapPin, Bell, BarChart2, Users,
  AlertTriangle, CheckCircle, ArrowRight, RefreshCw, Activity,
  Radio, Lock, Globe, ChevronRight, Star, Award, Leaf,
  Navigation, Cpu, Database, GitBranch
} from 'lucide-react';

// ── Live ticker data ──────────────────────────────────────────────────────────
const LIVE_COMPLAINTS = [
  { id: 'CRP-2026-000142', category: 'ROAD_DAMAGE', ward: 'Ward 4 – Shivaji Nagar', status: 'IN_PROGRESS', priority: 'HIGH',    ai: 94 },
  { id: 'CRP-2026-000138', category: 'GARBAGE',     ward: 'Ward 7 – Koregaon Park', status: 'ASSIGNED',    priority: 'MEDIUM',  ai: 88 },
  { id: 'CRP-2026-000135', category: 'WATER_LEAKAGE', ward: 'Ward 2 – Aundh',       status: 'RESOLVED',    priority: 'CRITICAL', ai: 97 },
  { id: 'CRP-2026-000131', category: 'STREET_LIGHT', ward: 'Ward 9 – Kothrud',      status: 'SUBMITTED',   priority: 'LOW',     ai: 76 },
  { id: 'CRP-2026-000128', category: 'SEWAGE',       ward: 'Ward 12 – Hadapsar',    status: 'ASSIGNED',    priority: 'HIGH',    ai: 91 },
];

const SYSTEM_STATS = [
  { label: 'Complaints Today',      value: '1,847',  delta: '+12%',  icon: Activity,    color: 'cyan'    },
  { label: 'AI Accuracy',           value: '96.4%',  delta: '+0.8%', icon: Cpu,         color: 'emerald' },
  { label: 'SLA Compliance',        value: '89.2%',  delta: '+3.1%', icon: CheckCircle, color: 'blue'    },
  { label: 'Citizen Satisfaction',  value: '4.7/5',  delta: '+0.2',  icon: Star,        color: 'amber'   },
];

const AI_MODELS = [
  { name: 'DistilBERT Classifier',     task: 'Complaint Categorisation',  accuracy: 96, status: 'live'    },
  { name: 'Sentence-Transformers',     task: 'Duplicate Detection',        accuracy: 94, status: 'live'    },
  { name: 'spaCy NER',                 task: 'Entity Extraction',          accuracy: 93, status: 'live'    },
  { name: 'XGBoost Priority Model',    task: 'Priority Scoring',           accuracy: 91, status: 'live'    },
  { name: 'Whisper STT',               task: 'Voice-to-Text Intake',       accuracy: 95, status: 'live'    },
  { name: 'YOLOv8 Detector',           task: 'Image Evidence Detection',   accuracy: 89, status: 'pending' },
];

const ROLES = [
  { role: 'Citizen',              href: '/dashboard/citizen',    icon: Users,       color: 'from-cyan-500 to-blue-600',      desc: 'File complaints, track status, earn transparency.' },
  { role: 'Field Officer',        href: '/dashboard/officer',    icon: Navigation,  color: 'from-emerald-500 to-teal-600',   desc: 'Priority queue, SLA timers, resolution upload.' },
  { role: 'Department Head',      href: '/dashboard/department', icon: GitBranch,   color: 'from-violet-500 to-purple-600',  desc: 'Officer workload, reassignment, department KPIs.' },
  { role: 'Commissioner',         href: '/dashboard/executive',  icon: BarChart2,   color: 'from-amber-500 to-orange-600',   desc: 'City-wide SLA compliance, escalation overview.' },
  { role: 'System Administrator', href: '/dashboard/admin',      icon: ShieldCheck, color: 'from-rose-500 to-red-600',       desc: 'User management, AI review queue, appeals.' },
];

const STATUS_COLOR: Record<string, string> = {
  SUBMITTED:   'text-slate-400  bg-slate-800/60   border-slate-700',
  ASSIGNED:    'text-blue-400   bg-blue-950/60    border-blue-800/50',
  IN_PROGRESS: 'text-amber-400  bg-amber-950/60   border-amber-800/50',
  RESOLVED:    'text-emerald-400 bg-emerald-950/60 border-emerald-800/50',
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: 'bg-slate-400', MEDIUM: 'bg-blue-400', HIGH: 'bg-amber-400', CRITICAL: 'bg-red-500 animate-pulse',
};

// ── Clock component ───────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-emerald-400 text-xs">{time} IST</span>;
}

// ── Confidence bar ────────────────────────────────────────────────────────────
function ConfidenceBar({ value, color = 'emerald' }: { value: number; color?: string }) {
  const colors: Record<string, string> = {
    emerald: 'from-teal-400 to-emerald-400',
    cyan:    'from-cyan-400 to-blue-400',
    amber:   'from-amber-400 to-orange-400',
    rose:    'from-rose-400 to-red-500',
  };
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-800">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${colors[color] ?? colors.emerald} transition-all duration-700`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CivicPulseOS() {
  const [activeComplaint, setActiveComplaint] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveComplaint(p => (p + 1) % LIVE_COMPLAINTS.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">

      {/* ── TOP NAV ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/6 bg-[#030712]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-black text-white tracking-tight">CIVIC PULSE OS</span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">v2.0 LIVE</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#111827] border border-white/8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-2" />
            <LiveClock />
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white border border-white/10 hover:border-white/20 transition-all">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#030712] hover:brightness-110 transition-all shadow-lg shadow-emerald-500/20">
              File a Complaint
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl" />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#111827] border border-emerald-500/30 text-xs text-emerald-400 font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            AI-Powered Smart City Governance Platform
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white leading-none tracking-tight">
            Civic Pulse OS
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 mt-2">
              Community Redressal Planner
            </span>
          </h1>

          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Multilingual · AI-Classified · Duplicate-Merged · SLA-Enforced · GIS-Mapped civic grievance intelligence.
            Real models. Real escalations. Real accountability.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link href="/complaints/new"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#030712] shadow-xl shadow-emerald-500/20 hover:brightness-110 transition-all hover:-translate-y-0.5">
              <Camera className="w-4 h-4" /> Submit a Complaint <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/map"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border border-white/10 text-slate-300 hover:border-emerald-500/40 hover:text-white transition-all hover:-translate-y-0.5">
              <MapPin className="w-4 h-4 text-emerald-400" /> Explore Live Map
            </Link>
          </div>
        </div>
      </section>

      {/* ── LIVE SYSTEM STATS ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SYSTEM_STATS.map((stat, i) => {
            const Icon = stat.icon;
            const colors: Record<string, string> = {
              cyan: 'border-cyan-800/40 text-cyan-400 bg-cyan-950/30',
              emerald: 'border-emerald-800/40 text-emerald-400 bg-emerald-950/30',
              blue: 'border-blue-800/40 text-blue-400 bg-blue-950/30',
              amber: 'border-amber-800/40 text-amber-400 bg-amber-950/30',
            };
            return (
              <div key={i} className="bg-[#111827] border border-white/8 rounded-2xl p-5 space-y-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colors[stat.color]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{stat.label}</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-400">{stat.delta} vs last week</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── LIVE FEED + AI PIPELINE ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Live complaint feed */}
          <div className="lg:col-span-7 bg-[#111827] border border-white/8 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Live Complaint Feed
              </h2>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                REAL-TIME
              </span>
            </div>

            <div className="space-y-2">
              {LIVE_COMPLAINTS.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setActiveComplaint(i)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                    activeComplaint === i
                      ? 'bg-[#0B1120] border-emerald-500/40'
                      : 'bg-[#0B1120]/60 border-white/6 hover:border-white/12'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[c.priority]}`} />
                        <span className="font-mono text-[10px] font-bold text-slate-400">{c.id}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-white/8">
                          {c.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" /> {c.ward}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_COLOR[c.status]}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">AI {c.ai}%</span>
                    </div>
                  </div>
                  {activeComplaint === i && (
                    <div className="mt-2">
                      <ConfidenceBar value={c.ai} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <Link href="/map" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/8 text-xs font-bold text-slate-400 hover:text-white hover:border-emerald-500/30 transition-all">
              View Full Map <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* AI Pipeline status */}
          <div className="lg:col-span-5 bg-[#111827] border border-white/8 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" /> AI Inference Pipeline
              </h2>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
                MODEL BOUNDARY ENFORCED
              </span>
            </div>

            <div className="space-y-3">
              {AI_MODELS.map((model, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#0B1120] border border-white/6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{model.name}</p>
                      <p className="text-[10px] text-slate-500">{model.task}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${model.status === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span className={`text-[9px] font-bold uppercase ${model.status === 'live' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {model.status}
                      </span>
                    </div>
                  </div>
                  {model.status === 'live' && (
                    <div className="flex items-center gap-2">
                      <ConfidenceBar value={model.accuracy} color="cyan" />
                      <span className="text-[10px] font-mono font-bold text-cyan-400 flex-shrink-0">{model.accuracy}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ROLE PORTALS ────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="mb-5">
          <h2 className="text-lg font-black text-white">Role-Based Portals</h2>
          <p className="text-xs text-slate-500 mt-1">Each role has a separate, access-controlled dashboard with real database-backed APIs.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <Link key={r.role} href={r.href}
                className="group bg-[#111827] border border-white/8 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/20 hover:-translate-y-1 transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${r.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{r.role}</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{r.desc}</p>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:gap-2 transition-all">
                  Open Portal <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── FEATURE PILLARS ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Globe,      label: 'Multilingual',        desc: '6 Indian languages with IndicTrans2 / NLLB translation', color: 'emerald' },
            { icon: Database,   label: 'Master Incidents',    desc: 'Sentence-Transformer deduplication at 0.85 cosine threshold', color: 'cyan' },
            { icon: Lock,       label: 'Privacy-First',       desc: 'AES-256-GCM field encryption · PII redaction before AI inference', color: 'violet' },
            { icon: AlertTriangle, label: 'SLA Escalations', desc: 'BullMQ Redis queue → L1 Dept Head → L2 Commissioner auto-escalation', color: 'amber' },
          ].map(({ icon: Icon, label, desc, color }) => {
            const bg: Record<string, string> = {
              emerald: 'border-emerald-800/40 bg-emerald-950/20 text-emerald-400',
              cyan:    'border-cyan-800/40    bg-cyan-950/20    text-cyan-400',
              violet:  'border-violet-800/40  bg-violet-950/20  text-violet-400',
              amber:   'border-amber-800/40   bg-amber-950/20   text-amber-400',
            };
            return (
              <div key={label} className="bg-[#111827] border border-white/8 rounded-2xl p-5 space-y-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${bg[color]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm font-bold text-white">{label}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA STRIP ───────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#0d2218] via-[#0a1a2e] to-[#0d2218] border border-emerald-800/30 p-8 md:p-12 text-center space-y-5">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative space-y-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold">
              <Award className="w-3.5 h-3.5" /> Hackathon-to-Production Grade
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              Ready to Transform Your Municipality?
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Civic Pulse OS is deployable via Docker Compose in under 10 minutes.
              Real PostgreSQL + PostGIS. Real Redis queues. Real ML models.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/complaints/new"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#030712] hover:brightness-110 transition-all shadow-lg shadow-emerald-500/20">
                <Zap className="w-4 h-4" /> Submit First Complaint
              </Link>
              <Link href="/analytics"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-white/10 text-slate-300 hover:border-emerald-500/40 hover:text-white transition-all">
                <BarChart2 className="w-4 h-4 text-emerald-400" /> View Analytics
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/6 bg-[#030712]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-slate-300">Civic Pulse OS · Community Redressal Planner</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <Link href="/help"          className="hover:text-slate-300 transition-colors">Help Center</Link>
            <Link href="/privacy-center" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/complaints/open-data" className="hover:text-slate-300 transition-colors">Open Data API</Link>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Leaf className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-500">Built for Swachh Bharat · Smart City Mission</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
