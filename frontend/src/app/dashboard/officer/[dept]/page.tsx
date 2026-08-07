'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ShieldCheck, Clock, AlertTriangle, CheckCircle, MapPin,
  X, Building2
} from 'lucide-react';
import { api } from '@/lib/api';

// Department metadata — display names keyed by the dept code stored in the DB.
// The code values must match what the API returns in departments.code.
const DEPT_META: Record<string, { label: string; colour: string }> = {
  SWM: { label: 'Garbage & Sanitation',       colour: 'from-green-500 to-emerald-600' },
  PWD: { label: 'Road Damage & Public Works',  colour: 'from-orange-500 to-amber-600' },
  WSS: { label: 'Water Leakage & Supply',      colour: 'from-blue-500 to-cyan-600' },
  ESB: { label: 'Streetlight & Electrical',    colour: 'from-yellow-400 to-amber-500' },
  DSM: { label: 'Drainage & Sewerage',         colour: 'from-purple-500 to-violet-600' },
};

interface Complaint {
  id: string;
  reference_id: string;
  title?: string;
  description?: string;
  priority_score: number;
  escalated: boolean;
  status: string;
  formatted_address?: string;
  sla_deadline?: string;
  category?: string;
  department_name?: string;
}

export default function DeptOfficerDashboard() {
  const params = useParams();
  // Next.js dynamic segment — dept is the folder name [dept]
  const deptCode = typeof params?.dept === 'string' ? params.dept.toUpperCase() : 'UNKNOWN';
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Status update modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'>('IN_PROGRESS');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const deptMeta = DEPT_META[deptCode] ?? { label: deptCode, colour: 'from-slate-500 to-slate-600' };

  async function fetchQueue() {
    setLoading(true);
    setFetchError(null);
    try {
      // Pass the department code so the API can scope the query to this department.
      // Falls back gracefully: if the user is authenticated as an officer in a
      // specific department, the API also filters by officer_id from the JWT.
      const res = await api.get('/dashboard/officer', {
        params: { dept: deptCode },
      });
      setComplaints(res.data.assignedComplaints ?? []);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        router.push('/login?role=officer');
        return;
      }
      if (status === 403) {
        setFetchError('Access denied — you are not authorised for this department.');
        setComplaints([]);
      } else {
        // Demo fallback: use realistic mock data scoped to the selected department
        setComplaints(getMockComplaints(deptCode));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptCode]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await api.patch(`/complaints/${selectedId}/status`, { status: newStatus, note });
      setSelectedId(null);
      setNote('');
      fetchQueue();
    } catch (err: any) {
      setUpdateError(err.response?.data?.message ?? 'Status update failed. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  function slaColour(deadline?: string, escalated?: boolean): string {
    if (escalated) return 'text-red-400';
    if (!deadline) return 'text-slate-400';
    const msLeft = new Date(deadline).getTime() - Date.now();
    if (msLeft < 0) return 'text-red-400';
    if (msLeft < 4 * 3600 * 1000) return 'text-amber-400';
    return 'text-emerald-400';
  }

  return (
    <div className="bg-slate-950 text-slate-100 p-6 rounded-xl w-full mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${deptMeta.colour} flex items-center justify-center shadow-lg`}>
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {deptMeta.label}
              </h1>
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                {deptCode}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Field Work Queue — complaints assigned to you in this department, ordered by AI priority score
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Building2 className="w-3.5 h-3.5" />
          <span>Department: <strong className="text-slate-300">{deptMeta.label}</strong></span>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading {deptMeta.label} work queue…
        </div>
      ) : !fetchError && complaints.length === 0 ? (
        <div className="p-12 rounded-3xl text-center border border-slate-800 bg-slate-900/30">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Work Queue Clear!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            No pending complaints are currently assigned to you in the{' '}
            <strong className="text-slate-200">{deptMeta.label}</strong> department.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="flex-1 space-y-1.5">
                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-800/50">
                    {c.reference_id}
                  </span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800/50">
                    Priority: {(c.priority_score * 100).toFixed(0)}%
                  </span>
                  {c.category && (
                    <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                      {c.category}
                    </span>
                  )}
                  {c.escalated && (
                    <span className="text-xs font-bold text-red-400 bg-red-950 px-2.5 py-1 rounded-lg border border-red-800/50 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> SLA ESCALATED
                    </span>
                  )}
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                      c.status === 'IN_PROGRESS'
                        ? 'text-blue-300 bg-blue-950 border-blue-800/50'
                        : c.status === 'RESOLVED'
                        ? 'text-green-300 bg-green-950 border-green-800/50'
                        : 'text-slate-300 bg-slate-800 border-slate-700'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                {/* Title & description */}
                <h3 className="text-base font-bold text-white pt-0.5">{c.title ?? 'Municipal Grievance'}</h3>
                <p className="text-xs text-slate-400 max-w-3xl line-clamp-2">{c.description}</p>

                {/* Location & SLA */}
                <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                  {c.formatted_address && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {c.formatted_address}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 ${slaColour(c.sla_deadline, c.escalated)}`}>
                    <Clock className="w-3.5 h-3.5" />
                    SLA Deadline:{' '}
                    {c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : 'Not set'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setSelectedId(c.id); setNewStatus('IN_PROGRESS'); setUpdateError(null); }}
                  className="px-4 py-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-bold hover:bg-blue-500/30 transition-colors"
                >
                  Set In-Progress
                </button>
                <button
                  onClick={() => { setSelectedId(c.id); setNewStatus('RESOLVED'); setUpdateError(null); }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Status Update Modal ── */}
      {selectedId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Update Complaint Status</h3>
              <button
                type="button"
                onClick={() => { setSelectedId(null); setUpdateError(null); }}
                aria-label="Close modal"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {updateError && (
              <p className="text-xs text-red-400 bg-red-950/50 border border-red-800/40 rounded-xl p-3">
                {updateError}
              </p>
            )}

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label htmlFor="status-select" className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Status
                </label>
                <select
                  id="status-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as typeof newStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label htmlFor="field-note" className="block text-xs font-semibold text-slate-300 mb-1">
                  Field Resolution Note
                </label>
                <textarea
                  id="field-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Details of action taken by field team…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setSelectedId(null); setUpdateError(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white disabled:opacity-50"
                >
                  {updating ? 'Saving…' : 'Confirm Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mock data scoped per department (used when backend is unavailable) ─────────
function getMockComplaints(deptCode: string): Complaint[] {
  const byDept: Record<string, Complaint[]> = {
    SWM: [
      {
        id: 'swm-001', reference_id: 'CRP-2026-0041', title: 'Garbage Pile Not Collected — Nehru Colony',
        description: 'Waste has not been collected for 3 days, attracting stray animals near Nehru Colony, Ward 1.',
        priority_score: 0.89, escalated: true, status: 'PENDING',
        formatted_address: 'Nehru Colony, Ward 1', category: 'GARBAGE',
        sla_deadline: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      },
      {
        id: 'swm-002', reference_id: 'CRP-2026-0038', title: 'Overflowing Bin Near Bus Stand',
        description: 'Municipal bin at the bus stand is overflowing; foul odour affecting commuters.',
        priority_score: 0.74, escalated: false, status: 'IN_PROGRESS',
        formatted_address: 'Bus Stand, Ward 3', category: 'GARBAGE',
        sla_deadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      },
    ],
    PWD: [
      {
        id: 'pwd-001', reference_id: 'CRP-2026-0055', title: 'Deep Pothole on School Road',
        description: 'A large pothole on the route to the government school is endangering students and cyclists.',
        priority_score: 0.92, escalated: true, status: 'PENDING',
        formatted_address: 'School Road, Ward 2', category: 'ROAD_DAMAGE',
        sla_deadline: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      },
      {
        id: 'pwd-002', reference_id: 'CRP-2026-0049', title: 'Broken Footpath Slab — Gandhi Nagar',
        description: 'Several footpath slabs are broken exposing rebar; pedestrian safety hazard.',
        priority_score: 0.65, escalated: false, status: 'ASSIGNED',
        formatted_address: 'Gandhi Nagar, Ward 4', category: 'ROAD_DAMAGE',
        sla_deadline: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
      },
    ],
    WSS: [
      {
        id: 'wss-001', reference_id: 'CRP-2026-0062', title: 'Water Pipe Leakage — Main Intersection',
        description: 'Major pipe burst at Gandhi Nagar intersection causing road damage and water wastage.',
        priority_score: 0.95, escalated: true, status: 'IN_PROGRESS',
        formatted_address: 'Gandhi Nagar, Ward 4', category: 'WATER_LEAKAGE',
        sla_deadline: new Date(Date.now() + 1 * 3600 * 1000).toISOString(),
      },
      {
        id: 'wss-002', reference_id: 'CRP-2026-0058', title: 'No Water Supply for 2 Days',
        description: 'Entire Sector 7 has had no tap water for 48 hours following a valve failure.',
        priority_score: 0.80, escalated: false, status: 'PENDING',
        formatted_address: 'Sector 7, Ward 5', category: 'WATER_LEAKAGE',
        sla_deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      },
    ],
    ESB: [
      {
        id: 'esb-001', reference_id: 'CRP-2026-0071', title: 'Street Light Non-Functional — Ward 3 Junction',
        description: 'The streetlight at the Ward 3 junction has been off for 5 days, causing safety issues at night.',
        priority_score: 0.88, escalated: false, status: 'PENDING',
        formatted_address: 'Ward 3, Main Road Junction', category: 'STREET_LIGHT',
        sla_deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      },
    ],
    DSM: [
      {
        id: 'dsm-001', reference_id: 'CRP-2026-0080', title: 'Overflowing Drain Near Central Market',
        description: 'Drainage channel near the central market is overflowing causing waterlogging on the street.',
        priority_score: 0.85, escalated: false, status: 'IN_PROGRESS',
        formatted_address: 'Central Market, Ward 5', category: 'DRAINAGE',
        sla_deadline: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
      },
    ],
  };
  return byDept[deptCode] ?? [];
}
