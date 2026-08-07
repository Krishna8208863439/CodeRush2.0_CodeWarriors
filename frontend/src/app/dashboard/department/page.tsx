'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Users, BarChart2, CheckCircle, AlertTriangle, UserPlus, Clock } from 'lucide-react';
import { api } from '@/lib/api';

export default function DepartmentDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assign Modal State
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  async function fetchDepartmentData() {
    try {
      const res = await api.get('/dashboard/department');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load department dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDepartmentData();
  }, []);

  const handleAssignOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintId || !selectedOfficerId) return;

    setAssigning(true);
    try {
      await api.patch(`/complaints/${selectedComplaintId}/assign`, { officerId: selectedOfficerId });
      setSelectedComplaintId(null);
      fetchDepartmentData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Assignment failed.');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-slate-400 text-sm flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          Loading department management hub...
        </div>
      </div>
    );
  }

  const { department, complaints, officers } = data || { complaints: [], officers: [] };

  return (
    <div className="bg-slate-950 text-slate-100 p-6 rounded-xl w-full mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Department Head Control Center</h1>
            <p className="text-xs text-slate-400">
              Department: <span className="text-cyan-400 font-bold">{department?.name || 'Municipal Operations'}</span>
            </p>
          </div>
        </div>

        <Link
          href="/analytics"
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-cyan-400 hover:border-cyan-500/50 flex items-center gap-2"
        >
          <BarChart2 className="w-4 h-4" /> View Analytics
        </Link>
      </div>

      {/* Officers Workload Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" /> Department Officers Workload
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {officers.map((off: any) => (
            <div key={off.id} className="glass-panel p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-white">{off.name}</p>
                <p className="text-xs text-slate-400">{off.designation || 'Field Inspector'}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-400 bg-amber-950 px-2 py-1 rounded-lg border border-amber-800/50">
                  {off.active_count} Active
                </span>
                <p className="text-[10px] text-slate-500 mt-1">{off.resolved_count} Resolved</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Complaints Table with Assign Button */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-white">Department Complaint Queue</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Ref ID</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Assigned Officer</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {complaints.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-900/40">
                  <td className="p-3 font-mono font-bold text-cyan-400">{c.reference_id}</td>
                  <td className="p-3 font-semibold text-white max-w-xs truncate">{c.title || 'Municipal Grievance'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{c.officer_name || 'Unassigned'}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedComplaintId(c.id);
                        if (officers.length > 0) setSelectedOfficerId(officers[0].user_id || officers[0].id);
                      }}
                      className="px-3 py-1.5 rounded-lg glass-button text-[11px] font-bold text-white"
                    >
                      Assign Officer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      {selectedComplaintId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-3xl max-w-md w-full border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">Assign Officer to Complaint</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Officer</label>
              <select
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
              >
                {officers.map((off: any) => (
                  <option key={off.id} value={off.user_id || off.id}>
                    {off.name} ({off.active_count} Active Complaints)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setSelectedComplaintId(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignOfficer}
                disabled={assigning}
                className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-white"
              >
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
