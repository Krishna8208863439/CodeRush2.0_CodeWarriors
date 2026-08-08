'use client';

import React, { useEffect, useRef } from 'react';

interface GisMapProps {
  complaints: any[];
  onSelectComplaint?: (c: any) => void;
  selectedId?: string;
}

export default function GisMap({ complaints, onSelectComplaint, selectedId }: GisMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Dynamically import Leaflet on client side
    import('leaflet').then((L) => {
      if (!leafletMap.current) {
        leafletMap.current = L.map(mapRef.current!).setView([28.6139, 77.2090], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(leafletMap.current);
      }

      // Clear existing markers
      markersRef.current.forEach(m => leafletMap.current.removeLayer(m));
      markersRef.current = [];

      // Add pins for complaints
      complaints.forEach((c) => {
        if (!c.latitude || !c.longitude) return;

        const isSelected = selectedId === c.id;
        const color = c.urgency === 'CRITICAL' ? '#DC2626' : c.urgency === 'HIGH' ? '#D97706' : '#1E3A8A';

        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="background-color: ${color}; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">
                  ${c.urgency === 'CRITICAL' ? '!' : '•'}
                </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker([c.latitude, c.longitude], { icon: customIcon })
          .addTo(leafletMap.current)
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
              <strong style="color: #0F172A;">${c.ticket_number}</strong><br/>
              <span style="font-weight: bold; color: ${color};">${c.urgency} URGENCY</span><br/>
              <p style="margin: 4px 0;">${c.title}</p>
              <small style="color: #64748B;">${c.location_name}</small>
            </div>
          `);

        marker.on('click', () => {
          if (onSelectComplaint) onSelectComplaint(c);
        });

        markersRef.current.push(marker);
      });
    });

    return () => {
      // Keep map instance alive across standard renders
    };
  }, [complaints, selectedId, onSelectComplaint]);

  return (
    <div className="w-full h-full min-h-[450px] relative rounded-lg overflow-hidden border border-slate-300 shadow-sm">
      <div ref={mapRef} className="w-full h-full min-h-[450px]" />
    </div>
  );
}
