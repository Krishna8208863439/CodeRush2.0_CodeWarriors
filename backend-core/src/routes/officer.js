import express from 'express';
import { store } from '../db/store.js';

const router = express.Router();

// Officer Priority GIS Queue
router.get('/queue', (req, res) => {
  const { department_id, ward_id, urgency } = req.query;

  let queue = store.complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'REJECTED');

  if (department_id) {
    queue = queue.filter(c => c.department_id === department_id);
  }
  if (ward_id) {
    queue = queue.filter(c => c.ward_id === ward_id);
  }
  if (urgency) {
    queue = queue.filter(c => c.urgency === urgency);
  }

  const now = Date.now();

  // Calculate SLA Priority Risk Score
  const prioritized = queue.map(c => {
    const deadline = new Date(c.sla_deadline || Date.now() + 86400000).getTime();
    const hoursRemaining = (deadline - now) / 3600000;
    
    let urgencyWeight = 10;
    if (c.urgency === 'CRITICAL') urgencyWeight = 50;
    if (c.urgency === 'HIGH') urgencyWeight = 30;
    if (c.urgency === 'MEDIUM') urgencyWeight = 20;

    const duplicatesCount = store.complaints.filter(sub => sub.master_group_id && sub.master_group_id === c.master_group_id).length;

    let riskScore = urgencyWeight + (duplicatesCount * 5);
    if (hoursRemaining < 0) {
      riskScore += 100;
    } else if (hoursRemaining < 6) {
      riskScore += 40;
    }

    const dept = store.departments.find(d => d.id === c.department_id);

    return {
      ...c,
      department_name: dept ? dept.name : 'General',
      hours_remaining: parseFloat(hoursRemaining.toFixed(1)),
      is_sla_breached: hoursRemaining < 0,
      risk_score: riskScore,
      duplicate_impact: duplicatesCount
    };
  });

  prioritized.sort((a, b) => b.risk_score - a.risk_score);

  return res.json({
    total_active: prioritized.length,
    critical_breaches: prioritized.filter(p => p.is_sla_breached).length,
    queue: prioritized
  });
});

export default router;
