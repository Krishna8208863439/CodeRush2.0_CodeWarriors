'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Users, HelpCircle, Activity, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'users' | 'review' | 'appeals' | 'health'>('users');

  async function fetchAdminData() {
    try {
      const res = await api.get('/dashboard/admin');
      setData(res.data);
    } catch (err: any) {
      console.error('Admin data load error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-slate-400 text-sm flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          Loading System Administrator panel...
        </div>
      </div>
    );
  }

  const { users, reviewQueue, appeals } = data || { users: [], reviewQueue: [], appeals: [] };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">System Administrator Control Panel</h1>
            <p className="text-xs text-slate-400">User management, low-confidence AI review queue, and appeals resolution</p>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 max-w-xl">
        <button
          onClick={() => setTab('users')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
            tab === 'users' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setTab('review')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
            tab === 'review' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Review Queue ({reviewQueue.length})
        </button>
        <button
          onClick={() => setTab('appeals')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
            tab === 'appeals' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Appeals ({appeals.length})
        </button>
      </div>

      {/* Tab Contents */}
      {tab === 'users' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white">Registered System Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-semibold text-white">{u.name}</td>
                    <td className="p-3 text-slate-400">{u.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.is_locked ? (
                        <span className="text-red-400 text-[10px] font-bold">LOCKED</span>
                      ) : (
                        <span className="text-green-400 text-[10px] font-bold">ACTIVE</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'review' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white">Low-Confidence AI Prediction Queue (&lt;80% Confidence)</h3>
          {reviewQueue.length === 0 ? (
            <p className="text-xs text-slate-500">No complaints currently flagged for human manual review.</p>
          ) : (
            <div className="space-y-4">
              {reviewQueue.map((rq: any) => (
                <div key={rq.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-mono text-xs font-bold text-cyan-400">{rq.reference_id}</span>
                    <p className="text-sm font-bold text-white mt-1">{rq.title}</p>
                    <p className="text-xs text-amber-400 mt-1">Confidence Score: {(rq.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <button className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-white">
                    Manually Override Routing
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'appeals' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white">Pending Citizen Appeals</h3>
          {appeals.length === 0 ? (
            <p className="text-xs text-slate-500">No citizen appeals currently pending administrator resolution.</p>
          ) : (
            <div className="space-y-4">
              {appeals.map((app: any) => (
                <div key={app.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-cyan-400">{app.reference_id}</span>
                    <span className="text-xs text-slate-400">Submitted by: {app.citizen_name}</span>
                  </div>
                  <p className="text-xs text-slate-300 italic">"{app.reason}"</p>
                  <button className="px-4 py-1.5 rounded-xl glass-button text-xs font-bold text-white mt-2">
                    Resolve Appeal & Re-Route Department
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
