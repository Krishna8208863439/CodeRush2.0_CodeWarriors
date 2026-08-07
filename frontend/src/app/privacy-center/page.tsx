'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, FileText, Download, Trash2, ShieldCheck } from 'lucide-react';

const CONSENT_ITEMS = [
  { id: 'location_data', label: 'Location Data', desc: 'Share GPS coordinates when filing a complaint to enable accurate ward assignment.' },
  { id: 'image_evidence', label: 'Image & Video Evidence', desc: 'Upload photographic evidence that may be visible to assigned officers and department heads.' },
  { id: 'analytics', label: 'Anonymous Analytics', desc: 'Contribute anonymised data to help the municipality identify problem hotspots.' },
  { id: 'sms_notifications', label: 'SMS Notifications', desc: 'Receive complaint status updates via SMS on your registered mobile number.' },
  { id: 'email_notifications', label: 'Email Notifications', desc: 'Receive complaint status updates and resolution reports via email.' },
];

export default function PrivacyCenterPage() {
  const [consents, setConsents] = useState<Record<string, boolean>>({
    location_data: true,
    image_evidence: true,
    analytics: false,
    sms_notifications: true,
    email_notifications: true,
  });

  const toggleConsent = (key: string) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500 to-teal-600 flex items-center justify-center shadow-lg shadow-green-500/20">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Privacy Center</h1>
          <p className="text-xs text-slate-400">Manage your data, consent preferences, and personal information rights.</p>
        </div>
      </div>

      {/* GDPR-inspired Consent Management */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-green-400" /> Consent Management
        </h2>
        <p className="text-xs text-slate-400">
          In accordance with the Digital Personal Data Protection Act 2023 (DPDPA) and GDPR-inspired best practices,
          you control how your data is used. Changes take effect within 24 hours.
        </p>
        <div className="space-y-3">
          {CONSENT_ITEMS.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleConsent(item.id)}
                className={`flex-shrink-0 w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${
                  consents[item.id] ? 'bg-green-500' : 'bg-slate-700'
                }`}
                aria-label={`Toggle ${item.label}`}
                aria-checked={consents[item.id]}
                role="switch"
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                    consents[item.id] ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
        <button className="px-6 py-2.5 glass-button rounded-xl text-sm font-bold text-white">
          Save Consent Preferences
        </button>
      </div>

      {/* Data Subject Rights */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white">Your Data Rights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            <p className="text-sm font-bold text-white">Data Export</p>
            <p className="text-xs text-slate-400">Download all your personal data in machine-readable JSON format.</p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-button text-xs font-bold text-white mt-2">
              <Download className="w-3.5 h-3.5" /> Export My Data
            </button>
          </div>
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
            <Eye className="w-6 h-6 text-blue-400" />
            <p className="text-sm font-bold text-white">Access Request</p>
            <p className="text-xs text-slate-400">Request a full report of all data held about you in this system.</p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950 border border-blue-800 text-xs font-bold text-blue-300 mt-2">
              Request Report
            </button>
          </div>
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
            <Trash2 className="w-6 h-6 text-red-400" />
            <p className="text-sm font-bold text-white">Right to Erasure</p>
            <p className="text-xs text-slate-400">Request deletion of your personal data. Active complaint records may be anonymised instead of deleted per legal obligations.</p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950 border border-red-800 text-xs font-bold text-red-300 mt-2">
              Request Deletion
            </button>
          </div>
        </div>
      </div>

      {/* PII Masking Info */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800">
        <h2 className="text-lg font-bold text-white mb-3">How We Protect Your Data</h2>
        <ul className="space-y-2 text-xs text-slate-400">
          <li className="flex items-start gap-2"><span className="text-green-400 font-bold mt-0.5">✓</span> Phone numbers and emails are encrypted at rest using AES-256-GCM before database storage.</li>
          <li className="flex items-start gap-2"><span className="text-green-400 font-bold mt-0.5">✓</span> Complaint descriptions are PII-redacted before being sent to the AI inference service.</li>
          <li className="flex items-start gap-2"><span className="text-green-400 font-bold mt-0.5">✓</span> Officers and department heads only see masked contact information (e.g. +91 98••••3210).</li>
          <li className="flex items-start gap-2"><span className="text-green-400 font-bold mt-0.5">✓</span> All data access is logged in an immutable audit trail with timestamps and acting user IDs.</li>
          <li className="flex items-start gap-2"><span className="text-green-400 font-bold mt-0.5">✓</span> AI models receive only PII-stripped text — personal identifiers are removed before inference.</li>
        </ul>
      </div>
    </div>
  );
}
