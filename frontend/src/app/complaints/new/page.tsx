'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, FileText, Image as ImageIcon, Mic, Video, Volume2, MapPin, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

export default function NewComplaintPage() {
  const router = useRouter();
  const [channel, setChannel] = useState<'text' | 'image' | 'voice' | 'audio' | 'video'>('text');

  // Auth guard — redirect to login if no token present
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login?tab=citizen&redirect=/complaints/new');
    }
  }, [router]);

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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 text-[#111827]">
      
      {/* Main Complaint Form Card */}
      <div className="w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-8 mt-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111827]">File Municipal Complaint</h2>
              <p className="text-xs text-gray-500 font-medium">Phase 1 Multi-Channel Intake</p>
            </div>
          </div>
          <Link href="/dashboard/citizen" className="text-xs font-semibold text-[#2563EB] hover:underline">
            Back to Dashboard
          </Link>
        </div>

        {referenceId ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-[#111827]">Complaint Submitted!</h3>
            <p className="text-sm text-gray-600">
              Your unique complaint reference ID is:
            </p>
            <div className="inline-block bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl px-6 py-3.5 text-2xl font-mono font-bold text-[#2563EB] tracking-wider shadow-xs">
              {referenceId}
            </div>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              Our AI Understanding Layer will classify, deduplicate, and route your complaint to the appropriate municipal department.
            </p>
            <div className="pt-4 flex gap-4 justify-center">
              <button
                onClick={() => setReferenceId(null)}
                className="px-5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Submit Another Complaint
              </button>
              <Link
                href="/dashboard/citizen"
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-xs font-bold text-white shadow-sm hover:bg-[#1D4ED8] flex items-center gap-1.5 transition-colors"
              >
                View Track Progress <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Complaint Type Tabs (Text, Image, Voice, Audio, Video) */}
            <div>
              <label className="block text-sm font-semibold text-[#111827] mb-2">Select Intake Channel</label>
              <div className="grid grid-cols-5 gap-2 p-1.5 bg-white border border-[#E5E7EB] rounded-[16px] shadow-xs">
                <button
                  type="button"
                  onClick={() => setChannel('text')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-[12px] text-xs font-semibold transition-all ${
                    channel === 'text'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4 mb-1" />
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('image')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-[12px] text-xs font-semibold transition-all ${
                    channel === 'image'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-gray-50'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 mb-1" />
                  Image
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('voice')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-[12px] text-xs font-semibold transition-all ${
                    channel === 'voice'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-gray-50'
                  }`}
                >
                  <Mic className="w-4 h-4 mb-1" />
                  Voice
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('audio')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-[12px] text-xs font-semibold transition-all ${
                    channel === 'audio'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-gray-50'
                  }`}
                >
                  <Volume2 className="w-4 h-4 mb-1" />
                  Audio
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('video')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-[12px] text-xs font-semibold transition-all ${
                    channel === 'video'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-gray-50'
                  }`}
                >
                  <Video className="w-4 h-4 mb-1" />
                  Video
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-[12px] bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form Fields with 20px gap */}
            <form onSubmit={handleSubmit} className="space-y-[20px]" noValidate>
              
              {channel === 'text' && (
                <>
                  {/* Select Language */}
                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-1.5">Select Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-[12px] h-[52px] px-4 text-base text-[#111827] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15 focus:outline-none transition-all font-medium"
                    >
                      <option value="EN">English</option>
                      <option value="HI">Hindi (हिंदी)</option>
                      <option value="MR">Marathi (मराठी)</option>
                      <option value="TA">Tamil (தமிழ்)</option>
                      <option value="TE">Telugu (తెలుగు)</option>
                      <option value="KN">Kannada (ಕನ್ನಡ)</option>
                    </select>
                  </div>

                  {/* Issue Title */}
                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-1.5">Issue Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Overflowing garbage bin near Ward 4 main road"
                      className="w-full bg-white border border-[#D1D5DB] rounded-[12px] h-[52px] px-4 text-base text-[#111827] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15 focus:outline-none transition-all font-normal"
                    />
                  </div>

                  {/* Detailed Description */}
                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-1.5">Detailed Description</label>
                    <textarea
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the complaint in detail..."
                      className="w-full bg-white border border-[#D1D5DB] rounded-[12px] h-[140px] p-4 text-base text-[#111827] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15 focus:outline-none transition-all font-normal"
                    />
                  </div>
                </>
              )}

              {channel !== 'text' && (
                <>
                  {/* File Upload Field */}
                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-1.5">
                      Upload {channel.charAt(0).toUpperCase() + channel.slice(1)} File
                    </label>
                    <input
                      type="file"
                      required
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-[12px] p-3 text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2563EB] file:text-white hover:file:bg-[#1D4ED8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Optional Note */}
                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-1.5">Optional Note / Caption</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add brief context..."
                      className="w-full bg-white border border-[#D1D5DB] rounded-[12px] h-[52px] px-4 text-base text-[#111827] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15 focus:outline-none transition-all"
                    />
                  </div>
                </>
              )}

              {/* GIS Location Picker */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-[#111827]">GIS Location Coordinates</label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="border border-[#2563EB] bg-white hover:bg-blue-50 text-[#2563EB] font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
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
                  className="w-full bg-white border border-[#D1D5DB] rounded-[12px] h-[52px] px-4 text-base text-[#111827] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15 focus:outline-none transition-all"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[56px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[17px] rounded-[14px] shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 mt-6"
              >
                {loading ? 'Processing Complaint...' : 'Submit Complaint'}
                <ArrowRight className="w-5 h-5" />
              </button>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
