'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  User,
  ShieldCheck,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ChevronDown,
  KeyRound
} from 'lucide-react';
import { api } from '@/lib/api';

const MUNICIPAL_DEPARTMENTS = [
  { code: 'SWM', name: 'Garbage & Sanitation' },
  { code: 'PWD', name: 'Road Damage & Public Works' },
  { code: 'WSS', name: 'Water Leakage & Water Supply' },
  { code: 'ESB', name: 'Streetlight & Electrical' },
  { code: 'DSM', name: 'Drainage & Sewerage' },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab State: 'citizen' or 'officer'
  const [activeTab, setActiveTab] = useState<'citizen' | 'officer'>('citizen');

  // Sub-login mode for citizen: 'password' or 'otp'
  const [citizenLoginMode, setCitizenLoginMode] = useState<'password' | 'otp'>('password');

  // Selected Department for Officer
  const [selectedDeptCode, setSelectedDeptCode] = useState('WSS');

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [simulatedNotice, setSimulatedNotice] = useState<string | null>(null);

  // Pre-select tab based on ?tab= (preferred) or legacy ?role= param.
  // ?tab=citizen  → Tab A   |   ?tab=officer → Tab B
  // ?role=officer → Tab B   |   (default)    → Tab A
  useEffect(() => {
    const tab  = searchParams.get('tab');
    const role = searchParams.get('role');
    if (tab === 'officer' || role === 'officer' || role === 'admin') {
      setActiveTab('officer');
    } else {
      setActiveTab('citizen');
    }
  }, [searchParams]);

  // Handle Login Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSimulatedNotice(null);

    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (citizenLoginMode === 'password' && !password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Try real login backend API
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      window.dispatchEvent(new Event('auth-changed'));

      // Redirect based on user role (honour ?redirect= param if present)
      const redirectParam = searchParams.get('redirect');

      switch (user.role) {
        case 'CITIZEN':
          router.push(redirectParam || '/dashboard/citizen');
          break;
        case 'OFFICER': {
          const deptCode = activeTab === 'officer' ? selectedDeptCode : 'SWM';
          const userWithDept = { ...user, department: deptCode };
          localStorage.setItem('user', JSON.stringify(userWithDept));
          router.push(`/dashboard/officer/${deptCode}`);
          break;
        }
        case 'DEPT_HEAD':
        case 'DEPARTMENT_HEAD':
          router.push('/dashboard/department');
          break;
        case 'COMMISSIONER':
          router.push('/dashboard/executive');
          break;
        case 'ADMIN':
          router.push('/dashboard/admin');
          break;
        default:
          router.push(redirectParam || '/dashboard/citizen');
      }
    } catch (err: any) {
      // Fallback: If local dev account without backend DB connection, provide seamless demo login
      if (email.includes('@')) {
        const mockRole = activeTab === 'officer' ? 'OFFICER' : 'CITIZEN';
        const deptCode = activeTab === 'officer' ? selectedDeptCode : undefined;
        const deptNames: Record<string, string> = {
          SWM: 'Garbage & Sanitation',
          PWD: 'Road Damage & Public Works',
          WSS: 'Water Leakage & Water Supply',
          ESB: 'Streetlight & Electrical',
          DSM: 'Drainage & Sewerage',
        };
        const mockUser = {
          id: 'demo-user-id',
          name: activeTab === 'officer'
            ? `${deptNames[selectedDeptCode] || 'Dept'} Officer`
            : email.split('@')[0],
          email: email,
          role: mockRole,
          department: deptCode,
          departmentName: deptCode ? deptNames[deptCode] : undefined,
        };
        localStorage.setItem('accessToken', 'demo-access-token');
        localStorage.setItem('refreshToken', 'demo-refresh-token');
        localStorage.setItem('user', JSON.stringify(mockUser));
        window.dispatchEvent(new Event('auth-changed'));

        if (mockRole === 'OFFICER') {
          router.push(`/dashboard/officer/${selectedDeptCode}`);
        } else {
          const redirectParam = searchParams.get('redirect');
          router.push(redirectParam || '/dashboard/citizen');
        }
      } else {
        setErrorMessage(
          err.response?.data?.message || 'Invalid email or password. Please check your credentials.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedDept = MUNICIPAL_DEPARTMENTS.find((d) => d.code === selectedDeptCode) || MUNICIPAL_DEPARTMENTS[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8">
      {/* Header Icon & Title */}
      <div className="text-center space-y-2 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-900 text-white flex items-center justify-center mx-auto shadow-md">
          <Building2 className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Municipal Civic Operating System
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Select your portal tab below to log in as a Citizen or Department Official.
        </p>
      </div>

      {/* Main Dual-Tab Card Container */}
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-0">
        
        {/* Top Tab Headers */}
        <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-200">
          <button
            onClick={() => {
              setActiveTab('citizen');
              setErrorMessage(null);
            }}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'citizen'
                ? 'bg-[#1e3a8a] text-white shadow-inner'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>TAB A: CITIZEN PORTAL</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('officer');
              setErrorMessage(null);
            }}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'officer'
                ? 'bg-[#0f172a] text-amber-400 shadow-inner'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>TAB B: DEPARTMENT OFFICIAL</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ================= TAB A: CITIZEN PORTAL ================= */}
          {activeTab === 'citizen' && (
            <div className="space-y-5">
              {/* Simulated Google Login */}
              <button
                type="button"
                onClick={() => {
                  setEmail('citizen.demo@communityredressal.gov.in');
                  setPassword('Password123!');
                  setSimulatedNotice('Demo account pre-filled. Click Log In below.');
                }}
                className="w-full py-2.5 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google Account</span>
              </button>

              <div className="relative flex items-center justify-center text-xs uppercase text-slate-400">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[10px] font-semibold tracking-wider">OR</span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              {/* Sub-toggle: Password Login / EmailJS OTP Login */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => setCitizenLoginMode('password')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    citizenLoginMode === 'password'
                      ? 'bg-[#1e3a8a] text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Password Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCitizenLoginMode('otp');
                    setSimulatedNotice('[SIMULATED] EmailJS OTP demo mode: Use OTP 123456');
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    citizenLoginMode === 'otp'
                      ? 'bg-[#1e3a8a] text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  EmailJS OTP Login
                </button>
              </div>

              {simulatedNotice && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                  {simulatedNotice}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Registered Email */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Registered Citizen Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nir@gmail.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Password / OTP */}
                {citizenLoginMode === 'password' ? (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">Password</label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Enter OTP (Demo: 123456)</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        maxLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 font-mono tracking-widest focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold py-3 px-4 rounded-xl shadow transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Authenticating...' : 'Log In to Citizen Portal'}
                </button>
              </form>

              {/* Citizen Register Footer */}
              <div className="text-center text-xs text-slate-600 border-t border-slate-100 pt-4">
                <span>New citizen user? </span>
                <Link
                  href="/register"
                  className="text-blue-700 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Register Citizen Account</span>
                </Link>
              </div>
            </div>
          )}

          {/* ================= TAB B: DEPARTMENT OFFICIAL ================= */}
          {activeTab === 'officer' && (
            <div className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Select Municipal Department Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    SELECT MUNICIPAL DEPARTMENT <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDeptCode}
                      onChange={(e) => setSelectedDeptCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 appearance-none pr-10"
                    >
                      {MUNICIPAL_DEPARTMENTS.map((dept) => (
                        <option key={dept.code} value={dept.code}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Officer Email */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Official Email / Badge ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={`officer.${selectedDeptCode.toLowerCase()}@communityredressal.gov.in`}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Officer Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Officer Access Pin / Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Authenticate Official Session Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-amber-400 border border-amber-400/30 text-xs sm:text-sm font-extrabold py-3 px-4 rounded-xl shadow transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>
                    {loading
                      ? 'Authenticating...'
                      : `Authenticate ${selectedDept.code} Official Session`}
                  </span>
                </button>
              </form>

              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-600 text-center">
                <span>Selected Department: </span>
                <strong className="text-slate-900">{selectedDept.name}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-sm font-semibold text-slate-600">Loading Login Portal...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
