'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'CITIZEN' | 'OFFICER' | 'SUPER_ADMIN'>('CITIZEN');
  
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    // STEP 4: Add validation to ensure Password and Confirm Password match before submitting
    if (password !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Passwords do not match. Please verify your password entries.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    const payload = {
      name: name.trim(),
      full_name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role
    };

    try {
      // Call Next.js backend registration API route
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok || res.status === 201) {
        setStatusMsg({ type: 'success', text: 'Account registered successfully! Redirecting to login...' });
        setTimeout(() => {
          router.push('/login');
        }, 1200);
      } else {
        // STEP 4: Correctly display dynamic backend errors (e.g., "Email already registered.")
        setStatusMsg({ 
          type: 'error', 
          text: data.error || 'Registration failed. Please check your details and try again.' 
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Network error occurred during registration.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      {/* 
        STEP 2: LEFT SIDE (Hidden on mobile, 50% width on desktop)
        Deep navy blue (bg-slate-900) section containing official logo, portal title, and short paragraph
      */}
      <div className="hidden md:flex w-1/2 min-h-screen bg-slate-900 text-white flex-col justify-center items-center p-8 lg:p-12 text-center border-r border-slate-800 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md space-y-6 relative z-10 my-auto">
          {/* Government Logo / Emblem */}
          <div className="w-20 h-20 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto shadow-inner text-blue-400">
            <Building2 className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-900/60 border border-blue-500/40 text-[11px] font-bold uppercase tracking-wider text-blue-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Civic Account Provisioning
            </div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
              Community Redressal Planner
            </h1>
            <p className="text-sm font-semibold text-blue-300">
              AI Civic Operating System
            </p>
          </div>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-normal">
            Enterprise civic governance platform with real-time AI entity extraction, postgis spatial dispatch, sentence transformer duplicate grouping, and complete audit trail transparency.
          </p>

          <div className="pt-6 border-t border-slate-800 flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Relational DB Encryption
            </span>
            <span>•</span>
            <span>Audited Governance</span>
          </div>
        </div>
      </div>

      {/* 
        STEP 2: RIGHT SIDE (100% width on mobile, 50% on desktop)
        Clean white (bg-white) section with centered Register form
      */}
      <div className="w-full md:w-1/2 min-h-screen bg-white flex flex-col justify-between p-6 sm:p-10">
        {/* Top Back Link */}
        <div className="w-full max-w-sm mx-auto flex justify-between items-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 text-blue-700" /> Back to Sign In
          </Link>
        </div>

        {/* Centered Signup Form */}
        <div className="w-full max-w-sm mx-auto my-auto space-y-5">
          <div className="space-y-1 text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Create Account
            </h2>
            <p className="text-xs text-slate-500">
              Register your citizen or officer profile on the Civic Operating System.
            </p>
          </div>

          {/* STEP 4: Dynamic Backend Error Display Banner */}
          {statusMsg && (
            <div className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center gap-2.5 ${
              statusMsg.type === 'error' ? 'bg-red-50 text-red-900 border-red-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}>
              {statusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Full Name <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ayaj Javed Latkar"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Email Address <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="citizen@gov.in"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Password & Confirm Password Inputs matching clean styling focus:ring-2 focus:ring-blue-600 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Confirm Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Account Role <span className="text-red-600">*</span>
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="CITIZEN">Citizen User</option>
                <option value="OFFICER">Department Officer</option>
                <option value="SUPER_ADMIN">System Administrator</option>
              </select>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Register Account →'}
            </button>
          </form>

          {/* Sign In link */}
          <div className="text-center pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-blue-700 hover:underline">
                Sign In here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Micro-copy */}
        <p className="w-full max-w-sm mx-auto text-[10px] text-slate-400 text-center leading-relaxed mt-4">
          By registering, you agree to the Municipal Data Privacy Policy and terms of the IT Act. Protected by 256-bit encryption.
        </p>
      </div>
    </div>
  );
}
