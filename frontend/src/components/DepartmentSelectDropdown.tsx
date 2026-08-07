'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Building2 } from 'lucide-react';

export const MUNICIPAL_DEPARTMENTS = [
  { code: 'WSS', name: 'Water Leakage & Water Supply', category: 'WATER_LEAKAGE' },
  { code: 'SWM', name: 'Garbage & Sanitation', category: 'GARBAGE' },
  { code: 'PWD', name: 'Road Damage & Public Works', category: 'ROAD_DAMAGE' },
  { code: 'ESB', name: 'Streetlight & Electrical', category: 'STREET_LIGHT' },
  { code: 'DSM', name: 'Drainage & Sewerage', category: 'DRAINAGE' },
];

interface DepartmentSelectDropdownProps {
  selectedDeptCode?: string;
  onSelectDepartment?: (deptCode: string) => void;
  className?: string;
}

export default function DepartmentSelectDropdown({
  selectedDeptCode = 'WSS',
  onSelectDepartment,
  className = '',
}: DepartmentSelectDropdownProps) {
  const router = useRouter();

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDept = e.target.value;
    if (onSelectDepartment) {
      onSelectDepartment(newDept);
    } else {
      // Default programmatic navigation to department-specific route
      router.push(`/dashboard/officer/${newDept}`);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="relative flex items-center">
        <Building2 className="w-4 h-4 text-cyan-400 absolute left-3 pointer-events-none z-10" />
        <select
          value={selectedDeptCode}
          onChange={handleDeptChange}
          className="w-full bg-slate-900 text-slate-100 font-bold text-xs border border-slate-700 hover:border-cyan-500 rounded-xl pl-9 pr-9 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all cursor-pointer shadow-sm"
        >
          {MUNICIPAL_DEPARTMENTS.map((dept) => (
            <option key={dept.code} value={dept.code} className="bg-slate-900 text-slate-100 py-1">
              {dept.name} ({dept.code})
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none z-10" />
      </div>
    </div>
  );
}
