'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Mail, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('CITIZEN');

  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    let valid = true;
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmError(null);
    setGeneralError(null);

    if (!name.trim() || name.trim().length < 2) {
      setNameError('Full name must be at least 2 characters.');
      valid = false;
    }
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    }
    if (!password || password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      valid = false;
    }
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match. Please verify your password.');
      valid = false;
    }

    return valid;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setEmailError('This email is already registered. Please sign in or use another email.');
      } else {
        setGeneralError(err.response?.data?.message || 'Registration failed. Please check your details and try again.');
      }
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Account</h1>
          <p className="text-base text-gray-600">Community Redressal Planner</p>
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
            <span className="leading-relaxed">Account created successfully! Redirecting you to sign in...</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5" noValidate>
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ramesh Kumar"
                className={`w-full bg-white border rounded-lg pl-11 pr-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  nameError ? 'border-red-500' : 'border-gray-300 focus:border-blue-600'
                }`}
              />
            </div>
            {nameError && <p className="mt-1 text-sm text-red-600 font-medium">{nameError}</p>}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@example.com"
                className={`w-full bg-white border rounded-lg pl-11 pr-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  emailError ? 'border-red-500' : 'border-gray-300 focus:border-blue-600'
                }`}
              />
            </div>
            {emailError && <p className="mt-1 text-sm text-red-600 font-medium">{emailError}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={`w-full bg-white border rounded-lg pl-11 pr-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  confirmError ? 'border-red-500' : 'border-gray-300 focus:border-blue-600'
                }`}
              />
            </div>
            {confirmError && <p className="mt-1 text-sm text-red-600 font-medium">{confirmError}</p>}
          </div>

          {/* System Role Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
            >
              <option value="CITIZEN">Citizen / Grievant</option>
              <option value="OFFICER">Municipal Officer</option>
              <option value="DEPT_HEAD">Department Head</option>
              <option value="COMMISSIONER">Municipal Commissioner</option>
              <option value="ADMIN">System Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold py-3 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 border-t border-gray-100 pt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">
            Sign In here
          </Link>
        </div>

      </div>
    </div>
  );
}
