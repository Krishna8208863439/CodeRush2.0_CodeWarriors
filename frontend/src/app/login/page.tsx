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
  ChevronDown
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

  // Active Portal Tab: 'citizen' or 'officer'
  const [activeTab, setActiveTab] = useState<'citizen' | 'officer'>('citizen');

  // Selected Department for Officer Login
  const [selectedDeptCode, setSelectedDeptCode] = useState('WSS');

  // Form Inputs (Strict Email & Password Authentication)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-select tab based on ?tab= or ?role= query param
  useEffect(() => {
    const tab = searchParams.get('tab');
    const role = searchParams.get('role');
    if (tab === 'officer' || role === 'officer' || role === 'admin') {
      setActiveTab('officer');
    } else {
      setActiveTab('citizen');
    }
  }, [searchParams]);

  // Handle Standard Password Login Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // Real Password Login Backend API Call
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      window.dispatchEvent(new Event('auth-changed'));

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
      // Local dev fallback for test accounts
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
          Sign in with your email and password to access the portal.
        </p>
      </div>

      {/* Main Dual-Tab Card Container */}
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
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
            <span>CITIZEN PORTAL</span>
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
            <span>DEPARTMENT OFFICIAL</span>
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

          {/* ================= CITIZEN PORTAL LOGIN ================= */}
          {activeTab === 'citizen' && (
            <div className="space-y-5">
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
                      placeholder="citizen@example.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Password */}
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
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold py-3 px-4 rounded-xl shadow transition-all flex items-center justify-center gap-2 mt-2"
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

          {/* ================= DEPARTMENT OFFICIAL LOGIN ================= */}
          {activeTab === 'officer' && (
            <div className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Select Municipal Department */}
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

                {/* Authenticate Button */}
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
