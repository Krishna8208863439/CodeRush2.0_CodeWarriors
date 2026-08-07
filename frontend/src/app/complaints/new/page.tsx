'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, FileText, Image as ImageIcon, Mic, Video, Volume2, MapPin, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

export default function NewComplaintPage() {
  const router = useRouter();
  const [channel, setChannel] = useState<'text' | 'image' | 'voice' | 'audio' | 'video'>('text');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('EN');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [consent, setConsent] = useState(true);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setAddress(`Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`);
        },
        () => {
          setError('Unable to fetch browser geolocation.');
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('Data processing consent is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (channel === 'text') {
        const res = await api.post('/complaints', {
          title,
          description,
          language,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          formattedAddress: address,
          consentGranted: true,
        });
        setReferenceId(res.data.referenceId);
      } else {
        if (!file) {
          setError('Please select a file to upload.');
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', description || `${channel} complaint submission`);

        const endpoint = `/complaints/${channel}`;
        const res = await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setReferenceId(res.data.referenceId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Complaint submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="w-full max-w-2xl glass-panel p-8 rounded-3xl shadow-2xl relative z-10 border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">File Municipal Complaint</h2>
              <p className="text-xs text-slate-400">Phase 1 Multi-Channel Intake</p>
            </div>
          </div>
          <Link href="/dashboard/citizen" className="text-xs text-cyan-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>

        {referenceId ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-white">Complaint Submitted!</h3>
            <p className="text-sm text-slate-400">
              Your unique complaint reference ID is:
            </p>
            <div className="inline-block bg-slate-900 border border-slate-800 rounded-2xl px-6 py-3 text-xl font-mono font-bold text-cyan-400 tracking-wider shadow-inner">
              {referenceId}
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Our AI Understanding Layer will classify, deduplicate, and route your complaint to the appropriate municipal department.
            </p>
            <div className="pt-4 flex gap-4 justify-center">
              <button
                onClick={() => setReferenceId(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Submit Another Complaint
              </button>
              <Link
                href="/dashboard/citizen"
                className="px-5 py-2.5 rounded-xl glass-button text-xs font-bold text-white shadow-md flex items-center gap-1"
              >
                View Track Progress <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Channel Tabs */}
            <div className="grid grid-cols-5 gap-2 p-1 bg-slate-900/80 rounded-2xl mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => setChannel('text')}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                  channel === 'text' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 mb-1" />
                Text
              </button>
              <button
                type="button"
                onClick={() => setChannel('image')}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                  channel === 'image' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-4 h-4 mb-1" />
                Image
              </button>
              <button
                type="button"
                onClick={() => setChannel('voice')}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                  channel === 'voice' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-4 h-4 mb-1" />
                Voice
              </button>
              <button
                type="button"
                onClick={() => setChannel('audio')}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                  channel === 'audio' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Volume2 className="w-4 h-4 mb-1" />
                Audio
              </button>
              <button
                type="button"
                onClick={() => setChannel('video')}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                  channel === 'video' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-4 h-4 mb-1" />
                Video
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {channel === 'text' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Select Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="EN">English</option>
                      <option value="HI">Hindi (हिंदी)</option>
                      <option value="MR">Marathi (मराठी)</option>
                      <option value="TA">Tamil (தமிழ்)</option>
                      <option value="TE">Telugu (తెలుగు)</option>
                      <option value="KN">Kannada (ಕನ್ನಡ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Overflowing garbage bin near Ward 4 main road"
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Description</label>
                    <textarea
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the complaint in detail..."
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </>
              )}

              {channel !== 'text' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select {channel.toUpperCase()} File</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
                  />
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Optional Note / Caption</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add brief context..."
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* GIS Location Picker */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-300">GIS Location Coordinates</label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Detect My Location
                  </button>
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address or Geo Coordinates"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl glass-button text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 mt-6"
              >
                {loading ? 'Processing Complaint...' : 'Submit Complaint'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
