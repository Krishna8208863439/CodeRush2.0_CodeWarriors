'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Zap, Activity, Cpu, MapPin, BarChart2, Users,
  CheckCircle, ArrowRight, Radio, Lock, Globe,
  AlertTriangle, ChevronRight, Award, Leaf,
  Navigation, ShieldCheck, PlusCircle, HelpCircle,
  Shield, Layers, LayoutDashboard, Building2, UserCheck,
} from 'lucide-react';

// Import sub-pages directly for Single-URL switching
import NewComplaintPage from './complaints/new/page';
import CitizenDashboard from './dashboard/citizen/page';
import OfficerDashboard from './dashboard/officer/page';
import DepartmentDashboard from './dashboard/department/page';
import ExecutiveDashboard from './dashboard/executive/page';
import AdminDashboard from './dashboard/admin/page';
import MapPage from './map/page';
import AnalyticsPage from './analytics/page';
import PrivacyCenterPage from './privacy-center/page';
import HelpPage from './help/page';

// ── Live Feed Data ────────────────────────────────────────────────────────────
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

// Screenshots from stitch_civic_pulse_os
const SCREENS = [
  { src: '/screen-citizen.png', label: 'Citizen Portal', tabId: 'citizen', color: 'from-cyan-500 to-blue-600', icon: Users },
  { src: '/screen-officer.png', label: 'Officer Workstation', tabId: 'officer', color: 'from-emerald-500 to-teal-600', icon: Navigation },
  { src: '/screen-admin.png', label: 'Control Tower', tabId: 'executive', color: 'from-amber-500 to-orange-600', icon: BarChart2 },
  { src: '/screen-auth.png', label: 'Secure Auth Portal', tabId: 'privacy', color: 'from-violet-500 to-purple-600', icon: ShieldCheck },
];

const STATUS_PILL: Record<string, string> = {
  IN_PROGRESS: 'text-amber-400 bg-amber-950/60 border-amber-700/40',
  ASSIGNED:    'text-blue-400 bg-blue-950/60 border-blue-700/40',
  RESOLVED:    'text-emerald-400 bg-emerald-950/60 border-emerald-700/40',
  SUBMITTED:   'text-slate-400 bg-slate-900/60 border-slate-700/40',
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500 animate-pulse',
  HIGH:     'bg-amber-400',
  MEDIUM:   'bg-blue-400',
  LOW:      'bg-slate-400',
};

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

