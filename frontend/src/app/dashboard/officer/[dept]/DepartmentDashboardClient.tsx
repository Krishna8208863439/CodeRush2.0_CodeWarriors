'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ShieldCheck, Clock, AlertTriangle, CheckCircle, MapPin,
  X, Building2, ChevronDown
} from 'lucide-react';
import { api } from '@/lib/api';
import DepartmentSelectDropdown, { MUNICIPAL_DEPARTMENTS } from '@/components/DepartmentSelectDropdown';

const DEPT_META: Record<string, { label: string; colour: string }> = {
  WSS: { label: 'Water Leakage & Water Supply Dashboard', colour: 'from-blue-500 to-cyan-600' },
  SWM: { label: 'Garbage & Sanitation Dashboard',       colour: 'from-green-500 to-emerald-600' },
  PWD: { label: 'Road Damage & Public Works Dashboard', colour: 'from-orange-500 to-amber-600' },
  ESB: { label: 'Streetlight & Electrical Dashboard',   colour: 'from-yellow-400 to-amber-500' },
  DSM: { label: 'Drainage & Sewerage Dashboard',        colour: 'from-purple-500 to-violet-600' },
};

interface Complaint {
  id: string;
  reference_id: string;
  title?: string;
  description?: string;
  priority_score: number;
  ai_priority?: string;
  status: string;
  category: string;
  created_at: string;
  address?: string;
  sla_hours_left?: number;
  assigned_department?: string;
}

export default function DepartmentDashboardClient() {
  const params = useParams();
  const router = useRouter();

  const deptCode = ((params?.dept as string) || 'WSS').toUpperCase();
  const meta = DEPT_META[deptCode] || {
    label: `${deptCode} Department Dashboard`,
    colour: 'from-slate-600 to-slate-800',
  };

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    fetchDepartmentComplaints();
  }, [deptCode]);

  async function fetchDepartmentComplaints() {
    setLoading(true);
    try {
      const res = await api.get(`/dashboards/department/${deptCode}`);
      setComplaints(res.data?.complaints || res.data || []);
    } catch {
      setComplaints([
        {
          id: '1',
          reference_id: 'CRP-2026-881920',
          title: 'Uncollected garbage pile near school gate',
          description: 'Garbage overflowing from bins for 3 days.',
          priority_score: 82,
          ai_priority: 'HIGH',
          status: 'SUBMITTED',
          category: 'GARBAGE',
          created_at: new Date().toISOString(),
          address: 'Ghatkopar West, Mumbai',
          sla_hours_left: 14,
          assigned_department: deptCode,
        },
        {
          id: '2',
          reference_id: 'CRP-2026-444624',
          title: 'Water pipe leaking heavily on main road',
          description: 'Drinking water wasting continuously.',
          priority_score: 95,
          ai_priority: 'CRITICAL',
          status: 'IN_PROGRESS',
          category: 'WATER_LEAKAGE',
          created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          address: 'Kurla West, Mumbai',
          sla_hours_left: 4,
          assigned_department: deptCode,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(complaintId: string, newStatus: string) {
    setStatusUpdating(true);
    try {
      await api.patch(`/complaints/${complaintId}/status`, { status: newStatus });
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, status: newStatus } : c))
      );
      if (selectedComplaint?.id === complaintId) {
        setSelectedComplaint((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch {
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, status: newStatus } : c))
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  const filtered = complaints.filter((c) => {
    if (activeTab === 'PENDING') return c.status === 'SUBMITTED';
    if (activeTab === 'IN_PROGRESS') return c.status === 'IN_PROGRESS';
    if (activeTab === 'RESOLVED') return c.status === 'RESOLVED';
    return true;
  });

  const counts = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === 'SUBMITTED').length,
    inProgress: complaints.filter((c) => c.status === 'IN_PROGRESS').length,
    resolved: complaints.filter((c) => c.status === 'RESOLVED').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className={`p-8 rounded-2xl bg-gradient-to-r ${meta.colour} shadow-xl relative overflow-hidden`}>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-sm font-semibold tracking-wider uppercase mb-1">
                <Building2 className="w-4 h-4" /> Municipal Department Officer Portal
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{meta.label}</h1>
              <p className="text-white/80 text-sm mt-1">Code: <span className="font-mono bg-black/20 px-2 py-0.5 rounded">{deptCode}</span></p>
            </div>

            <div className="w-full md:w-auto">
              <DepartmentSelectDropdown
                selectedDeptCode={deptCode}
                onSelectDepartment={(code) => router.push(`/dashboard/officer/${code}`)}
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Complaints</div>
            <div className="text-3xl font-bold text-slate-100 mt-1">{counts.total}</div>
          </div>
          <div className="bg-slate-900 border border-amber-900/40 rounded-xl p-5">
            <div className="text-amber-400 text-xs uppercase tracking-wider font-semibold">Pending Action</div>
            <div className="text-3xl font-bold text-amber-400 mt-1">{counts.pending}</div>
          </div>
          <div className="bg-slate-900 border border-blue-900/40 rounded-xl p-5">
            <div className="text-blue-400 text-xs uppercase tracking-wider font-semibold">In Progress</div>
            <div className="text-3xl font-bold text-blue-400 mt-1">{counts.inProgress}</div>
          </div>
          <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-5">
            <div className="text-emerald-400 text-xs uppercase tracking-wider font-semibold">Resolved</div>
            <div className="text-3xl font-bold text-emerald-400 mt-1">{counts.resolved}</div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Complaint Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading department grievances...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400">
            No complaints found in this category.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-mono font-bold text-cyan-400">{item.reference_id}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      item.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      item.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-100 mb-2 line-clamp-2">{item.title || 'Municipal Issue'}</h3>
                  <p className="text-slate-400 text-xs mb-4 line-clamp-3">{item.description || 'No detailed description.'}</p>

                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-4">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{item.address || 'Location on map'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex gap-2">
                  <button
                    onClick={() => updateStatus(item.id, 'IN_PROGRESS')}
                    disabled={item.status === 'IN_PROGRESS' || statusUpdating}
                    className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold disabled:opacity-40"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => updateStatus(item.id, 'RESOLVED')}
                    disabled={item.status === 'RESOLVED' || statusUpdating}
                    className="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold disabled:opacity-40"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
