'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      if (!token || !email) {
        setError('Invalid email verification link. Token or email parameter missing.');
        setLoading(false);
        return;
      }

      try {
        await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
        setSuccess(true);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Verification link expired or invalid.');
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [token, email]);

  return (
    <div className="w-full max-w-md glass-panel p-8 rounded-3xl shadow-2xl relative z-10 border border-slate-800 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mx-auto mb-4">
        <ShieldCheck className="w-7 h-7 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Email Verification</h2>

      {loading ? (
        <div className="py-8">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Verifying account credentials...</p>
        </div>
      ) : success ? (
        <div className="py-6 space-y-4">
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
            Email verified successfully! Your account is now active and ready.
          </div>
          <Link
            href="/login"
            className="w-full py-3 rounded-xl glass-button text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2"
          >
            Proceed to Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="py-6 space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Link
            href="/login"
            className="text-xs text-cyan-400 hover:underline inline-block mt-2"
          >
            Back to Sign In
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading verification...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
