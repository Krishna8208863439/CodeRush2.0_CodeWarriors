'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, BarChart3, AlertTriangle, CheckCircle, TrendingUp, MapPin } from 'lucide-react';
import { api } from '@/lib/api';

export default function ExecutiveDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExecutiveData() {
      try {
        const res = await api.get('/dashboard/executive');
        setData(res.data);
      } catch (err: any) {
        console.error('Executive dashboard load error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchExecutiveData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-slate-400 text-sm flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          Loading Municipal Commissioner executive view...
        </div>
      </div>
    );
  }

  const { totalComplaints, resolvedComplaints, slaBreaches, byDepartment } = data || {
    totalComplaints: 0,
    resolvedComplaints: 0,
    slaBreaches: 0,
    byDepartment: [],
  };

  const resolutionRate = totalComplaints > 0 ? ((resolvedComplaints / totalComplaints) * 100).toFixed(1) : '100.0';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Municipal Commissioner Executive Overview</h1>
            <p className="text-xs text-slate-400">City-wide complaint performance metrics & SLA escalation monitor</p>
          </div>
        </div>

        <Link
          href="/analytics"
          className="px-4 py-2.5 rounded-xl glass-button text-xs font-bold text-white shadow-md flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" /> Comprehensive Analytics
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <p className="text-xs text-slate-400">Total City Complaints</p>
          <h2 className="text-3xl font-extrabold text-white mt-1">{totalComplaints}</h2>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <p className="text-xs text-slate-400">Resolution Rate</p>
          <h2 className="text-3xl font-extrabold text-green-400 mt-1">{resolutionRate}%</h2>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <p className="text-xs text-slate-400">SLA Escalations</p>
          <h2 className="text-3xl font-extrabold text-red-400 mt-1">{slaBreaches}</h2>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <p className="text-xs text-slate-400">Active Wards</p>
          <h2 className="text-3xl font-extrabold text-cyan-400 mt-1">3 Wards</h2>
        </div>
      </div>

      {/* Department Performance Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-white">Department Performance Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Department</th>
                <th className="p-3">Volume</th>
                <th className="p-3">Resolved</th>
                <th className="p-3 text-right">Completion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {byDepartment.map((d: any, idx: number) => {
                const vol = parseInt(d.volume) || 0;
                const res = parseInt(d.resolved) || 0;
                const pct = vol > 0 ? ((res / vol) * 100).toFixed(0) : '0';
                return (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="p-3 font-semibold text-white">{d.name}</td>
                    <td className="p-3 text-slate-400">{vol}</td>
                    <td className="p-3 text-green-400 font-bold">{res}</td>
                    <td className="p-3 text-right font-mono font-bold text-cyan-400">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