export default function SingleUrlCivicPulseOS() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'new-complaint' | 'citizen' | 'officer' | 'department' | 'executive' | 'admin' | 'map' | 'analytics' | 'privacy' | 'help'
  >('overview');

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
      {/* ── TOP UNIFIED CONTROL BAR ───────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(16,20,21,0.95)', backdropFilter: 'blur(20px)', borderColor: '#272a2c' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2 overflow-x-auto">
          {/* Logo & Clock */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-2 text-left hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-extrabold text-white tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                Civic Pulse OS
              </span>
            </button>
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[11px]"
              style={{ background: '#1d2022', borderColor: '#45464d' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <LiveClock />
            </div>
          </div>

          {/* Module Switcher Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'new-complaint', label: 'File Grievance', icon: PlusCircle },
              { id: 'citizen', label: 'Citizen', icon: Users },
              { id: 'officer', label: 'Officer', icon: Navigation },
              { id: 'department', label: 'Dept Head', icon: Building2 },
              { id: 'executive', label: 'Commissioner', icon: Award },
              { id: 'admin', label: 'Super Admin', icon: UserCheck },
              { id: 'map', label: 'GIS Map', icon: MapPin },
              { id: 'analytics', label: 'Analytics', icon: BarChart2 },
              { id: 'privacy', label: 'Privacy', icon: Lock },
              { id: 'help', label: 'Help', icon: HelpCircle },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20'
                      : 'text-[#909097] hover:text-white hover:bg-[#1d2022]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── DYNAMIC MODULE VIEW ───────────────────────────────────────────── */}
      {activeTab === 'new-complaint' && (
        <div className="p-4"><NewComplaintPage /></div>
      )}

      {activeTab === 'citizen' && (
        <div className="p-4"><CitizenDashboard /></div>
      )}

      {activeTab === 'officer' && (
        <div className="p-4"><OfficerDashboard /></div>
      )}

      {activeTab === 'department' && (
        <div className="p-4"><DepartmentDashboard /></div>
      )}

      {activeTab === 'executive' && (
        <div className="p-4"><ExecutiveDashboard /></div>
      )}

      {activeTab === 'admin' && (
        <div className="p-4"><AdminDashboard /></div>
      )}

      {activeTab === 'map' && (
        <div className="p-4"><MapPage /></div>
      )}

      {activeTab === 'analytics' && (
        <div className="p-4"><AnalyticsPage /></div>
      )}

      {activeTab === 'privacy' && (
        <div className="p-4"><PrivacyCenterPage /></div>
      )}

      {activeTab === 'help' && (
        <div className="p-4"><HelpPage /></div>
      )}

      {/* ── OVERVIEW HOME MODULE (default) ───────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* HERO */}
          <section className="relative pt-12 pb-10 px-4 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{ backgroundImage: 'linear-gradient(rgba(75,65,225,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(75,65,225,0.8) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full opacity-10 blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, #4b41e1 0%, transparent 70%)' }} />

            <div className="relative max-w-4xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-bold"
                style={{ background: 'rgba(75,65,225,0.1)', borderColor: 'rgba(75,65,225,0.35)', color: '#c3c0ff' }}>
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                AI-Powered Civic Governance Operating System
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white leading-none tracking-tight"
                style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                Civic Pulse OS
                <span className="block text-transparent bg-clip-text mt-2 text-2xl md:text-3xl"
                  style={{ backgroundImage: 'linear-gradient(135deg, #c3c0ff, #4b41e1)' }}>
                  Community Redressal Planner
                </span>
              </h1>

              <p className="text-xs md:text-sm leading-relaxed max-w-2xl mx-auto" style={{ color: '#909097' }}>
                Multilingual · AI-Classified · Duplicate-Merged · SLA-Enforced · GIS-Mapped civic grievance intelligence.
                All 10 modules accessible right here from a single URL.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('new-complaint')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg,#4b41e1,#6352fa)', color: '#fff', boxShadow: '0 8px 24px rgba(75,65,225,0.35)' }}>
                  <PlusCircle className="w-4 h-4" /> File New Grievance
                </button>
                <button
                  onClick={() => setActiveTab('officer')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold border transition-all"
                  style={{ borderColor: '#45464d', color: '#bcc7de' }}>
                  <Navigation className="w-4 h-4 text-emerald-400" /> Officer Queue
                </button>
                <button
                  onClick={() => setActiveTab('executive')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold border transition-all"
                  style={{ borderColor: '#45464d', color: '#bcc7de' }}>
                  <Award className="w-4 h-4 text-amber-400" /> Control Tower
                </button>
              </div>
            </div>
          </section>

          {/* STATS STRIP */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
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
                  <div key={i} className="rounded-xl p-4 space-y-2 border"
                    style={{ background: '#1d2022', borderColor: '#272a2c' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center border"
                      style={{ background: c.bg, borderColor: c.border }}>
                      <Icon className="w-4 h-4" style={{ color: c.txt }} />
                    </div>
                    <div>
                      <p className="text-xl font-black text-white tabular-nums">{s.value}</p>
                      <p className="text-[11px]" style={{ color: '#909097' }}>{s.label}</p>
                    </div>
                    <p className="text-[10px] font-bold" style={{ color: '#c3c0ff' }}>{s.delta}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* INTERACTIVE MODULE CAROUSEL & PREVIEWS */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
            <div className="mb-4">
              <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                Instant Access Modules
              </h2>
              <p className="text-xs mt-1" style={{ color: '#909097' }}>
                Click any screen thumbnail below to launch the live module instantly right on this URL
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Phone Frame */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-[250px]">
                  <div className="rounded-[36px] border-[8px] border-[#272a2c] bg-[#0b0f10] shadow-2xl overflow-hidden">
                    <div className="h-6 bg-[#0b0f10] flex items-center justify-center">
                      <div className="w-16 h-1.5 rounded-full bg-[#272a2c]" />
                    </div>
                    <div className="relative overflow-hidden" style={{ height: '460px' }}>
                      <Image
                        src={SCREENS[activeScreen].src}
                        alt={SCREENS[activeScreen].label}
                        fill
                        className="object-cover object-top"
                        priority
                        sizes="250px"
                        unoptimized
                      />
                    </div>
                    <div className="h-5 bg-[#0b0f10] flex items-center justify-center">
                      <div className="w-20 h-1 rounded-full bg-[#272a2c]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Module Buttons */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'new-complaint', title: 'AI Intake Portal', desc: 'Voice, text, image, multi-language complaint submission', icon: PlusCircle },
                    { id: 'citizen', title: 'Citizen Dashboard', desc: 'Track reports, view timelines & resolution proof', icon: Users },
                    { id: 'officer', title: 'Officer Queue', desc: 'SLA priority list, location navigation & resolution upload', icon: Navigation },
                    { id: 'executive', title: 'Commissioner Control', desc: 'City-wide SLA adherence, escalations & department KPIs', icon: Award },
                    { id: 'admin', title: 'Super Admin', desc: 'AI review queue, category appeals & user RBAC management', icon: UserCheck },
                    { id: 'map', title: 'GIS Heatmap', desc: 'Interactive map clusters, ward boundaries & officer tracking', icon: MapPin },
                    { id: 'analytics', title: 'Analytics', desc: 'Hotspot analysis, trend graphs & PDF export reports', icon: BarChart2 },
                    { id: 'privacy', title: 'Privacy Center', desc: 'DPDPA consent settings, PII redaction & audit logs', icon: Lock },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setActiveTab(m.id as any)}
                        className="p-3.5 rounded-xl border text-left transition-all group hover:-translate-y-0.5"
                        style={{ background: '#1d2022', borderColor: '#272a2c' }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className="w-4 h-4 text-cyan-400 group-hover:text-white transition-colors" />
                          <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">{m.title}</span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: '#909097' }}>{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* LIVE FEED + AI PIPELINE */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Feed */}
              <div className="lg:col-span-7 rounded-xl border p-5 space-y-4"
                style={{ background: '#1d2022', borderColor: '#272a2c' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-extrabold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" /> Live Complaint Feed
                  </h2>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded border"
                    style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee', borderColor: 'rgba(6,182,212,0.25)' }}>
                    REAL-TIME
                  </span>
                </div>

                <div className="space-y-2">
                  {LIVE_COMPLAINTS.map((c, i) => (
                    <button key={c.id} onClick={() => setActiveFeed(i)}
                      className="w-full p-3 rounded-xl border text-left transition-all"
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
                          <p className="text-[11px] flex items-center gap-1" style={{ color: '#909097' }}>
                            <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#45464d' }} /> {c.ward}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_PILL[c.status]}`}>
                            {c.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: '#c3c0ff' }}>
                            {c.ai}% Conf.
                          </span>
                        </div>
                      </div>
                      {activeFeed === i && (
                        <div className="mt-2">
                          <Bar pct={c.ai} active />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Models */}
              <div className="lg:col-span-5 rounded-xl border p-5 space-y-3"
                style={{ background: '#1d2022', borderColor: '#272a2c' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-extrabold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" /> AI Inference Models
                  </h2>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded border"
                    style={{ background: 'rgba(99,86,251,0.1)', color: '#c3c0ff', borderColor: 'rgba(99,86,251,0.3)' }}>
                    ACTIVE
                  </span>
                </div>

                <div className="space-y-2">
                  {AI_MODELS.map((m, i) => (
                    <div key={i} className="p-2.5 rounded-xl border space-y-1.5"
                      style={{ background: '#191c1e', borderColor: '#272a2c' }}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{m.name}</span>
                        <span className="text-[10px] font-mono text-cyan-400">{m.pct}%</span>
                      </div>
                      <Bar pct={m.pct} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t mt-auto" style={{ borderColor: '#272a2c', background: '#101415' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold" style={{ color: '#bcc7de' }}>Civic Pulse OS · Community Redressal Planner</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: '#45464d' }}>
            <Leaf className="w-3 h-3 text-emerald-400" />
            <span>Single-URL Multi-Module Platform · Swachh Bharat & DPDPA Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
