import React from 'react';
import ComplaintDetailClient from './ComplaintDetailClient';

export function generateStaticParams() {
  return [
    { id: 'pin-1' },
    { id: 'pin-2' },
    { id: 'pin-3' },
    { id: 'pin-4' },
    { id: 'pin-5' },
    { id: 'demo' },
  ];
}

export default function ComplaintDetailPage() {
  return <ComplaintDetailClient />;
}
