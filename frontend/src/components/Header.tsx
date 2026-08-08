'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { 
  ShieldCheck, 
  Eye, 
  Phone, 
  Building2, 
  MapPin, 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  LogIn,
  LogOut,
  User,
  ShieldAlert,
  Menu,
  X
} from 'lucide-react';

export default function Header() {
  const { data: session, status } = useSession();
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = status === 'authenticated' && session?.user;
  const userRole = (session?.user as any)?.role || 'CITIZEN';
  const userName = session?.user?.name || session?.user?.email || 'User';

  return (
    <header className="w-full bg-slate-900 text-white border-b-4 border-blue-900 shadow-md">
      {/* Top Utility Accessibility Bar */}
      <div className="bg-slate-950 text-slate-300 text-xs py-1.5 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3 text-center sm:text-left">
            <span className="font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 text-[11px] sm:text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Civic Operating System
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline text-slate-400">Public Grievance Portal</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Toll-Free: <strong>1800-11-2026</strong></span>
            </div>
            <span className="text-slate-600">|</span>
            {/* Accessibility Controls */}
            <div className="flex items-center gap-1" aria-label="Accessibility Font Size Controls">
              <span className="text-[10px] sm:text-[11px] text-slate-400 mr-1 hidden xs:inline flex items-center gap-0.5">
                <Eye className="w-3 h-3" /> Font:
              </span>
              <button 
                onClick={() => setFontSize('sm')} 
                className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs border ${fontSize === 'sm' ? 'bg-blue-800 text-white border-blue-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                aria-label="Decrease Font Size"
              >
                A-
              </button>
              <button 
                onClick={() => setFontSize('base')} 
                className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs border ${fontSize === 'base' ? 'bg-blue-800 text-white border-blue-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                aria-label="Reset Font Size"
              >
                A
              </button>
              <button 
                onClick={() => setFontSize('lg')} 
                className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs border ${fontSize === 'lg' ? 'bg-blue-800 text-white border-blue-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                aria-label="Increase Font Size"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex justify-between items-center gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-700 to-slate-900 rounded-lg flex items-center justify-center border border-blue-500 shadow-inner shrink-0">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Community Redressal Planner
            </h1>
            <p className="text-[10px] sm:text-xs text-blue-300 font-medium">
              Municipal Governance Operating System
            </p>
          </div>
        </Link>

        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
          {!isAuthenticated ? (
            <Link 
              href="/login" 
              className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 border border-amber-500 shadow-sm transition-colors focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
            >
              <LogIn className="w-4 h-4" /> Portal Access / Sign In
            </Link>
          ) : (
            <>
              {userRole === 'CITIZEN' && (
                <>
                  <Link 
                    href="/submit" 
                    className="px-3.5 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 border border-blue-500 shadow-sm transition-colors text-xs font-semibold"
                  >
                    <FileText className="w-4 h-4" /> File Grievance
                  </Link>

                  <Link 
                    href="/dashboard/citizen" 
                    className="px-3.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center gap-1.5 border border-slate-700 transition-colors text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> My Grievances
                  </Link>
                </>
              )}

              {userRole === 'OFFICER' && (
                <Link 
                  href="/dashboard/officer" 
                  className="px-3.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center gap-1.5 border border-slate-700 transition-colors text-xs font-semibold"
                >
                  <MapPin className="w-4 h-4 text-amber-400" /> Officer GIS Queue
                </Link>
              )}

              {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
                <>
                  <Link 
                    href="/dashboard/admin" 
                    className="px-3.5 py-2 rounded-md bg-purple-900 hover:bg-purple-950 text-white flex items-center gap-1.5 border border-purple-700 transition-colors text-xs font-semibold"
                  >
                    <ShieldAlert className="w-4 h-4 text-purple-300" /> Admin Governance
                  </Link>

                  <Link 
                    href="/analytics" 
                    className="px-3.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center gap-1.5 border border-slate-700 transition-colors text-xs font-semibold"
                  >
                    <BarChart3 className="w-4 h-4 text-sky-400" /> Analytics
                  </Link>
                </>
              )}

              {/* User Session Badge & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <span className="text-xs text-slate-300 flex items-center gap-1 font-medium bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span className="truncate max-w-[120px]">{userName}</span>
                  <span className="text-[10px] font-bold uppercase bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded ml-1">
                    {userRole}
                  </span>
                </span>

                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </>
          )}
        </nav>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-t border-slate-800 px-4 py-4 space-y-3 animate-in slide-in-from-top">
          {!isAuthenticated ? (
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)}
              className="w-full px-4 py-2.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-2 border border-amber-500 shadow-sm text-sm"
            >
              <LogIn className="w-4 h-4" /> Portal Access / Sign In
            </Link>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded border border-slate-800 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-slate-200 text-xs">{userName}</span>
                </div>
                <span className="text-[10px] font-bold uppercase bg-blue-900 text-blue-200 px-2 py-0.5 rounded">
                  {userRole}
                </span>
              </div>

              {userRole === 'CITIZEN' && (
                <>
                  <Link 
                    href="/submit" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-2 border border-blue-500 text-xs font-semibold"
                  >
                    <FileText className="w-4 h-4" /> File New Grievance
                  </Link>

                  <Link 
                    href="/dashboard/citizen" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-100 flex items-center gap-2 border border-slate-800 text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> My Grievances
                  </Link>
                </>
              )}

              {userRole === 'OFFICER' && (
                <Link 
                  href="/dashboard/officer" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-100 flex items-center gap-2 border border-slate-800 text-xs font-semibold"
                >
                  <MapPin className="w-4 h-4 text-amber-400" /> Officer GIS Queue
                </Link>
              )}

              {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
                <>
                  <Link 
                    href="/dashboard/admin" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-md bg-purple-900 hover:bg-purple-950 text-white flex items-center gap-2 border border-purple-700 text-xs font-semibold"
                  >
                    <ShieldAlert className="w-4 h-4 text-purple-300" /> Admin Governance
                  </Link>

                  <Link 
                    href="/analytics" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-100 flex items-center gap-2 border border-slate-800 text-xs font-semibold"
                  >
                    <BarChart3 className="w-4 h-4 text-sky-400" /> Analytics
                  </Link>
                </>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: '/login' });
                }}
                className="w-full mt-2 px-3.5 py-2.5 rounded-md bg-red-950 hover:bg-red-900 text-red-200 flex items-center justify-center gap-2 border border-red-800 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-400" /> Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
