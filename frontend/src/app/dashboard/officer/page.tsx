'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ShieldAlert, 
  MapPin, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Building2,
  FileCheck,
  PlayCircle,
  CheckCircle,
  Filter,
  UserCheck,
  Flame,
  Info,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { MUNICIPAL_DEPARTMENTS } from '../../../lib/constants';

interface Grievance {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  target_department_code?: string;
  department_id: string;
  department_name?: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priorityScore?: number;
  priority_score?: number;
  priority_breakdown?: {
    base_weight?: number;
    severity_bonus?: number;
    geo_multiplier?: number;
    explanation?: string;
  };
  reportCount?: number;
  report_count?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'DUPLICATE_GROUPED';
  location_name: string;
  sla_deadline: string;
  created_at: string;
}

const INITIAL_DEPARTMENT_TICKETS: Grievance[] = [
  {
    id: 'cmp-w1',
    ticket_number: 'CIV-2026-8942',
    title: 'Major Water Pipeline Leakage on MG Road',
    description: 'Clean drinking water is gushing out on Main MG Road near Ward 4.',
    category: 'WATER_SUPPLY',
    target_department_code: 'WSS',
    department_id: 'd3333333-3333-3333-3333-333333333333',
    department_name: 'Water Supply & Sewerage',
    urgency: 'HIGH',
    priority: 'HIGH',
    priority_score: 75.6,
    priority_breakdown: {
      base_weight: 70,
      severity_bonus: 15,
      geo_multiplier: 1.4,
      explanation: 'Category Base: 70 | Severity Bonus: +15 | Location Multiplier: x1.4 (3 Reports)'
    },
    report_count: 3,
    status: 'PENDING',
    location_name: 'Ward 4, West Zone Sector 12',
    sla_deadline: new Date(Date.now() + 18 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 4 * 3600000).toISOString()
  },
  {
    id: 'cmp-w2',
    ticket_number: 'CIV-2026-8990',
    title: 'Contaminated Water Supply & Sewage Burst in Sector 14',
    description: 'Tap water coming with brownish tint and sewage overflow hazard near school.',
    category: 'WATER_SUPPLY',
    target_department_code: 'WSS',
    department_id: 'd3333333-3333-3333-3333-333333333333',
    department_name: 'Water Supply & Sewerage',
    urgency: 'CRITICAL',
    priority: 'CRITICAL',
    priority_score: 94.5,
    priority_breakdown: {
      base_weight: 75,
      severity_bonus: 25,
      geo_multiplier: 1.8,
      explanation: 'Category Base: 75 | Severity Bonus: +25 | Location Multiplier: x1.8 (5 Reports)'
    },
    report_count: 5,
    status: 'IN_PROGRESS',
    location_name: 'Ward 14, Sector 14 Colony',
    sla_deadline: new Date(Date.now() + 6 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 8 * 3600000).toISOString()
  },
  {
    id: 'cmp-r1',
    ticket_number: 'CIV-2026-7740',
    title: 'Deep Pothole Obstruction near City Flyover',
    description: 'A deep dangerous pothole has developed on the flyover descent.',
    category: 'ROADS',
    target_department_code: 'ROADS',
    department_id: 'd1111111-1111-1111-1111-111111111111',
    department_name: 'Public Works & Roads',
    urgency: 'MEDIUM',
    priority: 'MEDIUM',
    priority_score: 45.2,
    priority_breakdown: {
      base_weight: 60,
      severity_bonus: 0,
      geo_multiplier: 1.0,
      explanation: 'Category Base: 60 | Severity Bonus: +0 | Location Multiplier: x1.0 (1 Report)'
    },
    report_count: 1,
    status: 'PENDING',
    location_name: 'Ward 12, South District Flyover',
    sla_deadline: new Date(Date.now() + 32 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 12 * 3600000).toISOString()
  },
  {
    id: 'cmp-e1',
    ticket_number: 'CIV-2026-5502',
    title: 'High Voltage Electrical Wire Sparking Near School',
    description: 'Exposed overhead power wire sparking continuously during wind near Primary School Gate 2.',
    category: 'ELECTRICITY',
    target_department_code: 'ELEC',
    department_id: 'd4444444-4444-4444-4444-444444444444',
    department_name: 'Electricity & Street Lighting',
    urgency: 'CRITICAL',
    priority: 'CRITICAL',
    priority_score: 98.0,
    priority_breakdown: {
      base_weight: 95,
      severity_bonus: 25,
      geo_multiplier: 2.5,
      explanation: 'Category Base: 95 | Severity Bonus: +25 | Location Multiplier: x2.5 (10 Reports)'
    },
    report_count: 10,
    status: 'PENDING',
    location_name: 'Ward 2, Primary School Gate 2',
    sla_deadline: new Date(Date.now() + 4 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 6 * 3600000).toISOString()
  }
];

function OfficerWorkspaceContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const sessionDeptId = (session?.user as any)?.departmentId;
  const sessionDeptCode = (session?.user as any)?.departmentCode;
  const urlDeptCode = searchParams.get('dept');
  
  const activeDeptCode = urlDeptCode || sessionDeptCode || 'WSS';

  const currentDept = MUNICIPAL_DEPARTMENTS.find(d => 
    d.code === activeDeptCode || 
    d.deptId === sessionDeptId
  ) || MUNICIPAL_DEPARTMENTS[0];

  const [allTickets, setAllTickets] = useState<Grievance[]>(INITIAL_DEPARTMENT_TICKETS);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/complaints');
      if (res.ok) {
        const data = await res.json();
        if (data.complaints && Array.isArray(data.complaints) && data.complaints.length > 0) {
          setAllTickets(data.complaints);
        }
      }
    } catch (e) {
      // Keep initial tickets
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // STEP 3: Department Isolation Logic
  const filteredQueue = allTickets.filter(item => {
    const itemDeptCode = item.target_department_code || item.category || '';
    const itemDeptId = item.department_id;

    if (currentDept.code === 'WSS') {
      return itemDeptCode === 'WSS' || itemDeptCode === 'WATER_SUPPLY' || itemDeptId === currentDept.deptId;
    } else if (currentDept.code === 'PWR' || currentDept.code === 'ROADS') {
      return itemDeptCode === 'PWR' || itemDeptCode === 'ROADS' || itemDeptCode === 'PUBLIC_WORKS' || itemDeptId === currentDept.deptId;
    } else if (currentDept.code === 'SSW' || currentDept.code === 'SWM') {
      return itemDeptCode === 'SSW' || itemDeptCode === 'SWM' || itemDeptCode === 'SOLID_WASTE' || itemDeptId === currentDept.deptId;
    } else if (currentDept.code === 'ESL' || currentDept.code === 'ELEC') {
      return itemDeptCode === 'ESL' || itemDeptCode === 'ELEC' || itemDeptCode === 'ELECTRICITY' || itemDeptId === currentDept.deptId;
    }

    return itemDeptCode === currentDept.code || itemDeptId === currentDept.deptId;
  });

  // STEP 4 #1: Sort Queue by ML Priority Score (Highest score / urgency first)
  const sortedQueue = [...filteredQueue].sort((a, b) => {
    const scoreA = a.priority_score ?? a.priorityScore ?? (a.priority === 'CRITICAL' ? 90 : a.priority === 'HIGH' ? 70 : 40);
    const scoreB = b.priority_score ?? b.priorityScore ?? (b.priority === 'CRITICAL' ? 90 : b.priority === 'HIGH' ? 70 : 40);
    return scoreB - scoreA;
  });

  const handleUpdateStatus = async (id: string, newStatus: 'IN_PROGRESS' | 'RESOLVED') => {
    setUpdatingId(id);

    setAllTickets(prev => prev.map(ticket => {
      if (ticket.id === id || ticket.ticket_number === id) {
        return { ...ticket, status: newStatus };
      }
      return ticket;
    }));

    try {
      await fetch(`http://localhost:5000/api/v1/complaints/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus, 
          notes: `Status updated to ${newStatus} by ${currentDept.name} Officer.` 
        })
      });
    } catch (e) {
      console.warn('Backend patch attempted locally.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openCount = sortedQueue.filter(g => g.status === 'PENDING' || g.status === 'IN_PROGRESS').length;
  const criticalCount = sortedQueue.filter(g => (g.priority || g.urgency) === 'CRITICAL').length;
  const completedCount = sortedQueue.filter(g => g.status === 'RESOLVED' || g.status === 'CLOSED').length;

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-amber-500">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 text-amber-400 font-extrabold text-xs mb-2 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" /> ML Dynamic Priority Dispatch Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Department Officer Workspace
            </h1>
            <p className="text-slate-600 text-xs md:text-sm mt-1">
              Active assigned queue for <strong className="text-slate-900">{currentDept.name} ({currentDept.code})</strong>. Automatically ranked by ML priority prediction score &amp; report frequency.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-700 shrink-0 hidden sm:inline flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Department View:
            </span>
            <select
              value={currentDept.code}
              onChange={e => {
                const target = MUNICIPAL_DEPARTMENTS.find(d => d.code === e.target.value);
                if (target) {
                  window.location.href = `/dashboard/officer?dept=${target.code}`;
                }
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-xs cursor-pointer"
            >
              {MUNICIPAL_DEPARTMENTS.map(d => (
                <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
              ))}
            </select>

            <button
              onClick={fetchComplaints}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-950 text-white shadow-xs border border-slate-950 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Assigned Open Tickets
              </span>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {openCount}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Ranked by ML priority prediction score
            </p>
          </div>

          <div className="bg-red-50 p-6 rounded-xl border border-red-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-red-900">
                Critical Urgency Hazards
              </span>
              <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-red-900 tracking-tight">
              {criticalCount}
            </p>
            <p className="text-[11px] text-red-800 font-semibold">
              Highest priority dispatch items (Score &gt; 85.0)
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Completed &amp; Resolved
              </span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {completedCount}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Closed tickets with verified resolution
            </p>
          </div>
        </div>

        {/* STEP 4: ML Priority Sorted Queue Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[11px] font-bold uppercase tracking-wider mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-800" /> Sorted by ML Priority Score (Highest First)
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {currentDept.name} Dispatch Queue ({sortedQueue.length})
              </h2>
            </div>

            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Isolated View Active
            </span>
          </div>

          <div className="overflow-x-auto">
            {sortedQueue.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs bg-slate-50">
                No active grievances assigned to {currentDept.name}.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-6">Ticket Ref</th>
                    <th className="py-3 px-6">Title &amp; Location</th>
                    <th className="py-3 px-6">ML Priority Score</th>
                    <th className="py-3 px-6">Report Frequency</th>
                    <th className="py-3 px-6">Current Status</th>
                    <th className="py-3 px-6 text-right">Officer Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sortedQueue.map((ticket) => {
                    const isUpdating = updatingId === ticket.id || updatingId === ticket.ticket_number;
                    const pLevel = ticket.priority || ticket.urgency || 'MEDIUM';
                    const pScore = ticket.priority_score ?? ticket.priorityScore ?? 50.0;
                    const reports = ticket.report_count ?? ticket.reportCount ?? 1;
                    const explanation = ticket.priority_breakdown?.explanation || `Category Base: 50 | Severity Bonus: +15 | Location Multiplier: x${reports >= 5 ? '1.8' : '1.0'} (${reports} Reports)`;

                    return (
                      <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-blue-800">
                          {ticket.ticket_number}
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-900">{ticket.title}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {ticket.location_name}
                          </p>
                        </td>

                        {/* STEP 4 #2 & #4: ML Priority Badges & Score Tooltip */}
                        <td className="py-4 px-6">
                          <div className="group relative inline-block">
                            {pLevel === 'CRITICAL' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-900 border border-red-300 font-black text-[10px] uppercase tracking-wider animate-pulse cursor-help">
                                <AlertTriangle className="w-3 h-3 text-red-700" />
                                CRITICAL ({pScore.toFixed(1)})
                              </span>
                            )}
                            {pLevel === 'HIGH' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-900 border border-orange-300 font-bold text-[10px] uppercase tracking-wider cursor-help">
                                HIGH ({pScore.toFixed(1)})
                              </span>
                            )}
                            {pLevel === 'MEDIUM' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300 font-bold text-[10px] uppercase tracking-wider cursor-help">
                                MEDIUM ({pScore.toFixed(1)})
                              </span>
                            )}
                            {pLevel === 'LOW' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 font-bold text-[10px] uppercase tracking-wider cursor-help">
                                LOW ({pScore.toFixed(1)})
                              </span>
                            )}

                            {/* ML Score Tooltip */}
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-30 border border-slate-700 pointer-events-none">
                              <p className="font-bold text-amber-400 mb-1 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> ML Priority Breakdown:
                              </p>
                              <p className="text-slate-200 leading-tight">{explanation}</p>
                            </div>
                          </div>
                        </td>

                        {/* STEP 4 #3: Report Count Indicator */}
                        <td className="py-4 px-6">
                          {reports > 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                              <Flame className="w-3 h-3 text-amber-700 shrink-0" />
                              🔥 {reports} Citizens Reported This
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">
                              1 Citizen Report
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          {ticket.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300 font-extrabold text-[10px] uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 animate-pulse" />
                              Pending
                            </span>
                          )}
                          {ticket.status === 'IN_PROGRESS' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-extrabold text-[10px] uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                              In Progress
                            </span>
                          )}
                          {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[10px] uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              Completed
                            </span>
                          )}
                          {ticket.status === 'DUPLICATE_GROUPED' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] uppercase tracking-wider">
                              <Layers className="w-3 h-3 text-amber-700" />
                              Grouped
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {ticket.status !== 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleUpdateStatus(ticket.id, 'IN_PROGRESS')}
                                disabled={isUpdating}
                                className="px-3 py-1.5 rounded bg-blue-800 hover:bg-blue-900 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                              >
                                <PlayCircle className="w-3.5 h-3.5" /> Mark In Progress
                              </button>
                            )}

                            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                              <button
                                onClick={() => handleUpdateStatus(ticket.id, 'RESOLVED')}
                                disabled={isUpdating}
                                className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
                              </button>
                            )}

                            {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Resolution Logged
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function OfficerDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Department Officer Queue...</div>}>
      <OfficerWorkspaceContent />
    </Suspense>
  );
}
