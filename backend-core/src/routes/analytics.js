import express from 'express';
import { store } from '../db/store.js';

const router = express.Router();

// GIS Heatmap Cluster GeoJSON
router.get('/heatmap', (req, res) => {
  const geojsonFeatures = store.complaints.map(c => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [c.longitude, c.latitude]
    },
    properties: {
      id: c.id,
      ticket_number: c.ticket_number,
      title: c.title,
      category: c.category,
      urgency: c.urgency,
      status: c.status,
      is_master_ticket: c.is_master_ticket,
      weight: c.urgency === 'CRITICAL' ? 1.0 : c.urgency === 'HIGH' ? 0.7 : 0.4
    }
  }));

  return res.json({
    type: 'FeatureCollection',
    features: geojsonFeatures
  });
});

// Executive Analytics Summary
router.get('/summary', (req, res) => {
  const total = store.complaints.length;
  
  // Category breakdown
  const categoryCounts = {};
  const statusCounts = {};
  let totalDuplicatesDetected = 0;

  store.complaints.forEach(c => {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    if (!c.is_master_ticket || c.status === 'DUPLICATE_GROUPED') {
      totalDuplicatesDetected++;
    }
  });

  // Department Efficiency Rating
  const departmentStats = store.departments.map(dept => {
    const deptComplaints = store.complaints.filter(c => c.department_id === dept.id);
    const resolved = deptComplaints.filter(c => c.status === 'RESOLVED').length;
    const active = deptComplaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'REJECTED').length;
    
    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      total_tickets: deptComplaints.length,
      resolved_tickets: resolved,
      active_tickets: active,
      resolution_rate: deptComplaints.length > 0 ? parseFloat(((resolved / deptComplaints.length) * 100).toFixed(1)) : 100
    };
  });

  return res.json({
    total_complaints: total,
    total_duplicates_filtered: totalDuplicatesDetected,
    duplicate_efficiency_gain_pct: total > 0 ? parseFloat(((totalDuplicatesDetected / total) * 100).toFixed(1)) : 0,
    category_breakdown: categoryCounts,
    status_breakdown: statusCounts,
    departments: departmentStats
  });
});

export default router;
