import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Community Redressal Planner — Civic Operating System',
  description: 'Clean, AI-powered municipal complaint management, SLA escalation tracking, and GIS mapping platform.',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-[#fafafa] text-[#1f2937] antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}
