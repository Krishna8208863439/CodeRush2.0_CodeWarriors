'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { MapPin, ArrowLeft, RefreshCw, Filter, Layers } from 'lucide-react';
import { api } from '@/lib/api';

export default function PostGISMapPage() {
  const [pins, setPins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  // Load GIS Complaints from PostGIS Backend
  useEffect(() => {
    async function loadGISData() {
      setLoading(true);
      try {
        let url = '/gis/complaints?';
        if (statusFilter) url += `status=${statusFilter}&`;
        if (categoryFilter) url += `category=${categoryFilter}&`;

        const res = await api.get(url);
        let fetchedFeatures = res.data?.features || [];

        // Seed fallback realistic PostGIS pins if database is empty in dev
        if (fetchedFeatures.length === 0 && !statusFilter && !categoryFilter) {
          fetchedFeatures = [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [72.8777, 19.0760] },
              properties: {
                id: 'pin-1',
                referenceId: 'CRP-2026-444624',
                category: 'WATER_LEAKAGE',
                status: 'SUBMITTED',
                latitude: 19.0760,
                longitude: 72.8777,
                formattedAddress: 'Lat: 19.0760, Lon: 72.8777 (Kurla West)',
              },
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [72.8850, 19.0850] },
              properties: {
                id: 'pin-2',
                referenceId: 'CRP-2026-881920',
                category: 'GARBAGE',
                status: 'IN_PROGRESS',
                latitude: 19.0850,
                longitude: 72.8850,
                formattedAddress: 'Lat: 19.0850, Lon: 72.8850 (Ghatkopar West)',
              },
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [72.8900, 19.0900] },
              properties: {
                id: 'pin-3',
                referenceId: 'CRP-2026-310492',
                category: 'STREET_LIGHT',
                status: 'RESOLVED',
                latitude: 19.0900,
                longitude: 72.8900,
                formattedAddress: 'Lat: 19.0900, Lon: 72.8900 (Vidyavihar)',
              },
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [72.8650, 19.0650] },
              properties: {
                id: 'pin-4',
                referenceId: 'CRP-2026-112984',
                category: 'ROAD_DAMAGE',
                status: 'SUBMITTED',
                latitude: 19.0650,
                longitude: 72.8650,
                formattedAddress: 'Lat: 19.0650, Lon: 72.8650 (Bandra East)',
              },
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [72.8550, 19.0550] },
              properties: {
                id: 'pin-5',
                referenceId: 'CRP-2026-773401',
                category: 'DRAINAGE',
                status: 'IN_PROGRESS',
                latitude: 19.0550,
                longitude: 72.8550,
                formattedAddress: 'Lat: 19.0550, Lon: 72.8550 (Dharavi)',
              },
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [72.8450, 19.0450] },
              properties: {
                id: 'pin-6',
                referenceId: 'CRP-2026-905112',
                category: 'GENERAL',
                status: 'RESOLVED',
                latitude: 19.0450,
                longitude: 72.8450,
                formattedAddress: 'Lat: 19.0450, Lon: 72.8450 (Sion West)',
              },
            },
          ];
        }

        setPins(fetchedFeatures);
      } catch (err: any) {
        console.error('GIS load error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadGISData();
  }, [statusFilter, categoryFilter]);

  // Leaflet Map Initialization & Reactive Marker / Heatmap Rendering
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isSubscribed = true;

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      if (!isSubscribed) return;

      // Include Leaflet CSS dynamically if not injected
      if (!document.getElementById('leaflet-css-stylesheet')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-stylesheet';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Initialize map instance if not already initialized
      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [19.0760, 72.8777],
          zoom: 12,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        markersGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const layerGroup = markersGroupRef.current;

      if (!map || !layerGroup) return;

      // Clear existing markers/layers
      layerGroup.clearLayers();

      if (pins.length > 0) {
        const bounds: [number, number][] = [];

        pins.forEach((pin) => {
          const coords = pin.geometry?.coordinates || [pin.properties?.longitude, pin.properties?.latitude];
          if (!coords || coords.length < 2) return;
          const [lon, lat] = coords;
          if (typeof lat !== 'number' || typeof lon !== 'number') return;

          bounds.push([lat, lon]);

          const status = pin.properties?.status || 'SUBMITTED';
          const color =
            status === 'RESOLVED'
              ? '#22c55e'
              : status === 'IN_PROGRESS'
              ? '#3b82f6'
              : '#eab308';

          if (heatmapEnabled) {
            // Heatmap Density Layer (Radius circles with gradient opacity)
            L.circle([lat, lon], {
              radius: 400,
              color: color,
              fillColor: color,
              fillOpacity: 0.35,
              weight: 1,
            }).addTo(layerGroup);
          } else {
            // Standard Pin Marker Layer
            const marker = L.circleMarker([lat, lon], {
              radius: 9,
              fillColor: color,
              color: '#ffffff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.9,
            });

            marker.bindPopup(`
              <div style="font-family: sans-serif; padding: 4px;">
                <div style="font-weight: bold; color: #0f172a; font-size: 13px;">${pin.properties.referenceId}</div>
                <div style="font-size: 11px; font-weight: 600; color: #2563eb; margin-top: 2px;">${pin.properties.category}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Status: <b>${pin.properties.status}</b></div>
                <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</div>
              </div>
            `);

            marker.addTo(layerGroup);
          }
        });

        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
        }
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [pins, heatmapEnabled]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans">
      
      {/* ── 1. HEADER BAR ───────────────────────────────────────── */}
      <header className="bg-[#0b0f19] border-b border-slate-800 py-3.5 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 z-20 shadow-md">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/dashboard/citizen"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all shrink-0"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shadow-sm shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
              PostGIS Municipal Hotspot Map
            </h1>
          </div>
        </div>

        {/* Filters & Heatmap Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500 transition-all"
          >
            <option value="">All Categories</option>
            <option value="WATER_LEAKAGE">WATER_LEAKAGE</option>
            <option value="GARBAGE">GARBAGE</option>
            <option value="STREET_LIGHT">STREET_LIGHT</option>
            <option value="ROAD_DAMAGE">ROAD_DAMAGE</option>
            <option value="DRAINAGE">DRAINAGE</option>
            <option value="GENERAL">GENERAL</option>
          </select>

          {/* Heatmap Checkbox */}
          <label className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 hover:border-slate-700 cursor-pointer select-none transition-all">
            <input
              type="checkbox"
              checked={heatmapEnabled}
              onChange={(e) => setHeatmapEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-0 accent-cyan-500 cursor-pointer"
            />
            <span>Heatmap Layer</span>
          </label>
        </div>
      </header>

      {/* ── 2. MAIN CONTAINER ───────────────────────────────────── */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
        
        {/* Main Centered Rounded Container */}
        <div className="bg-[#1e293b]/60 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col gap-5">
          
          {/* Container Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="text-xs sm:text-sm font-mono font-bold text-cyan-400 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>PostGIS ST_Within() Spatial Queries | Total Pins: [{pins.length}]</span>
            </div>

            {/* Status Legend */}
            <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-xs" />
                <span>SUBMITTED</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs" />
                <span>IN_PROGRESS</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-xs" />
                <span>RESOLVED</span>
              </span>
            </div>
          </div>

          {/* Interactive Leaflet Map Container */}
          <div className="relative w-full h-[360px] sm:h-[420px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
            {loading && (
              <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center text-xs font-mono text-cyan-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Querying PostGIS Spatial Index (GIST)...</span>
              </div>
            )}
            <div ref={mapContainerRef} className="w-full h-full z-10" />
          </div>

          {/* Card Grid (Responsive up to 3 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {pins.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 text-xs font-mono">
                No PostGIS spatial records match current status and category filters.
              </div>
            ) : (
              pins.map((pin) => {
                const props = pin.properties || {};
                const status = props.status || 'SUBMITTED';
                const lat = props.latitude ?? pin.geometry?.coordinates?.[1] ?? 19.0760;
                const lon = props.longitude ?? pin.geometry?.coordinates?.[0] ?? 72.8777;

                const dotColorClass =
                  status === 'RESOLVED'
                    ? 'bg-green-500'
                    : status === 'IN_PROGRESS'
                    ? 'bg-blue-500'
                    : 'bg-yellow-400';

                return (
                  <div
                    key={props.id || props.referenceId}
                    className="bg-[#0f172a] border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 transition-all duration-200 space-y-2.5 shadow-sm"
                  >
                    {/* Top Row: Complaint ID + Status Dot */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {props.referenceId || 'CRP-2026-000000'}
                      </span>
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColorClass} shadow-xs`} title={status} />
                    </div>

                    {/* Middle: Category Title */}
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      {props.category || 'GENERAL'}
                    </h3>

                    {/* Bottom: Location Info */}
                    <p className="text-xs text-slate-400 font-mono truncate">
                      {props.formattedAddress || `Lat: ${Number(lat).toFixed(4)}, Lon: ${Number(lon).toFixed(4)}`}
                    </p>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </main>

      {/* ── 3. FOOTER ───────────────────────────────────────────── */}
      <footer className="py-4 text-center text-xs text-slate-500 font-mono border-t border-slate-900 mt-auto">
        Leaflet + OpenStreetMap tile layer backed by PostGIS GEOMETRY(Point, 4326) GIST spatial index
      </footer>
    </div>
  );
}
