'use client';

/**
 * /dashboard/officer (no dept segment)
 *
 * Officers should always land on /dashboard/officer/[DEPT_CODE] after login.
 * This page exists only as a fallback: it reads the dept from the stored user
 * object and redirects immediately.  If no dept is stored it sends the user
 * back to login so they can select a department.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OfficerDashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      const dept: string | undefined = user?.department;

      if (dept) {
        router.replace(`/dashboard/officer/${dept.toUpperCase()}`);
      } else {
        // No department on record — send back to officer login tab
        router.replace('/login?role=officer');
      }
    } catch {
      router.replace('/login?role=officer');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400 text-sm flex items-center gap-2">
        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        Redirecting to your department dashboard…
      </div>
    </div>
  );
}
