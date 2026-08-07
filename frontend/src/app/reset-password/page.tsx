'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, KeyRound, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const validate = () => {
    let valid = true;
    setPasswordError(null);
    setConfirmError(null);
    setTokenError(null);
    setGeneralError(null);

    if (!token.trim()) {
      setTokenError('Reset token is missing or invalid.');
      valid = false;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      valid = false;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match. Please verify your new password.');
      valid = false;
    }
    return valid;
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token: token.trim(),
        newPassword,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setGeneralError(err.response?.data?.message || 'The password reset link is invalid, already used, or expired. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Set New Password</h1>
        <p className="text-base text-gray-600">Choose a strong new password for your account.</p>
      </div>

      {generalError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{generalError}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          <span className="leading-relaxed">Password reset successfully! Redirecting to sign in...</span>
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-5" noValidate>
        {/* Token Input (Only if not provided via URL) */}
        {!tokenFromUrl && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Reset Token</label>
            <div className="relative">
              <KeyRound className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from email"
                className={`w-full bg-white border rounded-lg pl-11 pr-4 py-3 text-base text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  tokenError ? 'border-red-500' : 'border-gray-300 focus:border-blue-600'
                }`}
              />
            </div>
            {tokenError && <p className="mt-1 text-sm text-red-600 font-medium">{tokenError}</p>}
          </div>
        )}

        {/* New Password */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className={`w-full bg-white border rounded-lg pl-11 pr-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                passwordError ? 'border-red-500' : 'border-gray-300 focus:border-blue-600'
              }`}
            />
          </div>
          {passwordError && <p className="mt-1 text-sm text-red-600 font-medium">{passwordError}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className={`w-full bg-white border rounded-lg pl-11 pr-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                confirmError ? 'border-red-500' : 'border-gray-300 focus:border-blue-600'
              }`}
            />
          </div>
          {confirmError && <p className="mt-1 text-sm text-red-600 font-medium">{confirmError}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold py-3 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {loading ? 'Updating Password...' : 'Reset Password'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>

      <div className="text-center text-sm text-gray-600 border-t border-gray-100 pt-5">
        Remember your password?{' '}
        <Link href="/login" className="text-blue-600 font-semibold hover:underline">
          Sign In here
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center px-4 py-12">
      <Suspense fallback={<div className="text-gray-500 text-sm">Loading reset form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
