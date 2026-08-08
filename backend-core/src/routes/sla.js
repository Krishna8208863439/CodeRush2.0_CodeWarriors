import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';

const router = express.Router();

// SLA Dashboard Metrics
router.get('/metrics', (req, res) => {
  const totalComplaints = store.complaints.length;
  const resolved = store.complaints.filter(c => c.status === 'RESOLVED');
  const now = Date.now();

  let resolvedWithinSLA = 0;
  resolved.forEach(c => {
    if (c.resolved_at && c.sla_deadline) {
      if (new Date(c.resolved_at).getTime() <= new Date(c.sla_deadline).getTime()) {
        resolvedWithinSLA++;
      }
    }
  });

  const activeBreaches = store.complaints.filter(c => 
    c.status !== 'RESOLVED' && 
    c.status !== 'REJECTED' && 
    new Date(c.sla_deadline).getTime() < now
  );

  const pendingNearBreach = store.complaints.filter(c => {
    if (c.status === 'RESOLVED' || c.status === 'REJECTED') return false;
    const hoursLeft = (new Date(c.sla_deadline).getTime() - now) / 3600000;
    return hoursLeft > 0 && hoursLeft <= 12;
  });

  const slaComplianceRate = totalComplaints > 0 
    ? parseFloat(((resolvedWithinSLA / Math.max(1, resolved.length)) * 100).toFixed(1)) 
    : 100.0;

  return res.json({
    total_complaints: totalComplaints,
    resolved_total: resolved.length,
    resolved_within_sla: resolvedWithinSLA,
    active_sla_breaches: activeBreaches.length,
    near_breach_count: pendingNearBreach.length,
    overall_sla_compliance_rate: slaComplianceRate,
    slas_by_department: store.slas
  });
});

// Auto-Escalation Engine Trigger
router.post('/escalate-check', (req, res) => {
  const now = Date.now();
  let escalatedCount = 0;

  store.complaints.forEach(c => {
    if (c.status !== 'RESOLVED' && c.status !== 'REJECTED' && c.status !== 'ESCALATED') {
      const deadline = new Date(c.sla_deadline).getTime();
      if (deadline < now) {
        c.status = 'ESCALATED';
        c.escalated_at = new Date().toISOString();
        c.updated_at = new Date().toISOString();
        escalatedCount++;

        store.auditLogs.unshift({
          id: `log-${uuidv4().substring(0, 8)}`,
          complaint_id: c.id,
          performed_by: null,
          action: 'AUTO_ESCALATED_SLA_BREACH',
          previous_status: 'IN_PROGRESS',
          new_status: 'ESCALATED',
          notes: 'System SLA Escalation Engine triggered automatically due to resolution target time expiration.',
          created_at: new Date().toISOString()
        });
      }
    }
  });

  return res.json({
    message: `SLA Engine evaluation complete. ${escalatedCount} ticket(s) escalated to higher authority.`,
    escalated_count: escalatedCount
  });
});

export default router;
