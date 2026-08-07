'use client';

import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, Shield, Bell, Eye, Key, LogOut, Save } from 'lucide-react';
import { api } from '@/lib/api';

const LANGUAGE_OPTIONS = [
  { code: 'EN', label: 'English' },
  { code: 'HI', label: 'हिंदी (Hindi)' },
  { code: 'MR', label: 'मराठी (Marathi)' },
  { code: 'TA', label: 'தமிழ் (Tamil)' },
  { code: 'TE', label: 'తెలుగు (Telugu)' },
  { code: 'KN', label: 'ಕನ್ನಡ (Kannada)' },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', preferred_language: 'EN' });

  useEffect(() => {
    api.get('/auth/me')
      .then((r) => {
        setProfile(r.data);
        setForm({
          name: r.data.name || '',
          email: r.data.email || '',
          phone: r.data.phone || '',
          preferred_language: r.data.preferred_language || 'EN',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await api.patch('/auth/me', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <User className="w-9 h-9 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{profile?.name}</h1>
          <p className="text-xs text-slate-400 capitalize">{profile?.role?.toLowerCase()} · {profile?.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 max-w-md">
        {(['profile', 'security', 'notifications'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl capitalize transition-all ${
              tab === t ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="Your full name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preferred Language</label>
              <select
                value={form.preferred_language}
                onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 glass-button rounded-xl text-sm font-bold text-white transition-all"
          >
            <Save className="w-4 h-4" />
            {saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Security Tab */}
      {tab === 'security' && (
        <div className="space-y-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white">Change Password</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="password" placeholder="Current Password" className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500" />
              <input type="password" placeholder="New Password" className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <button className="px-6 py-2.5 glass-button rounded-xl text-sm font-bold text-white">Update Password</button>
          </div>
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-400" />
              <h3 className="font-bold text-white">Active Sessions</h3>
            </div>
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-white">Current Session</p>
                <p className="text-xs text-slate-400">This device · {new Date().toLocaleDateString('en-IN')}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-950 text-green-300 border border-green-800/50">ACTIVE</span>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white">Notification Preferences</h3>
          </div>
          {(['EMAIL', 'SMS', 'WHATSAPP', 'WEB_PUSH'] as const).map((channel) => (
            <div key={channel} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
              <div>
                <p className="text-sm font-semibold text-white">{channel.replace('_', ' ')}</p>
                <p className="text-xs text-slate-400">Receive notifications via {channel.toLowerCase()}</p>
              </div>
              <button className="w-12 h-6 bg-cyan-500 rounded-full relative focus:outline-none">
                <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-all" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
