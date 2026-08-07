'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Mail, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = () => {
    setEmailError(null);
    setGeneralError(null);

    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch (err: any) {
      setGeneralError(err.response?.data?.message || 'Unable to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-8 shadow-sm space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Forgot Password</h1>
          <p className="text-base text-gray-600">Enter your registered email address to receive a password reset link.</p>
        </div>

        {generalError && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{generalError}</span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-base">Check your email</p>
                <p className="leading-relaxed">
                  If an account exists with <strong>{email}</strong>, a password reset link has been sent to your inbox.
                </p>
              </div>
            </div>

            <div className="text-center">
              <Link href="/login" className="text-sm font-semibold text-blue-600 hover:underline">
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`w-full bg-white border rounded-lg pl-11 pr-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    emailError ? 'border-red-500' : 'border-gray-300 focus:border-blue-600'
                  }`}
                />
              </div>
              {emailError && <p className="mt-1 text-sm text-red-600 font-medium">{emailError}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold py-3 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}

        <div className="text-center text-sm text-gray-600 border-t border-gray-100 pt-5">
          Remember your password?{' '}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">
            Sign In here
          </Link>
        </div>

      </div>
    </div>
  );
}
