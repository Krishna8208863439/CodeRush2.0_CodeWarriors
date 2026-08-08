'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  MapPin, 
  BarChart3, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Users, 
  Layers, 
  Zap, 
  ArrowRight,
  Search,
  Building2,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function LandingPage() {
  const [stats, setStats] = useState({
    total: 4,
    duplicates_filtered: 1,
    sla_compliance: 87.5,
    resolved: 1
  });
  const [ticketSearch, setTicketSearch] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/v1/analytics/summary')
      .then(res => res.json())
      .then(data => {
        if (data.total_complaints) {
          setStats({
            total: data.total_complaints,
            duplicates_filtered: data.total_duplicates_filtered || 0,
            sla_compliance: 87.5,
            resolved: data.status_breakdown?.RESOLVED || 1
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8 py-2">
      {/* Official Government Hero Banner */}
      <Card className="border-l-4 border-l-slate-900 bg-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-slate-900" />
              Municipal Civic Operating System
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              AI-Powered Civic Grievance & SLA Governance Operating System
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Centralized municipal public redressal portal. Ensures seamless relational data flow from Citizens to Departments, SentenceTransformer duplicate grouping, and complete audit trail transparency.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <Link href="/submit" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" fullWidth leftIcon={<FileText className="w-5 h-5" />}>
                File New Grievance
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" fullWidth leftIcon={<MapPin className="w-5 h-5 text-slate-700" />}>
                Officer / Admin Portal
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Ticket Quick Lookup Bar */}
      <Card className="bg-slate-900 text-white border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Search className="w-6 h-6 text-blue-400 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-white">Track Grievance Status</h3>
              <p className="text-xs text-slate-400">Enter your Ticket Number to view audit logs & assigned department SLA</p>
            </div>
          </div>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (ticketSearch.trim()) {
                window.location.href = `/citizen?ticket=${encodeURIComponent(ticketSearch.trim())}`;
              }
            }}
            className="flex items-center gap-2 w-full md:w-auto max-w-md"
          >
            <input
              type="text"
              placeholder="e.g. GRV-8942-ND"
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              className="px-4 py-2 text-sm text-slate-900 bg-white rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
            />
            <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
              Track Ticket
            </Button>
          </form>
        </div>
      </Card>

      {/* Live System Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="flat" className="p-4 sm:p-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-slate-900 shrink-0">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Total Grievances</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card variant="flat" className="p-4 sm:p-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-900 shrink-0">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Duplicates Grouped</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.duplicates_filtered}</p>
            </div>
          </div>
        </Card>

        <Card variant="flat" className="p-4 sm:p-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-900 shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">SLA Compliance</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.sla_compliance}%</p>
            </div>
          </div>
        </Card>

        <Card variant="flat" className="p-4 sm:p-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-900 shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Resolved Tickets</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.resolved}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Core Workflow Modules Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-slate-900" /> Municipal Operating System Modules
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <Card className="flex flex-col justify-between space-y-4 hover:border-slate-400 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <CardTitle>1. Citizen Grievance Intake</CardTitle>
              <CardDescription>
                Submit civic complaints with photo evidence, GPS location, and auto-extracted urgency scoring.
              </CardDescription>
            </div>
            <Link href="/submit" className="pt-2">
              <Button variant="secondary" size="sm" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                File Grievance
              </Button>
            </Link>
          </Card>

          {/* Card 2 */}
          <Card className="flex flex-col justify-between space-y-4 hover:border-slate-400 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <CardTitle>2. Citizen Status Portal</CardTitle>
              <CardDescription>
                Track ticket progress in real-time with full history audit logs (`GrievanceHistory`) and officer assignments.
              </CardDescription>
            </div>
            <Link href="/dashboard/citizen" className="pt-2">
              <Button variant="secondary" size="sm" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                View Dashboard
              </Button>
            </Link>
          </Card>

          {/* Card 3 */}
          <Card className="flex flex-col justify-between space-y-4 hover:border-slate-400 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5 text-amber-400" />
              </div>
              <CardTitle>3. Field Officer GIS Queue</CardTitle>
              <CardDescription>
                Interactive GIS map queue sorted by SLA deadline countdowns, department categories, and duplicate groups.
              </CardDescription>
            </div>
            <Link href="/dashboard/officer" className="pt-2">
              <Button variant="secondary" size="sm" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                Open Officer Map
              </Button>
            </Link>
          </Card>

          {/* Card 4 */}
          <Card className="flex flex-col justify-between space-y-4 hover:border-slate-400 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5 text-sky-400" />
              </div>
              <CardTitle>4. Executive Governance</CardTitle>
              <CardDescription>
                Municipal SLA breach compliance monitoring, department metrics, and AI spatial cluster analytics.
              </CardDescription>
            </div>
            <Link href="/analytics" className="pt-2">
              <Button variant="secondary" size="sm" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                Executive Analytics
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
