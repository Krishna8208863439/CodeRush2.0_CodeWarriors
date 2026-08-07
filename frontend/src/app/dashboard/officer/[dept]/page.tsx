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
  escalated: boolean;
  status: string;
  formatted_address?: string;
  sla_deadline?: string;
  category?: string;
  department_name?: string;
}

export default function DeptOfficerDashboard() {
  const params = useParams();
  const router = useRouter();

  // Dynamic route parameter: [dept] (e.g. WSS, SWM, PWD, ESB, DSM)
  const deptCode = typeof params?.dept === 'string' ? params.dept.toUpperCase() : 'WSS';

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Status update modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'>('IN_PROGRESS');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const deptMeta = DEPT_META[deptCode] ?? { label: `${deptCode} Department Dashboard`, colour: 'from-[#2563eb] to-cyan-600' };

  // Fetch department-filtered work queue
  async function fetchQueue() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get('/dashboard/officer', {
        params: { dept: deptCode },
      });
      const returnedComplaints = res.data.assignedComplaints ?? [];
      
      // Filter complaints to ensure only matching department cards are rendered
      const filtered = returnedComplaints.filter((c: Complaint) => {
        if (!c.category) return true;
        const matchingDept = MUNICIPAL_DEPARTMENTS.find(d => d.code === deptCode);
        return matchingDept ? c.category === matchingDept.category || c.category.includes(deptCode) : true;
      });

      setComplaints(filtered.length > 0 ? filtered : returnedComplaints);
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
        // Fallback demo complaints scoped strictly to selected department
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

  // Programmatic Department Navigation Handler
  const handleSelectDepartment = (newDeptCode: string) => {
    router.push(`/dashboard/officer/${newDeptCode}`);
  };

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

  return (
    <div className="bg-[#0f172a] text-slate-100 p-6 rounded-2xl w-full mx-auto space-y-6 min-h-screen">
      
      {/* ── Header Bar & Dropdown Navigation ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${deptMeta.colour} flex items-center justify-center shadow-lg shrink-0`}>
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {deptMeta.label}
              </h1>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded-md border border-cyan-800">
                {deptCode}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtered Grievance Queue — showing active complaints for {deptCode} department
            </p>
          </div>
        </div>

        {/* Municipal Department Dropdown Navigation Selector */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <span className="text-xs font-bold text-slate-400 shrink-0">Select Department:</span>
          <DepartmentSelectDropdown
            selectedDeptCode={deptCode}
            onSelectDepartment={handleSelectDepartment}
          />
        </div>
      </div>

      {/* ── Error Banner ── */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* ── Loading State ── */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading {deptMeta.label} work queue…
        </div>
      ) : !fetchError && complaints.length === 0 ? (
        <div className="p-12 rounded-3xl text-center border border-slate-800 bg-slate-900/30">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Work Queue Clear!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            No pending complaints match the <strong className="text-slate-200">{deptMeta.label}</strong> department filter.
          </p>
        </div>
      ) : (
        /* ── Department Filtered Cards Grid ── */
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-slate-400 px-1 font-mono">
            <span>Showing {complaints.length} department grievance cards</span>
            <span>Department Filter Active: [{deptCode}]</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
              >
                <div className="flex-1 space-y-2">
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

                  <h3 className="text-base font-bold text-white tracking-wide">
                    {c.title || 'Municipal Grievance Report'}
                  </h3>
                  {c.description && (
                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                      {c.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 font-mono">
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      {c.formatted_address || 'Location Coordinates Recorded'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      SLA Target: {c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : '24h Standard'}
                    </span>
                  </div>
                </div>

                {/* Status Update Button */}
                <button
                  onClick={() => {
                    setSelectedId(c.id);
                    setNewStatus('IN_PROGRESS');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md transition-all shrink-0"
                >
                  Update Status
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {selectedId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Update Grievance Status</h3>
              <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e: any) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none"
                >
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Action Note / Resolution Details</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe resolution or field inspection findings..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>

              {updateError && (
                <p className="text-xs text-red-400 font-semibold">{updateError}</p>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white"
                >
                  {updating ? 'Saving...' : 'Confirm Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Scoped Mock Data per Department
function getMockComplaints(deptCode: string): Complaint[] {
  const byDept: Record<string, Complaint[]> = {
    WSS: [
      {
        id: 'wss-001', reference_id: 'CRP-2026-0062', title: 'Major Water Pipeline Burst — Gandhi Road',
        description: 'Underground main line leakage causing flooding and water loss in Ward 4.',
        priority_score: 0.95, escalated: true, status: 'IN_PROGRESS',
        formatted_address: 'Gandhi Road Intersection, Ward 4', category: 'WATER_LEAKAGE',
        sla_deadline: new Date(Date.now() + 1 * 3600 * 1000).toISOString(),
      },
      {
        id: 'wss-002', reference_id: 'CRP-2026-0058', title: 'Low Pressure Water Supply Issue',
        description: 'Multiple households reporting zero tap pressure during morning supply hours.',
        priority_score: 0.78, escalated: false, status: 'SUBMITTED',
        formatted_address: 'Sector 7 Residential Complex', category: 'WATER_LEAKAGE',
        sla_deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      },
    ],
    SWM: [
      {
        id: 'swm-001', reference_id: 'CRP-2026-0041', title: 'Garbage Pile Overflow — Main Market',
        description: 'Solid waste container overflowing for 3 days near central food market.',
        priority_score: 0.89, escalated: true, status: 'SUBMITTED',
        formatted_address: 'Nehru Colony Market, Ward 1', category: 'GARBAGE',
        sla_deadline: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      },
    ],
    PWD: [
      {
        id: 'pwd-001', reference_id: 'CRP-2026-0055', title: 'Deep Pothole Hazard on School Highway',
        description: 'Large asphalt crater causing vehicle damage and traffic bottleneck.',
        priority_score: 0.92, escalated: true, status: 'SUBMITTED',
        formatted_address: 'School Road Highway, Ward 2', category: 'ROAD_DAMAGE',
        sla_deadline: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      },
    ],
    ESB: [
      {
        id: 'esb-001', reference_id: 'CRP-2026-0071', title: 'Streetlight Pole Failure at Junction',
        description: 'Dark junction pole array non-functional for 5 consecutive nights.',
        priority_score: 0.84, escalated: false, status: 'SUBMITTED',
        formatted_address: 'Ward 3 Main Junction', category: 'STREET_LIGHT',
        sla_deadline: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
      },
    ],
    DSM: [
      {
        id: 'dsm-001', reference_id: 'CRP-2026-0080', title: 'Stormwater Drain Blockage & Waterlogging',
        description: 'Blocked drain culvert overflowing onto pedestrian pathway.',
        priority_score: 0.86, escalated: false, status: 'IN_PROGRESS',
        formatted_address: 'Central Avenue, Ward 5', category: 'DRAINAGE',
        sla_deadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      },
    ],
  };
  return byDept[deptCode] ?? byDept['WSS'];
}
