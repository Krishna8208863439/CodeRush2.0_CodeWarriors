import { Queue, Worker } from 'bullmq';
import { redis } from '../redis';
import { query } from '../db';

export const slaQueue = new Queue('sla-deadlines', { connection: redis });

export class SLAEngine {
  static async scheduleSLAJob(complaintId: string, category: string): Promise<void> {
    const ruleRes = await query(`SELECT deadline_hours FROM sla_rules WHERE category = $1`, [category]);
    const deadlineHours = ruleRes.rows[0]?.deadline_hours || 24;

    const delayMs = deadlineHours * 3600 * 1000;
    const deadlineDate = new Date(Date.now() + delayMs);

    await query(`UPDATE complaints SET sla_deadline = $1 WHERE id = $2`, [deadlineDate, complaintId]);

    await slaQueue.add(
      'check-sla-l1',
      { complaintId, level: 1 },
      { jobId: `sla-l1:${complaintId}`, delay: delayMs }
    );
  }

  static async cancelSLAJob(complaintId: string): Promise<void> {
    await slaQueue.remove(`sla-l1:${complaintId}`);
    await slaQueue.remove(`sla-l2:${complaintId}`);
  }
}

// Worker process for SLA escalations
export const slaWorker = new Worker(
  'sla-deadlines',
  async (job) => {
    const { complaintId, level } = job.data;
    const res = await query(`SELECT * FROM complaints WHERE id = $1`, [complaintId]);
    const complaint = res.rows[0];

    if (!complaint || complaint.status === 'RESOLVED') {
      return; // Complaint is resolved, no breach
    }

    if (level === 1) {
      // Escalation Level 1 (Department Head)
      await query(
        `UPDATE complaints SET escalated = TRUE, escalation_level = 1, breach_timestamp = NOW() WHERE id = $1`,
        [complaintId]
      );

      await query(
        `INSERT INTO audit_logs (table_name, operation, record_id, event, complaint_id)
         VALUES ('complaints', 'ESCALATION', $1, 'SLA_BREACH_LEVEL_1', $1)`,
        [complaintId]
      );

      console.log(`[SLA Engine] Complaint ${complaint.reference_id} escalated to Level 1 (Department Head).`);

      // Schedule Level 2 Escalation in 24 Hours
      await slaQueue.add(
        'check-sla-l2',
        { complaintId, level: 2 },
        { jobId: `sla-l2:${complaintId}`, delay: 24 * 3600 * 1000 }
      );
    } else if (level === 2) {
      // Escalation Level 2 (Municipal Commissioner)
      await query(`UPDATE complaints SET escalation_level = 2 WHERE id = $1`, [complaintId]);

      await query(
        `INSERT INTO audit_logs (table_name, operation, record_id, event, complaint_id)
         VALUES ('complaints', 'ESCALATION', $1, 'SLA_BREACH_LEVEL_2', $1)`,
        [complaintId]
      );

      console.log(`[SLA Engine] Complaint ${complaint.reference_id} escalated to Level 2 (Municipal Commissioner).`);
    }
  },
  { connection: redis }
);
