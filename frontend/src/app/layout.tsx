import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Community Redressal Planner — AI Civic Operating System',
  description: 'AI-powered municipal complaint management, SLA escalation tracking, and GIS mapping platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
