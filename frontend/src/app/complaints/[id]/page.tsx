'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ShieldCheck,
  Clock,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  Cpu,
  FileText,
  MessageSquare,
  Star,
  CheckCircle,
  Eye,
  Layers,
  HelpCircle,
  Download,
  Edit3,
  CheckSquare,
  UserCheck,
  Share2,
  ExternalLink,
  Shield,
  FileCode,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function ComplaintDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Appeal Modal State
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealSuccess, setAppealSuccess] = useState(false);

  // Correction Modal State
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionSuccess, setCorrectionSuccess] = useState(false);

  // Feedback State
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      if (!id) return;
      try {
        const res = await api.get(`/complaints/${id}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load complaint details.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppealSubmitting(true);
    try {
      await api.post(`/complaints/${id}/appeal`, { reason: appealReason });
      setAppealSuccess(true);
      setShowAppeal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Appeal submission failed.');
    } finally {
      setAppealSubmitting(false);
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrectionSubmitting(true);
    try {
      await api.post(`/complaints/${id}/correction`, { notes: correctionNotes });
      setCorrectionSuccess(true);
      setShowCorrection(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Correction submission failed.');
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-slate-400 text-sm flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          Loading complaint details...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
          {error || 'Complaint not found.'}
        </div>
        <Link href="/dashboard/citizen" className="text-xs text-cyan-400 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { complaint, aiPrediction, evidence, statusHistory } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-5xl mx-auto space-y-8 print:bg-white print:text-black print:p-0">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6 print:border-black">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/citizen"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white print:hidden"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-mono print:text-black">{complaint.reference_id}</h1>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  complaint.status === 'RESOLVED'
                    ? 'bg-green-500/20 text-green-300 border border-green-500/40 print:bg-green-100 print:text-green-800'
                    : complaint.status === 'IN_PROGRESS'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 print:bg-blue-100 print:text-blue-800'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 print:bg-amber-100 print:text-amber-800'
                }`}
              >
                {complaint.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 print:text-gray-600">Submitted on {new Date(complaint.created_at).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2 rounded-xl bg-cyan-950 border border-cyan-800/60 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
          <button
            onClick={() => setShowCorrection(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <Edit3 className="w-4 h-4" /> Request Correction
          </button>
          <button
            onClick={() => setShowAppeal(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-amber-400 hover:border-amber-500/50 flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4" /> Appeal AI Decision
          </button>
        </div>
      </div>

      {/* Main Grid: Details + AI Explainability */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Complaint Details & Timeline */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 print:border-gray-300 print:bg-white print:shadow-none">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white print:text-black">{complaint.title || 'Municipal Issue Report'}</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 print:text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {complaint.address || 'Location Coordinates Logged'}
                </p>
              </div>
              <Link
                href="/map"
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-cyan-400 hover:underline flex items-center gap-1 print:hidden"
              >
                <ExternalLink className="w-3 h-3" /> Live Map
              </Link>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed print:text-gray-800">{complaint.description}</p>

            <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-800 print:border-gray-300">
              <div>
                <span className="text-slate-500">Category:</span>
                <p className="font-semibold text-slate-200 print:text-black">{complaint.category || 'Unclassified'}</p>
              </div>
              <div>
                <span className="text-slate-500">Assigned Department:</span>
                <p className="font-semibold text-cyan-400 print:text-blue-700">{complaint.department_name || 'Pending Routing'}</p>
              </div>
              <div>
                <span className="text-slate-500">Assigned Officer:</span>
                <p className="font-semibold text-slate-200 print:text-black">{complaint.officer_name || 'Unassigned (In Queue)'}</p>
              </div>
              <div>
                <span className="text-slate-500">Expected Resolution SLA:</span>
                <p className="font-semibold text-amber-400 print:text-amber-700">
                  {complaint.sla_deadline ? new Date(complaint.sla_deadline).toLocaleString() : '12 Hours'}
                </p>
              </div>
            </div>

            {/* Officer Remarks & Resolution Photo if resolved */}
            {complaint.status === 'RESOLVED' && (
              <div className="p-4 rounded-2xl bg-green-950/40 border border-green-800/40 space-y-2 print:bg-green-50 print:border-green-300">
                <div className="flex items-center gap-2 text-green-300 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-green-400" /> Resolution Confirmed by Assigned Officer
                </div>
                {complaint.officer_remarks && (
                  <p className="text-xs text-slate-300 italic print:text-gray-800">
                    &quot;{complaint.officer_remarks}&quot; — {complaint.officer_name || 'Officer'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Evidence Gallery */}
          {evidence && evidence.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3 print:border-gray-300">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 print:text-black">
                <FileText className="w-4 h-4 text-cyan-400" /> Submitted Evidence ({evidence.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {evidence.map((ev: any, i: number) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video relative group">
                    {ev.file_type?.startsWith('image') || ev.file_url?.match(/\.(jpg|jpeg|png|webp)/i) ? (
                      <img src={ev.file_url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs p-2 text-center">
                        <FileCode className="w-6 h-6 mb-1 text-cyan-400" />
                        <span className="truncate w-full">{ev.file_name || 'Attachment'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 print:border-gray-300">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 print:text-black">
              <Clock className="w-5 h-5 text-cyan-400" /> Audit Trail & Timeline
            </h3>

            {statusHistory.length === 0 ? (
              <p className="text-xs text-slate-500">No status updates logged yet.</p>
            ) : (
              <div className="space-y-4 relative pl-6 border-l-2 border-slate-800 print:border-gray-300">
                {statusHistory.map((sh: any) => (
                  <div key={sh.id} className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-cyan-500 border-4 border-slate-950 print:border-white" />
                    <p className="text-xs font-bold text-white print:text-black">{sh.status}</p>
                    <p className="text-[11px] text-slate-400 print:text-gray-600">{new Date(sh.created_at).toLocaleString()}</p>
                    {sh.note && <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg mt-1 print:bg-gray-100 print:text-gray-800">{sh.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Explainability & Privacy Panel */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 print:border-gray-300">
            <div className="flex items-center justify-between text-cyan-400 font-bold text-sm border-b border-slate-800 pb-3 print:border-gray-300">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                <span>AI Reasoning Breakdown</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                Phase 11
              </span>
            </div>

            {!aiPrediction ? (
              <div className="py-4 text-center text-xs text-slate-500">
                AI analysis reasoning data not yet available for this complaint.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400">Classification Confidence:</span>
                  <div className="w-full bg-slate-900 rounded-full h-2 mt-1 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full"
                      style={{ width: `${(aiPrediction.confidence * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <span className="text-right block text-[10px] text-cyan-400 font-mono mt-0.5">
                    {(aiPrediction.confidence * 100).toFixed(1)}% Confidence Score
                  </span>
                </div>

                {aiPrediction.reasoning?.keywords && (
                  <div>
                    <span className="text-slate-400 font-semibold">Matched Keywords:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {aiPrediction.reasoning.keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {aiPrediction.reasoning?.entity_spans && (
                  <div>
                    <span className="text-slate-400 font-semibold">spaCy Named Entities:</span>
                    <div className="space-y-1 mt-1">
                      {aiPrediction.reasoning.entity_spans.map((ent: any, i: number) => (
                        <div key={i} className="flex justify-between p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-200">{ent.text}</span>
                          <span className="font-mono text-cyan-400 text-[10px]">{ent.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Privacy & Consent Panel */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3 print:hidden">
            <div className="flex items-center gap-2 text-green-400 font-bold text-xs">
              <Shield className="w-4 h-4" /> DPDPA Data Privacy Applied
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your contact information is encrypted with AES-256-GCM. Personal identifiers were stripped prior to AI inference.
            </p>
            <Link href="/privacy-center" className="text-[11px] text-cyan-400 hover:underline inline-block">
              Manage Consent & Data Rights →
            </Link>
          </div>
        </div>
      </div>

      {/* Appeal Modal */}
      {showAppeal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-3xl max-w-md w-full border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">Submit AI Classification Appeal</h3>
            <p className="text-xs text-slate-400">
              If you disagree with the AI category or routing decision, state your reason below. A System Administrator will review your appeal manually.
            </p>
            <textarea
              rows={3}
              required
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="State why the AI classification is inaccurate..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowAppeal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitAppeal}
                disabled={appealSubmitting}
                className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-white"
              >
                {appealSubmitting ? 'Submitting...' : 'Submit Appeal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {showCorrection && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-3xl max-w-md w-full border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">Request Information Correction</h3>
            <p className="text-xs text-slate-400">
              Update landmark details or clarify description text for the assigned officer.
            </p>
            <textarea
              rows={3}
              required
              value={correctionNotes}
              onChange={(e) => setCorrectionNotes(e.target.value)}
              placeholder="Provide updated landmark or description details..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCorrection(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCorrection}
                disabled={correctionSubmitting}
                className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-white"
              >
                {correctionSubmitting ? 'Submitting...' : 'Send Correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
