'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Clock, AlertTriangle, CheckCircle, MapPin, ChevronRight, Check, X } from 'lucide-react';
import { api } from '@/lib/api';

export default function OfficerDashboard() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Modal State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'>('IN_PROGRESS');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  async function fetchAssigned() {
    try {
      const res = await api.get('/dashboard/officer');
      setComplaints(res.data.assignedComplaints || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load officer queue.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssigned();
  }, []);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    setUpdating(true);
    try {
      await api.patch(`/complaints/${selectedId}/status`, { status: newStatus, note });
      setSelectedId(null);
      setNote('');
      fetchAssigned();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Status update failed.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Municipal Officer Field Work Queue</h1>
            <p className="text-xs text-slate-400">Complaints ordered by XGBoost priority score with SLA countdown timers</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading assigned work queue...
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : complaints.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Work Queue Clear!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">No pending complaints currently assigned to your officer account.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div key={c.id} className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-800/50">
                    {c.reference_id}
                  </span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800/50">
                    Priority Score: {(c.priority_score * 100).toFixed(0)}%
                  </span>
                  {c.escalated && (
                    <span className="text-xs font-bold text-red-400 bg-red-950 px-2.5 py-1 rounded-lg border border-red-800/50 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> SLA ESCALATED
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white pt-1">{c.title || 'Municipal Grievance'}</h3>
                <p className="text-xs text-slate-400 max-w-3xl">{c.description}</p>

                <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {c.formatted_address || 'Ward Location'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> SLA Deadline:{' '}
                    {c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : '12 Hours'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    setSelectedId(c.id);
                    setNewStatus('IN_PROGRESS');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-bold hover:bg-blue-500/30"
                >
                  Set In-Progress
                </button>
                <button
                  onClick={() => {
                    setSelectedId(c.id);
                    setNewStatus('RESOLVED');
                  }}
                  className="px-4 py-2.5 rounded-xl glass-button text-xs font-bold text-white shadow-md"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Update Modal */}
      {selectedId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-3xl max-w-md w-full border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">Update Complaint Status</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Status</label>
              <select
                value={newStatus}
                onChange={(e: any) => setNewStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
              >
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Field Resolution Note</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Details of action taken by field team..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={updating}
                className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-white"
              >
                {updating ? 'Saving...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
