import React from 'react';
import DepartmentDashboardClient from './DepartmentDashboardClient';

export function generateStaticParams() {
  return [
    { dept: 'WSS' },
    { dept: 'SWM' },
    { dept: 'PWD' },
    { dept: 'ESB' },
    { dept: 'DSM' },
  ];
}

export default function OfficerDepartmentDashboardPage() {
  return <DepartmentDashboardClient />;
}
