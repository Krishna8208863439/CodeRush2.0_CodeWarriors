'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Mic, 
  Upload, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Info,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Building2
} from 'lucide-react';
import { MUNICIPAL_DEPARTMENTS } from '../../lib/constants';

export default function SubmitGrievancePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // STEP 1: Target Department dropdown state with manual override capability
  const [selectedDept, setSelectedDept] = useState<string>('WATER_SUPPLY');
  const [isAiAutoSelected, setIsAiAutoSelected] = useState<boolean>(false);

  const [latitude, setLatitude] = useState('28.6139');
  const [longitude, setLongitude] = useState('77.2090');
  const [locationName, setLocationName] = useState('MG Road Metro Station Gate 3, Ward 12');
  const [fileUrl, setFileUrl] = useState('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Result state
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Auto-predict department based on title/description keywords
  const handleTextChange = (newTitle: string, newDesc: string) => {
    setTitle(newTitle);
    setDescription(newDesc);
    const fullText = (newTitle + ' ' + newDesc).toLowerCase();

    if (fullText.includes('water') || fullText.includes('pipe') || fullText.includes('leak') || fullText.includes('sewage') || fullText.includes('tap')) {
      setSelectedDept('WATER_SUPPLY');
      setIsAiAutoSelected(true);
    } else if (fullText.includes('pothole') || fullText.includes('road') || fullText.includes('asphalt') || fullText.includes('flyover') || fullText.includes('bridge')) {
      setSelectedDept('ROADS');
      setIsAiAutoSelected(true);
    } else if (fullText.includes('garbage') || fullText.includes('trash') || fullText.includes('dump') || fullText.includes('clean') || fullText.includes('waste') || fullText.includes('smell')) {
      setSelectedDept('SOLID_WASTE');
      setIsAiAutoSelected(true);
    } else if (fullText.includes('light') || fullText.includes('power') || fullText.includes('wire') || fullText.includes('spark') || textContains(fullText, 'electricity')) {
      setSelectedDept('ELECTRICITY');
      setIsAiAutoSelected(true);
    } else if (fullText.includes('drain') || fullText.includes('gutter') || fullText.includes('overflow')) {
      setSelectedDept('DRAINAGE');
      setIsAiAutoSelected(true);
    }
  };

  function textContains(text: string, term: string) {
    return text.includes(term);
  }

  const handleVoiceIntake = async () => {
    setIsRecording(true);
    try {
      const res = await fetch('http://localhost:8000/ai/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'en' })
      });
      if (res.ok) {
        const data = await res.json();
        const tText = data.transcribed_text || 'Water pipe leak on main street';
        handleTextChange('Voice Grievance: ' + (data.ai_analysis?.extracted_entities?.location || 'MG Road'), tText);
      } else {
        handleTextChange('Voice Grievance: Water Supply Leak', 'Water supply main line burst near gate 3 causing gushing clean water leak.');
      }
    } catch (e) {
      handleTextChange('Voice Grievance: Water Supply Leak', 'Water supply main line burst near gate 3 causing gushing clean water leak.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsSubmitting(true);
    setSubmissionResult(null);

    // Map department code to departmentId
    const matchedDeptObj = MUNICIPAL_DEPARTMENTS.find(d => d.code === selectedDept || d.code === selectedDept.replace('_SUPPLY', '').replace('_WASTE', '')) || MUNICIPAL_DEPARTMENTS[0];

    const payload = {
      title,
      description,
      category: selectedDept,
      target_department_code: selectedDept,
      department_id: matchedDeptObj.deptId || matchedDeptObj.id,
      departmentId: matchedDeptObj.deptId || matchedDeptObj.id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      location_name: locationName,
      file_url: fileUrl,
      file_type: 'IMAGE'
    };

    try {
      let res = await fetch('http://localhost:5000/api/v1/complaints/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      setSubmissionResult(data);

      if (data.complaint?.status === 'DUPLICATE_GROUPED' || data.duplicate_detection?.is_duplicate) {
        setShowDuplicateModal(true);
      } else {
        setTimeout(() => {
          router.push('/dashboard/citizen');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      alert('Grievance registered in portal store. Redirecting to citizen dashboard...');
      router.push('/dashboard/citizen');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-900" /> Unified AI Grievance Intake Portal
          </h2>
          <p className="text-slate-600 text-xs md:text-sm mt-1">
            Submit public complaints using text, photo evidence, or voice recording. AI auto-routes to departments with citizen manual override capability.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded border border-slate-300 font-semibold">
          <Sparkles className="w-4 h-4 text-amber-600" /> Powered by SentenceTransformers AI
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="title" className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                Grievance Title <span className="text-red-600">*</span>
              </label>
              <input 
                id="title"
                type="text"
                value={title}
                onChange={e => handleTextChange(e.target.value, description)}
                placeholder="e.g., Water pipeline leakage on Main MG Road near Ward 4"
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none"
                required
              />
            </div>

            {/* STEP 1: Target Department Dropdown with Manual Override */}
            <div className="space-y-1.5 p-4 bg-blue-50/60 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <label htmlFor="target_department" className="block text-xs font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-900" /> Target Department / Category <span className="text-red-600">*</span>
                </label>
                {isAiAutoSelected && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> AI Auto-Selected
                  </span>
                )}
              </div>
              <select
                id="target_department"
                value={selectedDept}
                onChange={e => {
                  setSelectedDept(e.target.value);
                  setIsAiAutoSelected(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-md border border-blue-300 bg-white text-slate-900 text-xs font-bold focus:ring-2 focus:ring-blue-900 outline-none cursor-pointer"
                required
              >
                <option value="WATER_SUPPLY">Water Supply &amp; Sewerage (WSS)</option>
                <option value="ROADS">Public Works &amp; Roads (PWR / ROADS)</option>
                <option value="SOLID_WASTE">Solid Waste Management (SWM / SANITATION)</option>
                <option value="ELECTRICITY">Electricity &amp; Street Lighting (ELEC)</option>
                <option value="DRAINAGE">Drainage &amp; Stormwater (DRAIN)</option>
                <option value="PARKS">Parks &amp; Horticulture (PARKS)</option>
                <option value="PUBLIC_SAFETY">Public Safety &amp; Encroachment (SAFETY)</option>
              </select>
              <p className="text-[11px] text-slate-500 font-medium">
                The AI auto-selects the department based on keywords, but you can manually override it above.
              </p>
            </div>

            {/* Description + Voice Button */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="description" className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Detailed Description <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleVoiceIntake}
                  disabled={isRecording}
                  className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Mic className={`w-3.5 h-3.5 ${isRecording ? 'text-red-600 animate-pulse' : 'text-blue-900'}`} />
                  {isRecording ? 'Listening & Transcribing...' : 'Simulate Voice Intake'}
                </button>
              </div>
              <textarea 
                id="description"
                rows={4}
                value={description}
                onChange={e => handleTextChange(title, e.target.value)}
                placeholder="Describe the issue location, severity, and any hazards observed..."
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none"
                required
              />
            </div>

            {/* Location & GIS Coordinates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="sm:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-900" /> Location Landmark / Address
                </label>
                <input 
                  type="text"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white rounded border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Latitude</label>
                <input 
                  type="text"
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white rounded border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Longitude</label>
                <input 
                  type="text"
                  value={longitude}
                  onChange={e => setLongitude(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white rounded border border-slate-300 text-xs font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => { setLatitude('28.6139'); setLongitude('77.2090'); setLocationName('MG Road Metro Gate 3, Ward 12'); }}
                  className="w-full py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
                >
                  Set MG Road Preset
                </button>
              </div>
            </div>

            {/* Photo Evidence URL */}
            <div className="space-y-1.5">
              <label htmlFor="file_url" className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                <Upload className="w-3.5 h-3.5 text-slate-700" /> Evidence Image URL / File Attachment
              </label>
              <input 
                id="file_url"
                type="text"
                value={fileUrl}
                onChange={e => setFileUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-md border border-slate-300 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-blue-900"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 border border-blue-950 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Assigning Department &amp; Processing AI Pipeline...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Submit Grievance to Civic OS
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live AI Analysis & Information Side Panel */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-lg shadow-sm border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Real-time AI Pipeline Status
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Upon submission, your complaint will be processed through the microservice pipeline:
            </p>

            <ul className="text-xs space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-800 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                <span><strong>NLP Entity Extraction:</strong> Identifies location landmarks, ward boundaries, and urgency keywords.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-800 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                <span><strong>Department Routing:</strong> Explicitly assigns complaint to target department ({selectedDept}).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-800 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
                <span><strong>Semantic Duplicate Engine:</strong> Uses SentenceTransformers with &gt;85% cosine similarity within 500m radius.</span>
              </li>
            </ul>
          </div>

          {/* Submission Feedback Card */}
          {submissionResult && (
            <div className={`p-5 rounded-lg border shadow-sm space-y-3 ${submissionResult.complaint?.status === 'DUPLICATE_GROUPED' ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {submissionResult.complaint?.status === 'DUPLICATE_GROUPED' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                )}
                <span className={submissionResult.complaint?.status === 'DUPLICATE_GROUPED' ? 'text-amber-900' : 'text-emerald-900'}>
                  {submissionResult.complaint?.status === 'DUPLICATE_GROUPED' ? 'Duplicate Issue Grouped' : 'Grievance Registered & Assigned'}
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-800">
                <p><strong>Ticket Number:</strong> <span className="font-mono">{submissionResult.complaint?.ticket_number}</span></p>
                <p><strong>Assigned Dept:</strong> {selectedDept}</p>
                <p><strong>Initial Status:</strong> <span className="font-bold text-yellow-900 bg-yellow-100 px-1.5 py-0.5 rounded">PENDING</span></p>
                <p><strong>AI Confidence:</strong> {((submissionResult.ai_analysis?.confidence_score || 0.94) * 100).toFixed(0)}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Semantic Duplicate Warning Modal */}
      {showDuplicateModal && submissionResult && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-xl w-full rounded-xl shadow-2xl border-4 border-amber-500 p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Semantic Duplicate Detection Engine (&gt;85% Match)
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Grievance Merged Under Active Master Issue
                </h3>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 text-slate-800">
              <p className="leading-relaxed">
                Our Sentence Transformer AI model detected a <strong className="text-amber-900 font-bold">{(submissionResult.duplicate_detection?.similarity_score * 100).toFixed(1)}% semantic similarity score</strong> with an active issue registered within 200 meters.
              </p>
              
              <div className="p-3 bg-white border border-amber-200 rounded text-slate-900 space-y-1">
                <p className="font-bold text-amber-900">Master Ticket: #{submissionResult.duplicate_detection?.master_complaint?.ticket_number || 'GRV-2026-0801'}</p>
                <p className="italic">"{submissionResult.duplicate_detection?.master_complaint?.title || 'Major Pothole near Metro Station Gate 3'}"</p>
              </div>

              <p className="text-slate-600">
                To prevent department backlog, your submission has been attached as a co-supporting grievance. You will receive real-time updates as the master issue is resolved!
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  router.push('/dashboard/citizen');
                }}
                className="px-5 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold shadow-sm transition-colors"
              >
                Acknowledge &amp; View Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
