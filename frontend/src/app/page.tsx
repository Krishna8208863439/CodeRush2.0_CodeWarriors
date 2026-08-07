'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  ShieldCheck, Activity, Cpu, MapPin, BarChart2, Users,
  CheckCircle2, ArrowRight, AlertTriangle, PlusCircle, HelpCircle,
  Lock, LayoutDashboard, Building2, UserCheck, Navigation, ChevronRight,
  Clock, FileText, CheckCircle
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

// ── Mock Feed Data ────────────────────────────────────────────────────────────
const MOCK_FEED = [
  { id: 'CVG-8924', category: 'Road Damage',    location: 'Ward 4 – Arterial Route', status: 'IN_PROGRESS', priority: 'Critical', confidence: 98, sla: '1h 45m left' },
  { id: 'CVG-8910', category: 'Fallen Tree',    location: 'Ward 2 – Park Pathway',  status: 'ASSIGNED',    priority: 'High',     confidence: 85, sla: '8h 30m left' },
  { id: 'CVG-8897', category: 'Street Light',   location: 'Ward 7 – Main Crossing', status: 'ASSIGNED',    priority: 'Medium',   confidence: 92, sla: '11h 15m left' },
  { id: 'CVG-8810', category: 'Garbage Dump',   location: 'Ward 9 – Market Square', status: 'RESOLVED',    priority: 'Low',      confidence: 88, sla: 'Resolved' },
];

const METRICS = [
  { label: 'Total Reports Today',  value: '1,248', change: '+12% vs last week', icon: Activity },
  { label: 'SLA Adherence Rate',   value: '87.4%', change: 'Target: 85.0%',    icon: CheckCircle2 },
  { label: 'Active Field Officers', value: '42',    change: 'Across 5 wards',   icon: Users },
  { label: 'Critical Escalations', value: '14',    change: 'Requires action',   icon: AlertTriangle },
];

const SCREENS = [
  { src: '/screen-citizen.png', label: 'Citizen Portal', tabId: 'citizen', desc: 'File reports, track timeline & view officer resolution proof.' },
  { src: '/screen-officer.png', label: 'Officer Queue', tabId: 'officer', desc: 'SLA-sorted priority queue with GPS location & proof upload.' },
  { src: '/screen-admin.png', label: 'Control Tower', tabId: 'executive', desc: 'Commissioner analytics, SLA adherence gauges & ward heatmaps.' },
  { src: '/screen-auth.png', label: 'Secure Auth Portal', tabId: 'privacy', desc: 'Role-based login, mobile OTP authentication & privacy consent.' },
];

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs text-gray-500">{time} IST</span>;
}

