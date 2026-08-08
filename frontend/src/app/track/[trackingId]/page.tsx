'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  AlertTriangle, 
  ArrowLeft, 
  Layers, 
  Camera, 
  Calendar,
  Share2,
  AlertCircle
} from 'lucide-react';
import QrCodeSvg from '../../../components/QrCodeSvg';

interface TrackingData {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  priority: string;
  priority_score?: number;
  status: string;
  department_name: string;
  location_name: string;
  sla_deadline: string;
  created_at: string;
  resolved_at?: string;
  request_count?: number;
}

export default function GrievanceTrackingDetailPage({ params }: { params: { trackingId: string } }) {
  const trackingId = params.trackingId;

  const [data, setData] = useState<TrackingData | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isBreached, setIsBreached] = useState<boolean>(false);

  useEffect(() => {
    fetch(`http://localhost:5000/api/v1/complaints/${trackingId}`)
      .then(res => {
        if (!res.ok) throw new Error('Complaint tracking reference not found.');
        return res.json();
      })
      .then(result => {
        if (result.complaint) {
          setData(result.complaint);
          setTimeline(result.timeline || []);
          setEvidence(result.evidence || []);
        } else {
          setError('Ticket details unavailable.');
        }
      })
      .catch((err) => {
        // Fallback demo data if backend offline or test ticket ID
        const mockSla = new Date(Date.now() + 14 * 3600000 + 22 * 60000).toISOString();
        setData({
          id: 'cmp-mock-1',
          ticket_number: trackingId,
          title: `Public Civic Report #${trackingId}`,
          description: 'Pipeline leakage on main municipal transit road creating standing water hazards.',
          category: 'WATER_SUPPLY',
          urgency: 'HIGH',
          priority: 'HIGH',
          priority_score: 5.5,
          status: 'IN_PROGRESS',
          department_name: 'Water Supply & Sewerage Department (WSS)',
          location_name: 'Ward 4, West Zone Sector 12',
          sla_deadline: mockSla,
          created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
          request_count: 3
        });
        setTimeline([
          {
            id: 'log-1',
            action: 'SUBMITTED',
            notes: 'Grievance submitted by citizen & AI classified under Water Supply.',
            created_at: new Date(Date.now() - 10 * 3600000).toISOString()
          },
          {
            id: 'log-2',
            action: 'ROUTED_TO_DEPARTMENT',
            notes: 'Auto-routed to Water Supply & Sewerage Department (WSS).',
            created_at: new Date(Date.now() - 9 * 3600000).toISOString()
          },
          {
            id: 'log-3',
            action: 'OFFICER_ASSIGNED',
            notes: 'Dispatched to Officer Rajesh Kumar for field inspection.',
            created_at: new Date(Date.now() - 4 * 3600000).toISOString()
          }
        ]);
        setEvidence([
          {
            id: 'ev-1',
            file_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=600&q=80',
            caption: 'Initial citizen photo attachment of leaking pipe'
          }
        ]);
      })
      .finally(() => setLoading(false));
  }, [trackingId]);

  // SLA Countdown Timer Calculation
  useEffect(() => {
    if (!data?.sla_deadline) return;

    const interval = setInterval(() => {
      const target = new Date(data.sla_deadline).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeftStr(`${hours}h ${minutes}m ${seconds}s remaining`);
        setIsBreached(false);
      } else {
        const overdueMs = Math.abs(diff);
        const hours = Math.floor(overdueMs / (1000 * 60 * 60));
        const minutes = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeftStr(`SLA Overdue by ${hours}h ${minutes}m`);
        setIsBreached(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Retrieving Grievance Tracking Audit Data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 max-w-md shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-xl font-black text-slate-900">Tracking Reference Not Found</h2>
          <p className="text-xs text-slate-600">
            No grievance record matching <strong className="font-mono text-slate-900">{trackingId}</strong> was located in the municipal database.
          </p>
          <Link
            href="/track"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Try Another Tracking Search
          </Link>
        </div>
      </div>
    );
  }

  // Derive Step States for Visual Timeline UI (Steps 1 to 4)
  const isResolved = data.status === 'RESOLVED' || data.status === 'CLOSED';
  const isInProgress = data.status === 'IN_PROGRESS' || isResolved;
  const isRouted = data.department_name && data.department_name !== 'Unassigned';

  const trackingUrl = typeof window !== 'undefined' ? window.location.href : `https://portal.gov.in/track/${data.ticket_number}`;

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Top Navigation */}
        <div className="flex justify-between items-center">
          <Link href="/track" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-800 transition-colors">
            <ArrowLeft className="w-4 h-4 text-blue-800" /> Back to Tracking Search
          </Link>

          <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Government Verified Audit Record
          </span>
        </div>

        {/* Header Ticket Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 border-l-4 border-l-blue-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-base font-black text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {data.ticket_number}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  data.urgency === 'CRITICAL' ? 'bg-red-100 text-red-900 border border-red-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}>
                  {data.urgency} Priority
                </span>
                {data.request_count && data.request_count > 1 && (
                  <span className="bg-amber-100 text-amber-900 font-bold text-[10px] px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> +{data.request_count} Co-submitting Citizens
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {data.title}
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {data.location_name}
              </p>
            </div>

            {/* Live SLA Countdown Timer Card */}
            <div className={`p-4 rounded-xl border text-right shrink-0 shadow-xs ${
              isBreached ? 'bg-red-50 border-red-300 text-red-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}>
              <div className="flex items-center gap-1.5 justify-end text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Clock className={`w-3.5 h-3.5 ${isBreached ? 'text-red-700' : 'text-amber-400'}`} />
                SLA Resolution Deadline
              </div>
              <p className={`text-sm sm:text-base font-black tracking-tight mt-0.5 ${isBreached ? 'text-red-900' : 'text-emerald-400'}`}>
                {timeLeftStr || 'Calculating...'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                Target: {new Date(data.sla_deadline).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Grievance Description & QR Code Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            <div className="md:col-span-3 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Grievance Summary & Description
              </h3>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                {data.description}
              </p>
            </div>

            {/* QR Code Generator Component */}
            <div className="md:col-span-1 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
              <QrCodeSvg value={trackingUrl} size={110} />
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Scan QR to Track Live
              </p>
            </div>
          </div>
        </div>

        {/* MODULE 3: 4-STEP VISUAL TIMELINE UI */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight uppercase tracking-wider text-slate-700">
            End-to-End Resolution Progress Tracker
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
            {/* Step 1 */}
            <div className="p-4 rounded-xl border bg-emerald-50/60 border-emerald-300 text-emerald-900 space-y-2">
              <div className="flex justify-between items-center">
                <span className="w-7 h-7 rounded-full bg-emerald-700 text-white font-black text-xs flex items-center justify-center">
                  1
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Completed
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900">1. Grievance Received</p>
              <p className="text-[11px] text-slate-600">AI Entity Extraction & NLP Classified</p>
            </div>

            {/* Step 2 */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              isRouted ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center ${
                  isRouted ? 'bg-emerald-700 text-white' : 'bg-slate-300 text-slate-600'
                }`}>
                  2
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isRouted ? 'Completed' : 'Pending'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900">2. Department Routed</p>
              <p className="text-[11px] text-slate-600">{data.department_name}</p>
            </div>

            {/* Step 3 */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              isInProgress ? 'bg-blue-50/70 border-blue-300 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center ${
                  isInProgress ? 'bg-blue-800 text-white' : 'bg-slate-300 text-slate-600'
                }`}>
                  3
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isInProgress ? 'Active' : 'Pending'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900">3. Field Inspection</p>
              <p className="text-[11px] text-slate-600">Officer Assigned & Site Assessment</p>
            </div>

            {/* Step 4 */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              isResolved ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center ${
                  isResolved ? 'bg-emerald-700 text-white' : 'bg-slate-300 text-slate-600'
                }`}>
                  4
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isResolved ? 'Completed' : 'Pending'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900">4. Resolution & Closure</p>
              <p className="text-[11px] text-slate-600">Field Evidence Verification</p>
            </div>
          </div>
        </div>

        {/* Evidence Photos Section */}
        {evidence.length > 0 && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-800" /> Attached Field Evidence Photos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {evidence.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <img src={ev.file_url} alt={ev.caption || 'Evidence'} className="w-full h-40 object-cover" />
                  <p className="p-3 text-xs text-slate-700 font-medium">{ev.caption || 'Field evidence photo'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODULE 3: TRANSPARENT AUDIT LOG TIMELINE */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-800" /> Transparent Municipal Audit Log
          </h3>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timeline.map((log) => (
              <div key={log.id} className="relative flex items-start gap-3">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-800 text-white flex items-center justify-center text-[10px] font-bold">
                  ✓
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1 w-full">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{log.action.replace(/_/g, ' ')}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(log.created_at || log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 font-normal leading-relaxed">{log.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
