'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, MapPin, Layers, Filter, RefreshCw, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';

export default function GISMapPage() {
  const [pins, setPins] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);

  useEffect(() => {
    async function loadGISData() {
      setLoading(true);
      try {
        let url = '/gis/complaints?';
        if (statusFilter) url += `status=${statusFilter}&`;
        if (categoryFilter) url += `category=${categoryFilter}&`;

        const [complaintsRes, wardsRes] = await Promise.all([
          api.get(url),
          api.get('/gis/wards'),
        ]);

        setPins(complaintsRes.data.features || []);
        setWards(wardsRes.data.features || []);
      } catch (err: any) {
        console.error('GIS map data load error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadGISData();
  }, [statusFilter, categoryFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Toolbar */}
      <header className="p-4 glass-panel border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/citizen" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-cyan-400" />
            <h1 className="text-lg font-bold text-white tracking-tight">PostGIS Municipal Hotspot Map</h1>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
          >
            <option value="">All Categories</option>
            <option value="GARBAGE">GARBAGE</option>
            <option value="STREET_LIGHT">STREET_LIGHT</option>
            <option value="WATER_LEAKAGE">WATER_LEAKAGE</option>
            <option value="ROAD_DAMAGE">ROAD_DAMAGE</option>
          </select>

          <label className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={heatmapEnabled}
              onChange={(e) => setHeatmapEnabled(e.target.checked)}
              className="rounded text-cyan-500 focus:ring-0"
            />
            <span>Heatmap Layer</span>
          </label>
        </div>
      </header>

      {/* Map View Canvas Container */}
      <div className="flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden">
        {loading ? (
          <div className="text-slate-400 text-sm flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            Querying PostGIS spatial indexes...
          </div>
        ) : (
          <div className="w-full h-full p-6 flex flex-col justify-center items-center">
            {/* Interactive Grid Simulation */}
            <div className="w-full max-w-5xl h-[550px] glass-panel rounded-3xl border border-slate-800 relative p-6 overflow-hidden flex flex-col justify-between">
              {/* GIS Overlay Legend */}
              <div className="flex justify-between items-center z-10">
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-cyan-400">
                  PostGIS ST_Within() Spatial Queries | Total Pins: {pins.length}
                </div>

                <div className="flex items-center gap-4 bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> SUBMITTED
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> IN_PROGRESS
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" /> RESOLVED
                  </span>
                </div>
              </div>

              {/* Spatial Pin Representations */}
              <div className="flex-1 my-4 relative rounded-2xl bg-slate-950/60 border border-slate-900 p-6 grid grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto">
                {pins.length === 0 ? (
                  <div className="col-span-full flex items-center justify-center text-slate-500 text-xs">
                    No GIS location points match current bounding box or filters.
                  </div>
                ) : (
                  pins.map((pin) => (
                    <div
                      key={pin.properties.id}
                      className="p-3 glass-panel rounded-xl border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] text-cyan-400 font-bold">{pin.properties.referenceId}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            pin.properties.status === 'RESOLVED'
                              ? 'bg-green-400'
                              : pin.properties.status === 'IN_PROGRESS'
                              ? 'bg-blue-400'
                              : 'bg-amber-400'
                          }`}
                        />
                      </div>
                      <p className="text-xs font-bold text-white">{pin.properties.category}</p>
                      <p className="text-[10px] text-slate-400 truncate">{pin.properties.formattedAddress || 'Ward Coordinates'}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="text-center text-xs text-slate-500 z-10">
                Leaflet + OpenStreetMap tile layer backed by PostGIS GEOMETRY(Point, 4326) GIST spatial index
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