export default function FlatMinimalCivicPulseOS() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'new-complaint' | 'citizen' | 'officer' | 'department' | 'executive' | 'admin' | 'map' | 'analytics' | 'privacy' | 'help'
  >('overview');

  const [activeScreen, setActiveScreen] = useState(0);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1f2937] font-sans antialiased">
      {/* ── TOP NAVBAR ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-2.5 text-left hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base text-gray-900 leading-tight block">Community Redressal</span>
                <span className="text-xs text-gray-500 font-medium">Civic Operating System</span>
              </div>
            </button>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'new-complaint', label: 'File Complaint', icon: PlusCircle },
              { id: 'citizen', label: 'Citizen', icon: Users },
              { id: 'officer', label: 'Officer', icon: Navigation },
              { id: 'department', label: 'Dept Head', icon: Building2 },
              { id: 'executive', label: 'Commissioner', icon: BarChart2 },
              { id: 'admin', label: 'Admin', icon: UserCheck },
              { id: 'map', label: 'GIS Map', icon: MapPin },
              { id: 'analytics', label: 'Analytics', icon: Activity },
              { id: 'privacy', label: 'Privacy', icon: Lock },
              { id: 'help', label: 'Help', icon: HelpCircle },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Primary Action Button */}
          <div className="shrink-0 hidden md:flex items-center gap-3">
            <LiveClock />
            <button
              onClick={() => setActiveTab('new-complaint')}
              className="btn-primary"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Complaint</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── DYNAMIC MODULE VIEW ───────────────────────────────────────────── */}
      {activeTab === 'new-complaint' && (
        <div className="py-6 max-w-7xl mx-auto px-4"><NewComplaintPage /></div>
      )}

      {activeTab === 'citizen' && (
        <div className="py-6 max-w-7xl mx-auto px-4"><CitizenDashboard /></div>
      )}

      {activeTab === 'officer' && (
        <div className="py-6 max-w-7xl mx-auto px-4"><OfficerDashboard /></div>
      )}

      {activeTab === 'department' && (
        <div className="py-6 max-w-7xl mx-auto px-4"><DepartmentDashboard /></div>
      )}

      {activeTab === 'executive' && (
        <div className="py-6 max-w-7xl mx-auto px-4"><ExecutiveDashboard /></div>
      )}

      {activeTab === 'admin' && (
        <div className="py-6 max-w-7xl mx-auto px-4"><AdminDashboard /></div>
      )}

      {activeTab === 'map' && (
        <div className="py-6 max-w-7xl mx-auto px-4"><MapPage /></div>
      )}

      {activeTab === 'analytics' && (
        <div className="py-6 max-w-7xl mx-auto px-4"><AnalyticsPage /></div>
      )}

      {activeTab === 'privacy' && (
        <div className="py-6 max-w-7xl mx-auto px-4"><PrivacyCenterPage /></div>
      )}

      {activeTab === 'help' && (
        <div className="py-6 max-w-7xl mx-auto px-4"><HelpPage /></div>
      )}

      {/* ── OVERVIEW LANDING VIEW ────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">

          {/* HERO SECTION */}
          <section className="bg-white border border-gray-200 rounded-xl p-8 md:p-12 text-center space-y-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
              AI-Powered Municipal Grievance Platform
            </span>

            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight max-w-3xl mx-auto leading-tight">
              Community Redressal Planner
            </h1>

            <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Accept grievances in text, voice, or images across 7 Indian languages.
              AI automatically classifies issues, merges duplicates, predicts priorities, and enforces SLA timelines.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab('new-complaint')}
                className="btn-primary text-base px-6 py-3"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Submit a Complaint</span>
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className="btn-secondary text-base px-6 py-3"
              >
                <MapPin className="w-5 h-5 text-gray-500" />
                <span>View Live GIS Map</span>
              </button>
            </div>
          </section>

          {/* KEY METRICS */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICS.map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="card-flat p-5 space-y-2">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{m.label}</span>
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{m.value}</p>
                  <p className="text-xs font-medium text-gray-500">{m.change}</p>
                </div>
              );
            })}
          </section>

          {/* PLATFORM SCREENSHOTS CAROUSEL */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Platform Screens & Workflows</h2>
              <p className="text-sm text-gray-500 mt-1">Select a screen preview to open the live interactive module</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Screen Display */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-[260px] border border-gray-300 rounded-2xl bg-white p-2 shadow-sm">
                  <div className="relative rounded-xl overflow-hidden" style={{ height: '460px' }}>
                    <Image
                      src={SCREENS[activeScreen].src}
                      alt={SCREENS[activeScreen].label}
                      fill
                      className="object-cover object-top"
                      priority
                      unoptimized
                    />
                  </div>
                </div>
              </div>

              {/* Selector List */}
              <div className="lg:col-span-7 space-y-3">
                {SCREENS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveScreen(i);
                      setActiveTab(s.tabId as any);
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-4 ${
                      activeScreen === i
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 text-sm">{s.label}</h3>
                        <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                          Open <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* LIVE COMPLAINT FEED */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Recent Incident Feed</h2>
                <p className="text-xs text-gray-500">Real-time reports processed by AI classification</p>
              </div>
              <button
                onClick={() => setActiveTab('officer')}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                View Officer Queue <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {MOCK_FEED.map((item) => (
                <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-900">{item.id}</span>
                      <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className={`pill ${
                        item.status === 'RESOLVED' ? 'pill-resolved' :
                        item.status === 'IN_PROGRESS' ? 'pill-progress' : 'pill-assigned'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" /> {item.location}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="text-gray-500">
                      Priority: <strong className="text-gray-900">{item.priority}</strong>
                    </span>
                    <span className="text-gray-500">
                      SLA: <strong className="text-blue-600">{item.sla}</strong>
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                      {item.confidence}% AI Confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </main>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-gray-700">Community Redressal Planner</span>
            <span>— AI Civic Operating System</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTab('privacy')} className="hover:text-gray-900 transition-colors">Privacy Center</button>
            <button onClick={() => setActiveTab('help')} className="hover:text-gray-900 transition-colors">Help Center</button>
            <a href="http://localhost:3001/complaints/open-data" target="_blank" rel="noreferrer" className="hover:text-gray-900 transition-colors">Open Data API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
