import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Community Redressal Planner — AI Civic Operating System',
  description: 'AI-powered municipal complaint management, SLA escalation tracking, and GIS mapping platform.',
  manifest: '/manifest.json',
  themeColor: '#0284c7',
  icons: { icon: '/favicon.ico' },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
