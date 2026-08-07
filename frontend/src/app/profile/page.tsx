'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserCircle2, Mail, Phone, MapPin, Globe, Bell,
  Save, ChevronLeft, ShieldCheck, AlertCircle, CheckCircle,
  KeyRound, FileText, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

type Tab = 'profile' | 'security' | 'notifications' | 'complaints';

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  address: string;
  preferred_language: string;
  notification_preferences: { email: boolean; sms: boolean; push: boolean };
  is_phone_verified: boolean;
}

interface Complaint {
  id: string;
  reference_id: string;
  category: string;
  title: string;
  status: string;
  created_at: string;
}

const LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'HI', label: 'Hindi (हिंदी)' },
  { code: 'MR', label: 'Marathi (मराठी)' },
  { code: 'TA', label: 'Tamil (தமிழ்)' },
  { code: 'TE', label: 'Telugu (తెలుగు)' },
  { code: 'KN', label: 'Kannada (ಕನ್ನಡ)' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('EN');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifPush, setNotifPush] = useState(true);

  // Phone OTP
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  // Complaints history
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  // Auth guard
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.replace('/login?tab=citizen&redirect=/profile');
      return;
    }
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await api.get('/citizens/profile');
      const p: Profile = res.data;
      setProfile(p);
      setName(p.name || '');
      setPhone(p.phone || '');
      setAddress(p.address || '');
      setPreferredLanguage(p.preferred_language || 'EN');
      setNotifEmail(p.notification_preferences?.email ?? true);
      setNotifSms(p.notification_preferences?.sms ?? true);
      setNotifPush(p.notification_preferences?.push ?? true);
      setOtpPhone(p.phone || '');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setProfileError('Session expired. Please log in again.');
      } else if (status === 404) {
        setProfileError('Profile not found. Please contact support.');
      } else {
        setProfileError(err?.response?.data?.message || 'Failed to load profile. Please try again.');
      }
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.patch('/citizens/profile', {
        name: name || undefined,
        phone: phone || null,
        address: address || null,
        preferred_language: preferredLanguage,
        notification_preferences: { email: notifEmail, sms: notifSms, push: notifPush },
      });
      setSaveSuccess(true);
      await fetchProfile();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err?.response?.data?.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendOtp() {
    if (!otpPhone) return;
    setOtpLoading(true);
    setOtpMessage(null);
    try {
      const res = await api.post('/citizens/verify-phone/request', { phone: otpPhone });
      setOtpSent(true);
      setOtpMessage(`[SIMULATED] OTP sent. Demo code: ${res.data.simulatedOtp}`);
    } catch (err: any) {
      setOtpMessage(err?.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode) return;
    setOtpLoading(true);
    setOtpMessage(null);
    try {
      await api.post('/citizens/verify-phone/verify', { otp: otpCode });
      setOtpMessage('Mobile number verified successfully.');
      await fetchProfile();
    } catch (err: any) {
      setOtpMessage(err?.response?.data?.message || 'OTP verification failed.');
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleLoadComplaints() {
    setLoadingComplaints(true);
    try {
      const res = await api.get('/citizens/complaints');
      setComplaints(res.data.complaints || []);
    } catch {
      setComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'complaints') handleLoadComplaints();
  }, [activeTab]);

  const statusColor: Record<string, string> = {
    SUBMITTED: 'text-amber-400 bg-amber-950/60 border-amber-800/50',
    ASSIGNED: 'text-blue-400 bg-blue-950/60 border-blue-800/50',
    IN_PROGRESS: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/50',
    RESOLVED: 'text-green-400 bg-green-950/60 border-green-800/50',
    REJECTED: 'text-red-400 bg-red-950/60 border-red-800/50',
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          Loading profile…
        </div>
      </div>
    );
  }

  if (profileError && !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-sm text-red-300">{profileError}</p>
          <Link href="/login?tab=citizen" className="inline-block px-5 py-2.5 rounded-xl bg-cyan-600 text-white text-xs font-bold">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/citizen" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
              <UserCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{profile?.name || 'My Account'}</h1>
              <p className="text-xs text-slate-400">{profile?.email} · <span className="text-cyan-400 font-semibold">{profile?.role}</span></p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
          {(['profile', 'security', 'notifications', 'complaints'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${
                activeTab === t
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'complaints' ? 'My Complaints' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Success banner */}
        {saveSuccess && (
          <div className="p-3 rounded-xl bg-green-950/50 border border-green-700/40 text-green-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Profile updated successfully.
          </div>
        )}
        {profileError && profile && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-700/40 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {profileError}
          </div>
        )}

        {/* ── TAB: PROFILE ─────────────────────────────── */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCircle2 className="w-5 h-5 text-cyan-400" /> Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Mobile Number
                  {profile?.is_phone_verified && <span className="text-green-400 text-[10px] font-bold ml-1">[VERIFIED]</span>}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Preferred Language
                </label>
                <select
                  value={preferredLanguage}
                  onChange={e => setPreferredLanguage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>

              <div className="col-span-full space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Address / Ward
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="House No., Street, Ward, City"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        )}

        {/* ── TAB: SECURITY (Identity & Mobile OTP) ────── */}
        {activeTab === 'security' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" /> Identity & Mobile OTP
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950 border border-amber-800/50 px-2 py-0.5 rounded-full ml-1">[SIMULATED]</span>
            </h2>
            <p className="text-xs text-slate-400">
              OTP delivery is in demo/simulated mode. The OTP code <strong className="text-slate-200">123456</strong> always works for verification.
              Real MSG91 SMS delivery requires a DLT-registered sender ID and API key (see README).
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Mobile Number to Verify</label>
                <input
                  type="tel"
                  value={otpPhone}
                  onChange={e => setOtpPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="+91 98765 43210"
                />
              </div>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpLoading || !otpPhone}
                className="px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white hover:border-cyan-500 disabled:opacity-50"
              >
                {otpLoading ? 'Sending…' : 'Send OTP [SIMULATED]'}
              </button>

              {otpSent && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" /> Enter OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-cyan-500"
                      placeholder="123456"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otpCode.length < 6}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {otpLoading ? 'Verifying…' : 'Verify OTP'}
                  </button>
                </div>
              )}

              {otpMessage && (
                <p className={`text-xs px-3 py-2 rounded-xl border ${otpMessage.includes('verified') || otpMessage.includes('Sent') || otpMessage.includes('SIMULATED') ? 'text-green-400 bg-green-950/40 border-green-800/40' : 'text-red-400 bg-red-950/40 border-red-800/40'}`}>
                  {otpMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: NOTIFICATIONS ───────────────────────── */}
        {activeTab === 'notifications' && (
          <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-cyan-400" /> Notification Preferences
            </h2>

            <div className="space-y-3">
              {[
                { key: 'email', label: 'Email Notifications', state: notifEmail, set: setNotifEmail },
                { key: 'sms',   label: 'SMS Notifications (MSG91)',  state: notifSms,   set: setNotifSms   },
                { key: 'push',  label: 'Web Push Notifications',     state: notifPush,  set: setNotifPush  },
              ].map(({ key, label, state, set }) => (
                <label key={key} className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer hover:border-cyan-500/50">
                  <span className="text-sm font-medium text-white">{label}</span>
                  <div
                    onClick={() => set(!state)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${state ? 'bg-cyan-600' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${state ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Preferences'}
            </button>
          </form>
        )}

        {/* ── TAB: MY COMPLAINTS ───────────────────────── */}
        {activeTab === 'complaints' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" /> My Complaints History
            </h2>

            {loadingComplaints ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> Loading complaints…
              </div>
            ) : complaints.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No complaints found in your account yet.
                <div className="mt-3">
                  <Link href="/complaints/new" className="text-cyan-400 hover:underline text-xs font-bold">
                    File your first complaint →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700">
                    <div>
                      <p className="font-mono text-xs text-cyan-400 font-bold">{c.reference_id}</p>
                      <p className="text-sm font-semibold text-white mt-0.5">{c.title || c.category || 'Municipal Issue'}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${statusColor[c.status] || 'text-slate-300 bg-slate-700 border-slate-600'}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
