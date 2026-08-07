'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Building2, ArrowRight, Layers, Zap, Clock,
  CheckCircle2, FileText, Users, MapPin, BarChart2,
  LogIn, LogOut, PhoneCall, Globe, UserCircle2, ShieldAlert,
} from 'lucide-react';
import { homepageContent } from '@/config/homepageContent';

export default function GovernmentCivicHomePage() {
  const { topBar, navHeader, hero, stats, modulesHeading, modules } = homepageContent;
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    }
    const onAuth = () => {
      const s = localStorage.getItem('user');
      try { setUser(s ? JSON.parse(s) : null); } catch { setUser(null); }
    };
    window.addEventListener('auth-changed', onAuth);
    return () => window.removeEventListener('auth-changed', onAuth);
  }, []);

  function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('auth-changed'));
    router.push('/');
  }

  function dashboardHref(): string {
    if (!user) return '/login';
    switch (user.role) {
      case 'CITIZEN':        return '/dashboard/citizen';
      case 'OFFICER':        return `/dashboard/officer/${user.department ?? 'SWM'}`;
      case 'DEPARTMENT_HEAD':return '/dashboard/department';
      case 'COMMISSIONER':   return '/dashboard/executive';
      case 'ADMIN':          return '/dashboard/admin';
      default:               return '/dashboard/citizen';
    }
  }

  const renderStatIcon = (name: string) => {
    const s = 'w-5 h-5';
    switch (name) {
      case 'Layers':      return <Layers       className={`${s} text-blue-600`} />;
      case 'Zap':         return <Zap          className={`${s} text-purple-600`} />;
      case 'Clock':       return <Clock        className={`${s} text-emerald-600`} />;
      case 'CheckCircle': return <CheckCircle2 className={`${s} text-teal-600`} />;
      default:            return <Layers       className={s} />;
    }
  };

  const renderModuleIcon = (name: string) => {
    const s = 'w-5 h-5';
    switch (name) {
      case 'FileText':  return <FileText  className={s} />;
      case 'Users':     return <Users     className={s} />;
      case 'MapPin':    return <MapPin    className={s} />;
      case 'BarChart2': return <BarChart2 className={s} />;
      default:          return <FileText  className={s} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col w-full">

      {/* ── 1. TOP UTILITY BAR ───────────────────────────────────────── */}
      <div className="bg-[#0a0f1d] text-slate-300 text-[11px] py-1.5 px-4 sm:px-8 border-b border-slate-800 w-full">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-bold tracking-wide uppercase text-slate-200">{topBar.systemLabel}</span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline text-slate-400">{topBar.subLabel}</span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <div className="flex items-center gap-1">
              <PhoneCall className="w-3 h-3 text-slate-400" />
              <span>{topBar.helpline}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>Accessibility:</span>
              <div className="flex gap-1 font-semibold text-slate-300">
                {topBar.accessibility.map((a, i) => (
                  <span key={i} className="hover:text-blue-400 cursor-pointer">{a}</span>
                ))}
              </div>
            </div>

            {/* Login entry points — only when logged out */}
            {!user && (
              <>
                <span className="text-slate-700">|</span>
                <Link
                  href="/login?tab=citizen"
                  className="flex items-center gap-1 text-slate-300 hover:text-white font-semibold transition-colors"
                  aria-label="Citizen Login"
                >
                  <UserCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Citizen Login</span>
                </Link>
                <span className="text-slate-700">|</span>
                <Link
                  href="/login?tab=officer"
                  className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                  aria-label="Officer / Admin Login"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Officer&nbsp;/&nbsp;Admin Login</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. MAIN NAV HEADER ───────────────────────────────────────── */}
      <header className="bg-[#0f172a] text-white py-3.5 px-4 sm:px-8 shadow-md border-b border-slate-800 w-full">
        <div className="w-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight text-white">
                {navHeader.title}
              </h1>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">{navHeader.subtitle}</p>
            </div>
          </Link>

          {/* Logged-in: name + dashboard link + logout. Logged-out: two login buttons. */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={dashboardHref()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>{user.name} — Dashboard</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login?tab=citizen"
                className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow transition-all"
              >
                <UserCircle2 className="w-4 h-4" />
                <span className="hidden sm:inline">Citizen Login</span>
                <span className="sm:hidden">Login</span>
              </Link>
              <Link
                href="/login?tab=officer"
                className="bg-[#0f172a] hover:bg-[#1e293b] border border-amber-400/40 text-amber-400 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow transition-all"
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="hidden sm:inline">Officer&nbsp;/&nbsp;Admin</span>
                <span className="sm:hidden">Official</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">

        {/* ── 3. HERO BANNER ─────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 w-full">
          <div className="space-y-3 max-w-5xl">
            <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{hero.badge}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
              {hero.headline}
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-relaxed">
              {hero.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-64 shrink-0">
            {/*
              "Submit Grievance" CTA:
              - Logged in  → go straight to /complaints/new
              - Logged out → go to /login?tab=citizen&redirect=/complaints/new
                             (the login page will redirect back after auth)
            */}
            <Link
              href={user ? '/complaints/new' : '/login?tab=citizen&redirect=/complaints/new'}
              className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-xs sm:text-sm px-5 py-3.5 rounded-xl flex items-center justify-between gap-3 shadow transition-colors w-full"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-300" />
                <span>{hero.primaryCta.label}</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href={hero.secondaryCta.href}
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold text-xs sm:text-sm px-5 py-3.5 rounded-xl flex items-center gap-2 shadow border border-slate-800 transition-colors w-full"
            >
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>{hero.secondaryCta.label}</span>
            </Link>
          </div>
        </section>

        {/* ── 4. STATS STRIP ─────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                {renderStatIcon(stat.iconName)}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">{stat.label}</span>
                <span className={`text-2xl font-extrabold ${stat.color || 'text-slate-900'}`}>{stat.value}</span>
              </div>
            </div>
          ))}
        </section>

        {/* ── 5. CIVIC GOVERNANCE MODULES ────────────────────────────── */}
        <section className="space-y-4 w-full">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            <h3>{modulesHeading}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {modules.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-blue-400 transition-all duration-150 shadow-sm"
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${item.iconBg}`}>
                    {renderModuleIcon(item.iconName)}
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{item.numberPrefix} {item.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{item.description}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <Link
                    href={item.linkHref}
                    className="text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 transition-colors"
                  >
                    <span>{item.linkText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="bg-[#0f172a] text-slate-400 text-xs py-4 px-6 border-t border-slate-800 mt-auto w-full">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-2 text-center sm:text-left">
          <p>© {new Date().getFullYear()} Community Redressal Planner. All rights reserved.</p>
          <p className="text-[11px] text-slate-500">
            Ministry of Urban Development &amp; Municipal Governance · Civic Operating System
          </p>
        </div>
      </footer>
    </div>
  );
}
