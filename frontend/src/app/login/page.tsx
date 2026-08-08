'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  UserPlus,
  RefreshCw,
  Globe,
  ShieldAlert,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { MUNICIPAL_DEPARTMENTS } from '../../lib/constants';
import { sendOtpEmail } from '../../lib/emailjs';

type Language = 'en' | 'mr' | 'hi';

const TRANSLATIONS = {
  en: {
    portalTitle: 'Community Redressal Planner',
    portalSub: 'AI Civic Operating System',
    leftDesc: 'Enterprise civic governance platform with real-time AI entity extraction, postgis spatial dispatch, sentence transformer duplicate grouping, and complete audit trail transparency.',
    citizenTab: 'Citizen',
    officialTab: 'Official',
    googleBtn: 'Continue with Google',
    dividerText: 'or sign in with email',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    otpLabel: '6-Digit OTP Code',
    sendOtp: 'Send OTP',
    accessCitizen: 'Login',
    newCitizen: 'New citizen user? Register here',
    warningBanner: 'Authorized Personnel Only. All access is logged.',
    selectDepartment: 'Select Department',
    accessOfficial: 'Secure Login',
    complianceFooter: 'Protected by 256-bit encryption under Municipal IT Act regulations.',
  },
  mr: {
    portalTitle: 'कम्युनिटी रिड्रेसल प्लॅनर',
    portalSub: 'एआय नागरी कार्यप्रणाली',
    leftDesc: 'रिअल-टाइम एआय युनिट्स, जिओ-मॅपिंग, तक्रार निवारण आणि संपूर्ण पारदर्शकतेसह आधुनिक शासकीय कार्यप्रणाली.',
    citizenTab: 'नागरिक',
    officialTab: 'अधिकारी',
    googleBtn: 'Google सह पुढे जा',
    dividerText: 'किंवा ईमेलने साइन इन करा',
    emailLabel: 'ईमेल पत्ता',
    passwordLabel: 'पासवर्ड',
    forgotPassword: 'पासवर्ड विसरलात?',
    otpLabel: '६-अंकी ओटीपी कोड',
    sendOtp: 'ओटीपी पाठवा',
    accessCitizen: 'लॉगिन करा',
    newCitizen: 'नवीन नागरिक वापरकर्ता? येथे नोंदणी करा',
    warningBanner: 'फक्त अधिकृत कर्मचाऱ्यांसाठी. सर्व सत्रे नोंदवली जातात.',
    selectDepartment: 'विभाग निवडा',
    accessOfficial: 'सुरक्षित लॉगिन',
    complianceFooter: '२५६-बिट एन्क्रिप्शनसह नागरी आयटी कायद्यांतर्गत सुरक्षित.',
  },
  hi: {
    portalTitle: 'कम्युनिटी रिड्रेसल प्लानर',
    portalSub: 'एआई नागरिक संचालन प्रणाली',
    leftDesc: 'रियल-टाइम एआई श्रेणीकरण, जीआईएस मैपिंग और संपूर्ण पारदर्शिता के साथ एकीकृत सार्वजनिक शिकायत निवारण प्रणाली।',
    citizenTab: 'नागरिक',
    officialTab: 'अधिकारी',
    googleBtn: 'Google के साथ आगे बढ़ें',
    dividerText: 'या ईमेल से साइन इन करें',
    emailLabel: 'ईमेल पता',
    passwordLabel: 'पासवर्ड',
    forgotPassword: 'पासवर्ड भूल गए?',
    otpLabel: '6-अंकों का ओटीपी कोड',
    sendOtp: 'ओटीपी भेजें',
    accessCitizen: 'लॉगिन करें',
    newCitizen: 'नए नागरिक उपयोगकर्ता? यहाँ पंजीकरण करें',
    warningBanner: 'केवल अधिकृत कर्मियों के लिए। सभी पहुँच लॉग की जाती है।',
    selectDepartment: 'विभाग चुनें',
    accessOfficial: 'सुरक्षित लॉगिन',
    complianceFooter: '256-बिट एन्क्रिप्शन द्वारा सुरक्षित नगर निगम आईटी नियम।',
  }
};

function LoginSplitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '';

  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];

  const [activeTab, setActiveTab] = useState<'CITIZEN' | 'OFFICER'>('CITIZEN');
  const [useOtp, setUseOtp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDeptCode, setSelectedDeptCode] = useState('WSS');

  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCitizenPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await signIn('credentials', {
        email,
        password: password || 'password123',
        role: 'CITIZEN',
        redirect: false
      });

      if (res?.error) {
        setStatusMsg({ type: 'error', text: 'Invalid citizen credentials. Check email and password.' });
      } else {
        setStatusMsg({ type: 'success', text: 'Authenticated successfully! Redirecting...' });
        const redirectPath = callbackUrl || '/dashboard/citizen';
        router.push(redirectPath);
        router.refresh();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Authentication error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOfficialPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatusMsg(null);

    const selectedDept = MUNICIPAL_DEPARTMENTS.find(d => d.code === selectedDeptCode) || MUNICIPAL_DEPARTMENTS[0];

    try {
      const res = await signIn('credentials', {
        email,
        password: password || 'officer123',
        role: 'OFFICER',
        departmentId: selectedDept.deptId,
        departmentCode: selectedDept.code,
        redirect: false
      });

      if (res?.error) {
        setStatusMsg({ type: 'error', text: 'Invalid department official credentials.' });
      } else {
        setStatusMsg({ type: 'success', text: `Verified official session for ${selectedDept.code}! Redirecting...` });
        const redirectPath = callbackUrl || `/dashboard/officer?dept=${selectedDept.code}`;
        router.push(redirectPath);
        router.refresh();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Official authentication error.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!email) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid email address first.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (res.ok) {
        setOtpSent(true);
        await sendOtpEmail(email, data.demo_otp || '123456');
        setStatusMsg({ type: 'success', text: `OTP sent to ${email}! (Test Code: ${data.demo_otp || '123456'})` });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to dispatch OTP.' });
      }
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Failed to request OTP.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !email) return;

    setLoading(true);
    setStatusMsg(null);

    const selectedDept = MUNICIPAL_DEPARTMENTS.find(d => d.code === selectedDeptCode) || MUNICIPAL_DEPARTMENTS[0];

    try {
      const result = await signIn('credentials', {
        email,
        otp: otpCode,
        role: activeTab,
        departmentId: selectedDept.deptId,
        redirect: false
      });

      if (result?.error) {
        setStatusMsg({ type: 'error', text: 'Invalid or expired OTP code.' });
      } else {
        setStatusMsg({ type: 'success', text: 'OTP Verified! Redirecting...' });
        const targetPath = callbackUrl || (activeTab === 'OFFICER' ? `/dashboard/officer?dept=${selectedDept.code}` : '/dashboard/citizen');
        router.push(targetPath);
        router.refresh();
      }
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'OTP verification failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard/citizen' });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      {/* 
        STEP 2: LEFT SIDE (Hidden on mobile, 50% width on desktop)
        Deep navy blue (bg-slate-900) section with Government Logo, Title & Paragraph, centered vertically & horizontally
      */}
      <div className="hidden md:flex w-1/2 min-h-screen bg-slate-900 text-white flex-col justify-center items-center p-8 lg:p-12 text-center border-r border-slate-800 relative overflow-hidden">
        {/* Subtle Decorative Background Glow */}
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
              {t.portalSub}
            </div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
              {t.portalTitle}
            </h1>
          </div>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-normal">
            {t.leftDesc}
          </p>

          <div className="pt-6 border-t border-slate-800 flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Classification
            </span>
            <span>•</span>
            <span>PostGIS Dispatch</span>
            <span>•</span>
            <span>24/7 SLA Tracking</span>
          </div>
        </div>
      </div>

      {/* 
        STEP 2: RIGHT SIDE (100% width on mobile, 50% on desktop)
        Clean white (bg-white) section with centered Login forms
      */}
      <div className="w-full md:w-1/2 min-h-screen bg-white flex flex-col justify-between p-6 sm:p-10">
        {/* Top Language Selector */}
        <div className="flex justify-between items-center w-full max-w-sm mx-auto">
          <Link href="/" className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <Building2 className="w-4 h-4 text-slate-900 md:hidden" />
            <span className="md:hidden">Civic OS</span>
          </Link>

          <div className="relative flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-700 ml-auto shadow-xs">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer text-xs"
              aria-label="Language Selector"
            >
              <option value="en">English</option>
              <option value="mr">मराठी</option>
              <option value="hi">हिंदी</option>
            </select>
          </div>
        </div>

        {/* STEP 3: Centered Login Card */}
        <div className="w-full max-w-sm mx-auto my-auto space-y-6">
          <div className="space-y-1 text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeTab === 'CITIZEN' ? t.citizenTab + ' Sign In' : t.officialTab + ' Access'}
            </h2>
            <p className="text-xs text-slate-500">
              Sign in to access your municipal dashboard and governance queue.
            </p>
          </div>

          {/* 1. Tabs: "Citizen" | "Official" */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => { setActiveTab('CITIZEN'); setStatusMsg(null); setOtpSent(false); }}
              className={`flex-1 py-2 rounded-md text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'CITIZEN'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{t.citizenTab}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('OFFICER'); setStatusMsg(null); setOtpSent(false); }}
              className={`flex-1 py-2 rounded-md text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'OFFICER'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.officialTab}</span>
            </button>
          </div>

          {/* Alert Status Banner */}
          {statusMsg && (
            <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2.5 ${
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

          {/* 2. CITIZEN TAB CONTENT */}
          {activeTab === 'CITIZEN' ? (
            <div className="space-y-4">
              {/* Wide "Continue with Google" button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 flex items-center justify-center gap-2.5 transition-colors shadow-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{t.googleBtn}</span>
              </button>

              {/* Subtle divider: "------ or sign in with ------" */}
              <div className="relative flex items-center justify-center my-2">
                <div className="w-full border-t border-slate-200" />
                <span className="absolute bg-white px-3 text-[11px] text-slate-400 font-medium">
                  {t.dividerText}
                </span>
              </div>

              {!useOtp ? (
                /* Standard Password Flow */
                <form onSubmit={handleCitizenPasswordLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800">{t.emailLabel}</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="citizen@gov.in"
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-800">{t.passwordLabel}</label>
                      <a href="#" className="text-[11px] font-semibold text-blue-700 hover:underline">
                        {t.forgotPassword}
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* An "OTP Login Instead" toggle link below the password */}
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setUseOtp(true); setStatusMsg(null); }}
                      className="text-xs font-bold text-blue-700 hover:underline"
                    >
                      OTP Login Instead →
                    </button>
                  </div>

                  {/* Primary "Login" button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t.accessCitizen}
                  </button>
                </form>
              ) : (
                /* OTP Flow: Swaps Password input for "Send OTP" button and 6-digit input field */
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800">{t.emailLabel}</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="citizen@gov.in"
                          className="w-full pl-9 pr-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={loading || !email}
                        className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shrink-0 transition-colors focus:ring-2 focus:ring-slate-900 focus:outline-none disabled:opacity-50"
                      >
                        {t.sendOtp}
                      </button>
                    </div>
                  </div>

                  {otpSent && (
                    <form onSubmit={handleVerifyOtp} className="space-y-3 pt-2 border-t border-slate-200">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">{t.otpLabel}</label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="••••••"
                            className="w-full pl-9 pr-3.5 py-2.5 text-xs font-mono font-bold tracking-widest text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:opacity-50"
                      >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t.accessCitizen}
                      </button>
                    </form>
                  )}

                  {/* Toggle link back to Password Login */}
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setUseOtp(false); setStatusMsg(null); }}
                      className="text-xs font-bold text-blue-700 hover:underline"
                    >
                      ← Password Login Instead
                    </button>
                  </div>
                </div>
              )}

              <div className="text-center pt-2 border-t border-slate-100">
                <Link
                  href="/register"
                  className="text-xs font-bold text-slate-700 hover:text-blue-700 inline-flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-blue-700" />
                  <span>{t.newCitizen}</span>
                </Link>
              </div>
            </div>
          ) : (
            /* 3. OFFICIAL TAB CONTENT */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-lg flex items-center gap-2 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{t.warningBanner}</span>
              </div>

              {/* Department Dropdown <select> */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">{t.selectDepartment}</label>
                <select
                  value={selectedDeptCode}
                  onChange={(e) => setSelectedDeptCode(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  {MUNICIPAL_DEPARTMENTS.map((dept) => (
                    <option key={dept.id} value={dept.code}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleOfficialPasswordLogin} className="space-y-4">
                {/* Official Email */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">{t.emailLabel}</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@gov.in"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">{t.passwordLabel}</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Primary "Secure Login" button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-slate-900 focus:outline-none disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t.accessOfficial}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Micro-copy */}
        <p className="w-full max-w-sm mx-auto text-[10px] text-slate-400 text-center leading-relaxed mt-4">
          {t.complianceFooter}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Login Portal...</div>}>
      <LoginSplitContent />
    </Suspense>
  );
}
