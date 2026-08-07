'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Plus, Clock, MapPin, AlertCircle, ChevronRight, MessageSquare, Award } from 'lucide-react';
import { api } from '@/lib/api';

export default function CitizenDashboard() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComplaints() {
      try {
        const res = await api.get('/dashboard/citizen');
        setComplaints(res.data.complaints || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load citizen complaints.');
      } finally {
        setLoading(false);
      }
    }
    fetchComplaints();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Citizen Grievance Portal</h1>
            <p className="text-xs text-slate-400">Track resolution progress, file new complaints, & provide feedback</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/map"
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            GIS Hotspot Map
          </Link>
          <Link
            href="/complaints/new"
            className="px-4 py-2.5 rounded-xl glass-button text-xs font-bold text-white shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            File New Complaint
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Fetching your submitted complaints...
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : complaints.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Complaints Submitted Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Submit a municipal complaint via text, voice, image, audio, or video channel to get started.
          </p>
          <Link
            href="/complaints/new"
            className="px-5 py-2.5 rounded-xl glass-button text-xs font-bold text-white inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Submit Your First Complaint
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complaints.map((c) => (
            <div key={c.id} className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800/50">
                    {c.reference_id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      c.status === 'RESOLVED'
                        ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                        : c.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1 line-clamp-1">{c.title || 'Municipal Grievance'}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4">{c.description}</p>
              </div>

              <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(c.created_at).toLocaleDateString()}</span>
                <Link
                  href={`/complaints/${c.id}`}
                  className="text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                >
                  View Detail <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
