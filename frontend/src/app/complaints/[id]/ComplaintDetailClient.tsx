'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ShieldCheck, Clock, MapPin, AlertTriangle, ChevronLeft,
  Cpu, FileText, MessageSquare, Star, CheckCircle, Eye,
  Layers, HelpCircle, Download, Edit3, CheckSquare, UserCheck,
  Share2, ExternalLink
} from 'lucide-react';
import { api } from '@/lib/api';

export default function ComplaintDetailClient() {
  const params = useParams();
  const complaintId = (params?.id as string) || 'demo';

  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadComplaint() {
      setLoading(true);
      try {
        const res = await api.get(`/complaints/${complaintId}`);
        setComplaint(res.data);
      } catch {
        setComplaint({
          id: complaintId,
          reference_id: 'CRP-2026-444624',
          title: 'Major pipeline leakage near Kurla West station',
          description: 'High pressure clean water leaking onto the street.',
          category: 'WATER_LEAKAGE',
          status: 'IN_PROGRESS',
          priority: 'CRITICAL',
          priority_score: 95,
          assigned_department: 'Water Works Department (WSS)',
          formatted_address: 'Kurla West, Mumbai',
          created_at: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    }
    loadComplaint();
  }, [complaintId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading complaint details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/map" className="inline-flex items-center gap-2 text-cyan-400 hover:underline text-sm font-semibold">
          <ChevronLeft className="w-4 h-4" /> Back to Spatial Map
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400">{complaint?.reference_id}</span>
              <h1 className="text-2xl font-bold text-slate-100 mt-1">{complaint?.title}</h1>
              <p className="text-slate-400 text-sm mt-2">{complaint?.description}</p>
            </div>
            <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs rounded-full uppercase">
              {complaint?.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block uppercase font-semibold">Category</span>
              <span className="font-bold text-slate-200">{complaint?.category}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-semibold">Department</span>
              <span className="font-bold text-slate-200">{complaint?.assigned_department}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-semibold">Priority</span>
              <span className="font-bold text-rose-400">{complaint?.priority}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
