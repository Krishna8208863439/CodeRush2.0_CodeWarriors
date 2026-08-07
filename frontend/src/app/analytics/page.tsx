'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ShieldCheck, BarChart3, TrendingUp, Award, Clock, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

const COLORS = ['#0284c7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [byWard, setByWard] = useState<any[]>([]);
  const [deptPerformance, setDeptPerformance] = useState<any[]>([]);
  const [satisfaction, setSatisfaction] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [catRes, wardRes, deptRes, satRes] = await Promise.all([
          api.get('/analytics/by-category'),
          api.get('/analytics/by-ward'),
          api.get('/analytics/department-performance'),
          api.get('/analytics/satisfaction'),
        ]);

        setByCategory(catRes.data.data || []);
        setByWard(wardRes.data.data || []);
        setDeptPerformance(deptRes.data.data || []);
        setSatisfaction(satRes.data.data || []);
      } catch (err: any) {
        console.error('Analytics load error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/citizen" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Municipal Analytics Dashboard</h1>
            <p className="text-xs text-slate-400">Phase 10 Real-Time Aggregated Queries Cached in Redis (5-min TTL)</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading aggregated performance analytics...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 1. Complaints by Category */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" /> Complaint Volume by Category
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory}>
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Bar dataKey="volume" fill="#0284c7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Department Resolution Rates */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" /> Department Assigned vs Resolved
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptPerformance}>
                  <XAxis dataKey="department" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Bar dataKey="total_assigned" fill="#3b82f6" name="Total Assigned" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="total_resolved" fill="#10b981" name="Resolved" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Complaints by Ward */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" /> Ward Density Breakdown
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byWard}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Bar dataKey="volume" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Satisfaction Score Ratings */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" /> Citizen Satisfaction Scores
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={satisfaction}
                    dataKey="avg_satisfaction"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {satisfaction.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
