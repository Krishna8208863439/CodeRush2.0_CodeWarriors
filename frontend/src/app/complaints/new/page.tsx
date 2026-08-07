'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  FileText,
  Image as ImageIcon,
  Mic,
  Video,
  Volume2,
  MapPin,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Loader2,
  Square,
  Play,
  RotateCcw,
  Trash2,
  UploadCloud,
  Film,
  Music,
  Camera,
  X
} from 'lucide-react';
import { api } from '@/lib/api';

export default function NewComplaintPage() {
  const router = useRouter();

  // Selected Intake Channel
  const [channel, setChannel] = useState<'text' | 'image' | 'voice' | 'audio' | 'video'>('text');

  // Auth guard — redirect to login if no token present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login?tab=citizen&redirect=/complaints/new');
    }
  }, [router]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const language = 'EN'; // Locked to English as requested
  
  // GIS Geolocation State
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [latitudeInput, setLatitudeInput] = useState('');
  const [longitudeInput, setLongitudeInput] = useState('');
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // File Upload State (Image, Audio, Video, Voice Fallback)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Live Voice Recorder State (Web Audio & MediaRecorder API)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceRecordingTime, setVoiceRecordingTime] = useState(0);
  const [recordedVoiceBlob, setRecordedVoiceBlob] = useState<Blob | null>(null);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string | null>(null);
  const [micErrorMsg, setMicErrorMsg] = useState<string | null>(null);

  // Live Video Recorder State (MediaRecorder API)
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoRecordingTime, setVideoRecordingTime] = useState(0);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string | null>(null);
  const [videoMode, setVideoMode] = useState<'upload' | 'record'>('upload');

  // Refs for MediaRecorders & Audio Canvas
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceAudioChunksRef = useRef<Blob[]>([]);
  const voiceTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const videoMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // Consent & Submitting
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [createdComplaint, setCreatedComplaint] = useState<any | null>(null);

  // Clean object URLs & timers on unmount
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      if (recordedVoiceUrl) URL.revokeObjectURL(recordedVoiceUrl);
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
      if (voiceTimerIntervalRef.current) clearInterval(voiceTimerIntervalRef.current);
      if (videoTimerIntervalRef.current) clearInterval(videoTimerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [filePreviewUrl, recordedVoiceUrl, recordedVideoUrl]);

  // Tab Switch State Cleanup (Phase 1E rule: clear previous channel's unsent data)
  const handleTabSwitch = (newChannel: 'text' | 'image' | 'voice' | 'audio' | 'video') => {
    if (newChannel === channel) return;
    
    // Stop any active recordings
    if (isVoiceRecording) stopVoiceRecording();
    if (isVideoRecording) stopVideoRecording();

    setChannel(newChannel);
    setError(null);
    setSelectedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    setFileDuration(null);

    resetVoiceRecording();
    resetVideoRecording();

    setTitle('');
    setDescription('');
  };

  // Handle Geolocation Detection
  const handleGetLocation = () => {
    setLocationError(null);
    setLocationCaptured(false);

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lon = parseFloat(pos.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lon);
          setLatitudeInput(lat.toString());
          setLongitudeInput(lon.toString());
          setLocationCaptured(true);
          setLocationError(null);
        },
        (err) => {
          setLocationCaptured(false);
          let msg = 'Geolocation failed.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Browser geolocation access denied. Please enter latitude and longitude coordinates manually below.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Location position unavailable. Please enter coordinates manually.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Location request timed out. Please enter coordinates manually.';
          }
          setLocationError(msg);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setLocationError('Geolocation API is not supported by your browser. Please enter coordinates manually.');
    }
  };

  // Manual Lat/Lon Handlers
  const handleLatChange = (val: string) => {
    setLatitudeInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= -90 && parsed <= 90) {
      setLatitude(parsed);
      setLocationCaptured(true);
    } else {
      setLatitude(null);
      setLocationCaptured(false);
    }
  };

  const handleLonChange = (val: string) => {
    setLongitudeInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= -180 && parsed <= 180) {
      setLongitude(parsed);
      setLocationCaptured(true);
    } else {
      setLongitude(null);
      setLocationCaptured(false);
    }
  };

  // Client-Side Image File Selection & Validation (Phase 1B)
  const validateAndSetImage = (file: File) => {
    setError(null);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext || '')) {
      setError(`Invalid file type '${file.type || ext}'. Only JPEG, PNG, WEBP, and HEIC images are accepted.`);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      return;
    }

    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`File size (${sizeMB}MB) exceeds the 10MB maximum limit for images.`);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      return;
    }

    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  };

  // Client-Side Audio File Selection & Validation (Phase 1C)
  const validateAndSetAudio = (file: File) => {
    setError(null);
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm'];
    const maxSizeBytes = 20 * 1024 * 1024; // 20MB

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(file.type) && !['mp3', 'wav', 'm4a', 'ogg', 'webm', 'aac'].includes(ext || '')) {
      setError(`Invalid audio format '${file.type || ext}'. Only MP3, WAV, M4A, OGG, and WEBM audio files are allowed.`);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      return;
    }

    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`File size (${sizeMB}MB) exceeds the 20MB maximum limit for audio files.`);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      return;
    }

    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  };

  // Client-Side Video File Selection & Validation (Phase 1D)
  const validateAndSetVideo = (file: File) => {
    setError(null);
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(file.type) && !['mp4', 'webm', 'mov', 'mkv'].includes(ext || '')) {
      setError(`Invalid video format '${file.type || ext}'. Only MP4, WEBM, and MOV video files are allowed.`);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      return;
    }

    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`File size (${sizeMB}MB) exceeds the 50MB maximum limit for video files.`);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      return;
    }

    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  };

  // Dropzone drag-and-drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (channel === 'image') validateAndSetImage(file);
    else if (channel === 'audio') validateAndSetAudio(file);
    else if (channel === 'video') validateAndSetVideo(file);
  };

  // Start Real Live Voice Recording (Phase 1C)
  const startVoiceRecording = async () => {
    setMicErrorMsg(null);
    voiceAudioChunksRef.current = [];

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicErrorMsg('MediaRecorder API is not supported by your browser. Please upload an audio file instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      voiceMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) voiceAudioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(voiceAudioChunksRef.current, { type: mimeType });
        setRecordedVoiceBlob(blob);
        setRecordedVoiceUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      // Set up Web Audio API Analyser for Live Waveform Canvas
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawWaveform = () => {
        if (!audioCanvasRef.current) return;
        const canvas = audioCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillStyle = '#2563EB';
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }

        animationFrameRef.current = requestAnimationFrame(drawWaveform);
      };

      drawWaveform();

      mediaRecorder.start(100);
      setIsVoiceRecording(true);
      setVoiceRecordingTime(0);

      voiceTimerIntervalRef.current = setInterval(() => {
        setVoiceRecordingTime((prev) => {
          if (prev >= 120) { // 2 mins max
            stopVoiceRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicErrorMsg('Microphone access denied — please allow microphone permissions in your browser or upload an audio file below.');
      } else if (err.name === 'NotFoundError') {
        setMicErrorMsg('No microphone input device found on this system. Please upload an audio file instead.');
      } else {
        setMicErrorMsg(`Microphone error: ${err.message}`);
      }
    }
  };

  const stopVoiceRecording = () => {
    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state !== 'inactive') {
      voiceMediaRecorderRef.current.stop();
    }
    setIsVoiceRecording(false);
    if (voiceTimerIntervalRef.current) clearInterval(voiceTimerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
  };

  const resetVoiceRecording = () => {
    setRecordedVoiceBlob(null);
    if (recordedVoiceUrl) URL.revokeObjectURL(recordedVoiceUrl);
    setRecordedVoiceUrl(null);
    setVoiceRecordingTime(0);
    setIsVoiceRecording(false);
  };

  // Start Real Live Video Recording (Phase 1D)
  const startVideoRecording = async () => {
    setCameraErrorMsg(null);
    videoChunksRef.current = [];

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraErrorMsg('Camera & MediaRecorder API is not supported by your browser. Please upload a video file instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoStreamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play();
      }

      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) mimeType = 'video/webm;codecs=vp9,opus';
      else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      videoMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: mimeType });
        setRecordedVideoBlob(blob);
        setRecordedVideoUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsVideoRecording(true);
      setVideoRecordingTime(0);

      videoTimerIntervalRef.current = setInterval(() => {
        setVideoRecordingTime((prev) => {
          if (prev >= 60) { // 60s video limit
            stopVideoRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraErrorMsg('Camera/Microphone access denied — please allow camera permissions in your browser or upload a video file below.');
      } else if (err.name === 'NotFoundError') {
        setCameraErrorMsg('No camera device detected on this system. Please upload a video file instead.');
      } else {
        setCameraErrorMsg(`Camera error: ${err.message}`);
      }
    }
  };

  const stopVideoRecording = () => {
    if (videoMediaRecorderRef.current && videoMediaRecorderRef.current.state !== 'inactive') {
      videoMediaRecorderRef.current.stop();
    }
    setIsVideoRecording(false);
    if (videoTimerIntervalRef.current) clearInterval(videoTimerIntervalRef.current);
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const resetVideoRecording = () => {
    setRecordedVideoBlob(null);
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    setRecordedVideoUrl(null);
    setVideoRecordingTime(0);
    setIsVideoRecording(false);
  };

  // Validation Checks
  const isTitleValid = channel === 'text' ? (title.trim().length >= 5 && title.trim().length <= 120) : true;
  const isDescriptionValid = channel === 'text' ? (description.trim().length >= 20) : true;
  const isLocationValid = latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude);

  const isChannelValid = () => {
    if (channel === 'text') return isTitleValid && isDescriptionValid;
    if (channel === 'image') return selectedFile !== null;
    if (channel === 'voice') return recordedVoiceBlob !== null || selectedFile !== null;
    if (channel === 'audio') return selectedFile !== null;
    if (channel === 'video') return recordedVideoBlob !== null || selectedFile !== null;
    return false;
  };

  const isFormValid = isChannelValid() && isLocationValid && consent;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      setError('Please resolve validation errors and attach required evidence before submitting.');
      return;
    }

    setLoading(true);
    setUploadProgress(10);
    setError(null);

    try {
      if (channel === 'text') {
        setUploadProgress(50);
        const res = await api.post('/complaints', {
          title: title.trim(),
          description: description.trim(),
          channel: 'TEXT',
          language,
          latitude,
          longitude,
          consentGranted: true,
        });
        setUploadProgress(100);
        setCreatedComplaint(res.data.complaint || res.data);
      } else {
        const formData = new FormData();
        let endpoint = `/complaints/${channel}`;

        if (channel === 'voice' && recordedVoiceBlob) {
          formData.append('file', recordedVoiceBlob, `voice_note_${Date.now()}.webm`);
          endpoint = '/complaints/voice';
        } else if (channel === 'video' && recordedVideoBlob) {
          formData.append('file', recordedVideoBlob, `recorded_video_${Date.now()}.webm`);
          endpoint = '/complaints/video';
        } else if (selectedFile) {
          formData.append('file', selectedFile);
        } else {
          setError('No file or recording attached.');
          setLoading(false);
          return;
        }

        formData.append('title', title.trim() || `${channel.toUpperCase()} Intake Complaint`);
        formData.append('description', description.trim() || `${channel.toUpperCase()} intake submission`);
        formData.append('language', language);
        if (latitude !== null) formData.append('latitude', latitude.toString());
        if (longitude !== null) formData.append('longitude', longitude.toString());

        const res = await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          },
        });

        setCreatedComplaint(res.data.complaint || res.data);
      }
    } catch (err: any) {
      const apiErr = err.response?.data?.message || err.response?.data?.error || 'Complaint submission failed. Please try again.';
      setError(apiErr);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-3 sm:p-6 text-[#111827]">
      
      {/* Main Complaint Form Card (Responsive at 375px width) */}
      <div className="w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-5 sm:p-8 my-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#111827] leading-tight">File Municipal Complaint</h2>
              <p className="text-[11px] text-gray-500 font-medium">SwachhLens AI — Phase 1 Multi-Channel Intake Engine</p>
            </div>
          </div>
          <Link href="/dashboard/citizen" className="text-xs font-semibold text-[#2563EB] hover:underline shrink-0">
            Dashboard
          </Link>
        </div>

        {createdComplaint ? (
          /* SUCCESS DISPLAY */
          <div className="py-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
              <CheckCircle className="w-10 h-10" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-[#111827]">Complaint Submitted Successfully!</h3>
              <p className="text-xs text-gray-500 mt-1">Official database record created and pending AI processing</p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-5 text-left space-y-3 max-w-lg mx-auto shadow-xs">
              <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Complaint Reference ID</span>
                <span className="font-mono font-bold text-lg text-[#2563EB]">
                  {createdComplaint.complaintNo || createdComplaint.reference_id || createdComplaint.referenceId}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Intake Channel:</span>
                <span className="font-semibold text-gray-800 uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                  {createdComplaint.channel || channel.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Language:</span>
                <span className="font-semibold text-gray-800">{createdComplaint.language || 'EN'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Status:</span>
                <span className="font-semibold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {createdComplaint.status || 'SUBMITTED'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Resolved Ward:</span>
                <span className="font-semibold text-gray-900 bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                  {createdComplaint.ward || 'unresolved'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">GIS Coordinates:</span>
                <span className="font-mono text-gray-700">
                  {createdComplaint.latitude ?? latitude}, {createdComplaint.longitude ?? longitude}
                </span>
              </div>

              {createdComplaint.mediaUrl && (
                <div className="pt-2 border-t border-gray-200 text-xs">
                  <span className="text-gray-500 font-medium block mb-1">Stored Media URL:</span>
                  <a
                    href={createdComplaint.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#2563EB] font-mono break-all hover:underline"
                  >
                    {createdComplaint.mediaUrl}
                  </a>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setCreatedComplaint(null);
                  setTitle('');
                  setDescription('');
                  setSelectedFile(null);
                  setFilePreviewUrl(null);
                  resetVoiceRecording();
                  resetVideoRecording();
                  setLatitude(null);
                  setLongitude(null);
                  setLatitudeInput('');
                  setLongitudeInput('');
                  setLocationCaptured(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                File Another Complaint
              </button>
              <Link
                href="/dashboard/citizen"
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-xs font-bold text-white shadow-sm hover:bg-[#1D4ED8] flex items-center justify-center gap-1.5 transition-colors"
              >
                Track Progress <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            
            {/* 5-Channel Selector Bar (Mobile Responsive Grid) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-semibold text-[#111827]">Select Intake Channel</label>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                  All 5 Channels Active
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-50 border border-[#E5E7EB] rounded-[16px]">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('text')}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-[12px] text-[11px] font-bold transition-all ${
                    channel === 'text'
                      ? 'bg-[#2563EB] text-white shadow-sm ring-2 ring-[#2563EB]/30'
                      : 'bg-white border border-[#E5E7EB] text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-4 h-4 mb-0.5" />
                  Text
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('image')}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-[12px] text-[11px] font-bold transition-all ${
                    channel === 'image'
                      ? 'bg-[#2563EB] text-white shadow-sm ring-2 ring-[#2563EB]/30'
                      : 'bg-white border border-[#E5E7EB] text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 mb-0.5" />
                  Image
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('voice')}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-[12px] text-[11px] font-bold transition-all ${
                    channel === 'voice'
                      ? 'bg-[#2563EB] text-white shadow-sm ring-2 ring-[#2563EB]/30'
                      : 'bg-white border border-[#E5E7EB] text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Mic className="w-4 h-4 mb-0.5" />
                  Voice
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('audio')}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-[12px] text-[11px] font-bold transition-all ${
                    channel === 'audio'
                      ? 'bg-[#2563EB] text-white shadow-sm ring-2 ring-[#2563EB]/30'
                      : 'bg-white border border-[#E5E7EB] text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Volume2 className="w-4 h-4 mb-0.5" />
                  Audio
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('video')}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-[12px] text-[11px] font-bold transition-all ${
                    channel === 'video'
                      ? 'bg-[#2563EB] text-white shadow-sm ring-2 ring-[#2563EB]/30'
                      : 'bg-white border border-[#E5E7EB] text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Video className="w-4 h-4 mb-0.5" />
                  Video
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-[12px] bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Validation Error</span>
                  <span className="text-xs">{error}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-[18px]" noValidate>
              
              {/* Submission Language (Locked to English) */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#111827] mb-1">
                  Submission Language
                </label>
                <select
                  value="EN"
                  disabled
                  className="w-full bg-gray-100 border border-[#D1D5DB] rounded-[12px] h-[46px] px-3.5 text-sm text-[#111827] font-medium cursor-not-allowed appearance-none"
                >
                  <option value="EN">English</option>
                </select>
              </div>

              {/* 1. TEXT CHANNEL UI */}
              {channel === 'text' && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs sm:text-sm font-semibold text-[#111827]">
                        Issue Title <span className="text-red-500">*</span>
                      </label>
                      <span className={`text-xs font-mono ${title.length > 0 && !isTitleValid ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                        {title.length} / 120 chars
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Overflowing garbage dump near Ward 4 main road"
                      className="w-full bg-white border border-[#D1D5DB] rounded-[12px] h-[48px] px-3.5 text-sm text-[#111827] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs sm:text-sm font-semibold text-[#111827]">
                        Detailed Description <span className="text-red-500">*</span>
                      </label>
                      <span className={`text-xs font-mono ${description.length > 0 && !isDescriptionValid ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                        {description.length} chars (min 20)
                      </span>
                    </div>
                    <textarea
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide comprehensive details about the issue..."
                      className="w-full bg-white border border-[#D1D5DB] rounded-[12px] p-3.5 text-sm text-[#111827] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15 focus:outline-none transition-all"
                    />
                  </div>
                </>
              )}

              {/* 2. IMAGE CHANNEL UI (Phase 1B) */}
              {channel === 'image' && (
                <div className="space-y-3">
                  <label className="block text-xs sm:text-sm font-semibold text-[#111827]">
                    Upload Photo Evidence <span className="text-red-500">*</span>
                  </label>
                  
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                      isDragOver ? 'border-[#2563EB] bg-blue-50/50' : 'border-gray-300 hover:border-[#2563EB] bg-gray-50/50'
                    }`}
                  >
                    {filePreviewUrl ? (
                      <div className="space-y-3">
                        <img
                          src={filePreviewUrl}
                          alt="Selected photo evidence preview"
                          className="max-h-52 mx-auto rounded-xl shadow-sm border border-gray-200 object-cover"
                        />
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-xs text-gray-600 font-medium truncate max-w-[200px]">
                            {selectedFile?.name} ({(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                          <button
                            type="button"
                            onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); }}
                            className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-2 py-2">
                        <div className="w-11 h-11 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-bold text-[#2563EB]">Browse files</span> or drag & drop photo
                          <p className="text-[11px] text-gray-400 mt-0.5">JPEG, PNG, WEBP, HEIC (Max 10MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) validateAndSetImage(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Issue Title (Optional)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Photo of broken street light"
                      className="w-full bg-white border border-[#D1D5DB] rounded-[12px] h-[44px] px-3 text-xs sm:text-sm text-[#111827] focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Caption / Note (Optional)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add brief details about the image..."
                      className="w-full bg-white border border-[#D1D5DB] rounded-[12px] h-[44px] px-3 text-xs sm:text-sm text-[#111827] focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 3. VOICE CHANNEL UI (Phase 1C Live Mic Recording) */}
              {channel === 'voice' && (
                <div className="space-y-4">
                  <label className="block text-xs sm:text-sm font-semibold text-[#111827]">
                    Record Voice Note Complaint <span className="text-red-500">*</span>
                  </label>

                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 text-center space-y-4">
                    {!recordedVoiceUrl ? (
                      <div className="space-y-3">
                        <div className="relative w-18 h-18 mx-auto flex items-center justify-center">
                          {isVoiceRecording && (
                            <span className="absolute inset-0 rounded-full bg-red-400 opacity-75 animate-ping" />
                          )}
                          <button
                            type="button"
                            onClick={isVoiceRecording ? stopVoiceRecording : startVoiceRecording}
                            className={`relative z-10 w-16 h-16 rounded-full text-white flex items-center justify-center transition-all shadow-md ${
                              isVoiceRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                            }`}
                          >
                            {isVoiceRecording ? <Square className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                          </button>
                        </div>

                        <div>
                          <p className="text-xs sm:text-sm font-bold text-[#111827]">
                            {isVoiceRecording ? 'Recording Live Audio...' : 'Tap Mic to Start Recording'}
                          </p>
                          <p className="text-xs font-mono text-gray-600 mt-0.5">
                            Duration: {formatTime(voiceRecordingTime)} / 02:00 max
                          </p>
                        </div>

                        {isVoiceRecording && (
                          <canvas
                            ref={audioCanvasRef}
                            width={260}
                            height={36}
                            className="mx-auto bg-slate-900 rounded-lg shadow-inner"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Voice Recording Saved ({formatTime(voiceRecordingTime)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={resetVoiceRecording}
                            className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Discard
                          </button>
                        </div>

                        <audio controls src={recordedVoiceUrl} className="w-full h-9" />
                      </div>
                    )}

                    {micErrorMsg && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-1">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{micErrorMsg}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 text-left">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Alternative: Upload Audio File instead
                      </label>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) validateAndSetAudio(file);
                        }}
                        className="w-full text-xs text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. AUDIO CHANNEL UI (Phase 1C File Upload) */}
              {channel === 'audio' && (
                <div className="space-y-3">
                  <label className="block text-xs sm:text-sm font-semibold text-[#111827]">
                    Upload Pre-Recorded Audio File <span className="text-red-500">*</span>
                  </label>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                      isDragOver ? 'border-[#2563EB] bg-blue-50/50' : 'border-gray-300 hover:border-[#2563EB] bg-gray-50/50'
                    }`}
                  >
                    {filePreviewUrl ? (
                      <div className="space-y-3 text-left bg-white p-3.5 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <Music className="w-4 h-4 text-[#2563EB] shrink-0" />
                            <span className="text-xs font-bold text-gray-800 truncate">{selectedFile?.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); }}
                            className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                        <audio
                          controls
                          src={filePreviewUrl}
                          onLoadedMetadata={(e) => setFileDuration(Math.round((e.target as HTMLAudioElement).duration))}
                          className="w-full h-9 mt-1"
                        />
                        {fileDuration && (
                          <p className="text-[11px] text-gray-500 font-mono">
                            Duration: {formatTime(fileDuration)} • File Size: {(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-2 py-2">
                        <div className="w-11 h-11 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center">
                          <Volume2 className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-bold text-[#2563EB]">Select Audio File</span> or drag & drop
                          <p className="text-[11px] text-gray-400 mt-0.5">MP3, WAV, M4A, OGG, WEBM (Max 20MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/x-m4a,audio/ogg,audio/webm,audio/aac"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) validateAndSetAudio(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* 5. VIDEO CHANNEL UI (Phase 1D Live Video Record OR File Upload) */}
              {channel === 'video' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs sm:text-sm font-semibold text-[#111827]">
                      Video Evidence <span className="text-red-500">*</span>
                    </label>

                    {/* Mode Toggle */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => { setVideoMode('upload'); resetVideoRecording(); }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                          videoMode === 'upload' ? 'bg-white text-[#2563EB] shadow-2xs' : 'text-gray-600'
                        }`}
                      >
                        Upload Video
                      </button>
                      <button
                        type="button"
                        onClick={() => { setVideoMode('record'); setSelectedFile(null); setFilePreviewUrl(null); }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                          videoMode === 'record' ? 'bg-white text-[#2563EB] shadow-2xs' : 'text-gray-600'
                        }`}
                      >
                        Live Record Camera
                      </button>
                    </div>
                  </div>

                  {videoMode === 'upload' ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                        isDragOver ? 'border-[#2563EB] bg-blue-50/50' : 'border-gray-300 hover:border-[#2563EB] bg-gray-50/50'
                      }`}
                    >
                      {filePreviewUrl ? (
                        <div className="space-y-3">
                          <video
                            controls
                            src={filePreviewUrl}
                            onLoadedMetadata={(e) => setFileDuration(Math.round((e.target as HTMLVideoElement).duration))}
                            className="max-h-52 mx-auto rounded-xl border border-gray-200 bg-black"
                          />
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-xs text-gray-600 font-medium truncate max-w-[200px]">
                              {selectedFile?.name} ({(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                            <button
                              type="button"
                              onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); }}
                              className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center gap-2 py-2">
                          <div className="w-11 h-11 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center">
                            <Film className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-bold text-[#2563EB]">Select Video File</span> or drag & drop
                            <p className="text-[11px] text-gray-400 mt-0.5">MP4, WEBM, MOV (Max 50MB)</p>
                          </div>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) validateAndSetVideo(file);
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    /* Live Camera Video Recorder (Phase 1D) */
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 text-center space-y-3">
                      {!recordedVideoUrl ? (
                        <div className="space-y-3">
                          <div className="relative max-w-sm mx-auto bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                            <video
                              ref={liveVideoRef}
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                            {!isVideoRecording && !videoStreamRef.current && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/80 gap-2">
                                <Camera className="w-8 h-8 text-blue-400" />
                                <span className="text-xs font-semibold">Camera Ready</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={isVideoRecording ? stopVideoRecording : startVideoRecording}
                              className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all ${
                                isVideoRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                              }`}
                            >
                              {isVideoRecording ? <Square className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                              <span>{isVideoRecording ? 'Stop Recording' : 'Start Live Camera Recording'}</span>
                            </button>
                          </div>

                          {isVideoRecording && (
                            <p className="text-xs font-mono text-red-600 font-bold">
                              Live Recording: {formatTime(videoRecordingTime)} / 01:00 max
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 text-left">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-emerald-600" /> Recorded Camera Video
                            </span>
                            <button
                              type="button"
                              onClick={resetVideoRecording}
                              className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Discard Video
                            </button>
                          </div>
                          <video controls src={recordedVideoUrl} className="w-full max-h-56 rounded-lg bg-black" />
                        </div>
                      )}

                      {cameraErrorMsg && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{cameraErrorMsg}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* GIS Geolocation Section (Reused across all 5 channels) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-[#111827]">
                      GIS Location Coordinates <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-gray-500">Auto-detected via Geolocation API or manual lat/lon</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="border border-[#2563EB] bg-white hover:bg-blue-50 text-[#2563EB] font-bold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Detect My Location
                  </button>
                </div>

                {locationCaptured && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Location Captured: Latitude {latitude}, Longitude {longitude}</span>
                  </div>
                )}

                {locationError && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{locationError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Latitude (-90 to 90)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 19.0760"
                      value={latitudeInput}
                      onChange={(e) => handleLatChange(e.target.value)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-lg h-[40px] px-3 text-xs font-mono text-gray-800 focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Longitude (-180 to 180)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 72.8777"
                      value={longitudeInput}
                      onChange={(e) => handleLonChange(e.target.value)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-lg h-[40px] px-3 text-xs font-mono text-gray-800 focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Statutory Consent */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#2563EB] rounded border-gray-300 focus:ring-[#2563EB]"
                />
                <label htmlFor="consent" className="text-xs text-gray-600 leading-relaxed">
                  I grant consent for municipal processing of this complaint and GIS location data in accordance with statutory civic grievance guidelines.
                </label>
              </div>

              {/* Progress Indicator */}
              {loading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-gray-600 font-semibold">
                    <span>Uploading Evidence & Creating Database Record...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#2563EB] h-2 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className={`w-full h-[52px] rounded-[14px] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 ${
                  isFormValid && !loading
                    ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:-translate-y-0.5 cursor-pointer'
                    : 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing {channel.toUpperCase()} Submission...</span>
                  </>
                ) : (
                  <>
                    <span>Submit {channel.toUpperCase()} Complaint</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
