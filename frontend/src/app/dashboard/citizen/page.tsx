'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  PlusCircle, 
  Search, 
  MapPin, 
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

interface GrievanceItem {
  id: string;
  ticketNumber: string;
  category: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'DUPLICATE_GROUPED' | 'CLOSED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  location: string;
}

const MOCK_CITIZEN_GRIEVANCES: GrievanceItem[] = [
  {
    id: 'g-101',
    ticketNumber: 'CIV-2026-8942',
    category: 'Water Supply',
    title: 'Pipeline leakage on Main MG Road near Ward 4',
    status: 'IN_PROGRESS',
    urgency: 'HIGH',
    createdAt: '2026-08-07T10:30:00Z',
    location: 'Ward 4, West Zone'
  },
  {
    id: 'g-102',
    ticketNumber: 'CIV-2026-7740',
    category: 'Public Works',
    title: 'Deep pothole causing traffic obstruction on Flyover Road',
    status: 'PENDING',
    urgency: 'MEDIUM',
    createdAt: '2026-08-06T14:15:00Z',
    location: 'Ward 12, South District'
  },
  {
    id: 'g-103',
    ticketNumber: 'CIV-2026-6119',
    category: 'Solid Waste',
    title: 'Uncollected community dump near Sector 9 market',
    status: 'RESOLVED',
    urgency: 'LOW',
    createdAt: '2026-08-02T09:00:00Z',
    location: 'Ward 9, Sector 9'
  },
  {
    id: 'g-104',
    ticketNumber: 'CIV-2026-5502',
    category: 'Electricity',
    title: 'Non-functional streetlights on Colony Main Street',
    status: 'DUPLICATE_GROUPED',
    urgency: 'MEDIUM',
    createdAt: '2026-07-29T18:45:00Z',
    location: 'Ward 2, East Zone'
  }
];

export default function CitizenDashboardPage() {
  const router = useRouter();
  const [grievances, setGrievances] = useState<GrievanceItem[]>(MOCK_CITIZEN_GRIEVANCES);
  const [trackSearchInput, setTrackSearchInput] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/v1/complaints')
      .then(res => res.json())
      .then(data => {
        if (data.complaints && Array.isArray(data.complaints) && data.complaints.length > 0) {
          const mapped = data.complaints.map((c: any) => ({
            id: c.id,
            ticketNumber: c.ticket_number || c.tracking_id || c.id,
            category: c.category || 'General Civic',
            title: c.title,
            status: c.status || 'PENDING',
            urgency: c.urgency || 'MEDIUM',
            createdAt: c.created_at || new Date().toISOString(),
            location: c.location_name || 'Municipal Area'
          }));
          setGrievances(mapped);
        }
      })
      .catch(() => {})
      .finally(() => {});
  }, []);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackSearchInput.trim()) {
      router.push(`/track/${encodeURIComponent(trackSearchInput.trim())}`);
    }
  };

  const totalSubmitted = grievances.length;
  const activeCount = grievances.filter(g => g.status === 'IN_PROGRESS' || g.status === 'PENDING').length;
  const resolvedCount = grievances.filter(g => g.status === 'RESOLVED' || g.status === 'CLOSED').length;

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Header Row */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-blue-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-800" /> Civic Governance Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Citizen Grievance Dashboard
            </h1>
            <p className="text-slate-600 text-xs md:text-sm mt-1">
              File new complaints, track real-time SLA progress, and inspect official resolution timelines.
            </p>
          </div>

          <Link
            href="/submit"
            className="px-5 py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs md:text-sm flex items-center gap-2 shadow-sm shrink-0 transition-colors focus:ring-2 focus:ring-blue-800 focus:outline-none"
          >
            <PlusCircle className="w-4 h-4" /> File New Grievance
          </Link>
        </div>

        {/* Search Bar for Public Tracking */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <span className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-blue-800" /> Track Grievance Status:
          </span>
          <form onSubmit={handleTrackSubmit} className="flex gap-2 w-full">
            <input
              type="text"
              value={trackSearchInput}
              onChange={(e) => setTrackSearchInput(e.target.value)}
              placeholder="Enter Tracking Reference ID (e.g. CIV-2026-8942)"
              className="flex-1 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-lg shrink-0 transition-colors"
            >
              Track Ticket
            </button>
          </form>
        </div>

        {/* Overview Cards (Grid layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Submitted
              </span>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {totalSubmitted}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Registered civic complaint submissions
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Issues (In Progress)
              </span>
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {activeCount}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Currently assigned &amp; being resolved by officers
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Resolved Issues
              </span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {resolvedCount}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Successfully inspected and closed
            </p>
          </div>
        </div>

        {/* Main Content Area: Recent Grievances Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Grievances</h2>
              <p className="text-xs text-slate-500">
                Live list of registered complaints and status updates. Click any ticket number to view public audit timeline.
              </p>
            </div>

            <Link
              href="/submit"
              className="text-xs font-bold text-blue-800 hover:text-blue-900 inline-flex items-center gap-1"
            >
              Submit another grievance <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-6">Tracking Reference</th>
                  <th className="py-3 px-6">Title &amp; Location</th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Submission Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {grievances.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-blue-800">
                      <Link
                        href={`/track/${item.ticketNumber}`}
                        className="inline-flex items-center gap-1 hover:underline text-blue-800"
                      >
                        <span>{item.ticketNumber}</span>
                        <ExternalLink className="w-3 h-3 text-blue-600" />
                      </Link>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {item.location}
                      </p>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-700">
                      {item.category}
                    </td>
                    <td className="py-4 px-6">
                      {item.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300 font-extrabold text-[10px] uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 animate-pulse" />
                          Pending
                        </span>
                      )}
                      {item.status === 'IN_PROGRESS' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-extrabold text-[10px] uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                          In Progress
                        </span>
                      )}
                      {item.status === 'RESOLVED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[10px] uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Resolved
                        </span>
                      )}
                      {item.status === 'DUPLICATE_GROUPED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] uppercase tracking-wider">
                          <Layers className="w-3 h-3 text-amber-700" />
                          Grouped
                        </span>
                      )}
                      {item.status === 'CLOSED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-extrabold text-[10px] uppercase tracking-wider">
                          Closed
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
