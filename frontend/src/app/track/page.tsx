'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ShieldCheck, FileText, ArrowRight, Building2 } from 'lucide-react';

function TrackSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id') || '';

  const [inputVal, setInputVal] = useState(initialId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    router.push(`/track/${encodeURIComponent(inputVal.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-xl space-y-8 text-center">
        {/* Header */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-blue-900 text-white flex items-center justify-center mx-auto shadow-md">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-100 text-blue-900 font-extrabold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-900" /> Public Grievance Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Track Grievance Status
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto">
            Enter your public tracking reference ID (e.g. <strong className="text-slate-900 font-mono">CIV-2026-8942</strong>) to view real-time SLA progress, AI department routing, and audit logs.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-md space-y-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="e.g. CIV-2026-8942 or GRP-2026-8821"
                className="w-full pl-11 pr-4 py-3.5 text-sm font-mono font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-800 focus:outline-none placeholder:font-sans placeholder:font-normal"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 bg-blue-800 hover:bg-blue-900 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-blue-800 focus:outline-none"
            >
              <span>Track Ticket Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Links */}
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">Sample Tracking Reference IDs:</p>
            <div className="flex flex-wrap justify-center gap-2 font-mono font-bold">
              {['CIV-2026-8942', 'GRP-2026-8821', 'GRP-2026-7740'].map((sampleId) => (
                <Link
                  key={sampleId}
                  href={`/track/${sampleId}`}
                  className="px-3 py-1 rounded bg-slate-100 hover:bg-blue-50 text-blue-900 border border-slate-200 transition-colors"
                >
                  {sampleId}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Back Link */}
        <p className="text-xs text-slate-500">
          Want to submit a new complaint?{' '}
          <Link href="/submit" className="font-bold text-blue-800 hover:underline">
            File a Grievance here →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function PublicTrackPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Tracking Search...</div>}>
      <TrackSearchContent />
    </Suspense>
  );
}
