import { Queue, Worker } from 'bullmq';
import { redis } from '../redis';
import { query } from '../db';

// BullMQ needs the raw ioredis connection.
// When Redis is unavailable, SLA jobs are logged but not queued.
function getBullConnection() {
  try {
    return (redis as any).raw || (redis as any).client;
  } catch {
    return null;
  }
}

let slaQueue: Queue | null = null;
let slaWorker: Worker | null = null;

try {
  const conn = getBullConnection();
  if (conn) {
    slaQueue = new Queue('sla-deadlines', { connection: conn });

    slaWorker = new Worker(
      'sla-deadlines',
      async (job) => {
        const { complaintId, level } = job.data;
        const res = await query(`SELECT * FROM complaints WHERE id = $1`, [complaintId]);
        const complaint = res.rows[0];

        if (!complaint || complaint.status === 'RESOLVED') return;

        if (level === 1) {
          await query(
            `UPDATE complaints SET escalated = TRUE, escalation_level = 1, breach_timestamp = NOW() WHERE id = $1`,
            [complaintId]
          );
          await query(
            `INSERT INTO audit_logs (table_name, operation, record_id, event, complaint_id)
             VALUES ('complaints', 'ESCALATION', $1, 'SLA_BREACH_LEVEL_1', $1)`,
            [complaintId]
          );
          console.log(`[SLA] ${complaint.reference_id} → Level 1 escalation (Dept Head).`);

          if (slaQueue) {
            await slaQueue.add(
              'check-sla-l2',
              { complaintId, level: 2 },
              { jobId: `sla-l2:${complaintId}`, delay: 24 * 3600 * 1000 }
            );
          }
        } else if (level === 2) {
          await query(`UPDATE complaints SET escalation_level = 2 WHERE id = $1`, [complaintId]);
          await query(
            `INSERT INTO audit_logs (table_name, operation, record_id, event, complaint_id)
             VALUES ('complaints', 'ESCALATION', $1, 'SLA_BREACH_LEVEL_2', $1)`,
            [complaintId]
          );
          console.log(`[SLA] ${complaint.reference_id} → Level 2 escalation (Commissioner).`);
        }
      },
      { connection: conn }
    );
  } else {
    console.warn('[SLA Engine] Redis unavailable — SLA jobs will not be queued.');
  }
} catch (e) {
  console.warn('[SLA Engine] BullMQ init failed:', e);
}

export { slaQueue, slaWorker };

export class SLAEngine {
  static async scheduleSLAJob(complaintId: string, category: string): Promise<void> {
    const ruleRes = await query(`SELECT deadline_hours FROM sla_rules WHERE category = $1`, [category]);
    const deadlineHours = ruleRes.rows[0]?.deadline_hours || 24;
    const delayMs = deadlineHours * 3600 * 1000;
    const deadlineDate = new Date(Date.now() + delayMs);

    await query(`UPDATE complaints SET sla_deadline = $1 WHERE id = $2`, [deadlineDate, complaintId]);

    if (slaQueue) {
      await slaQueue.add(
        'check-sla-l1',
        { complaintId, level: 1 },
        { jobId: `sla-l1:${complaintId}`, delay: delayMs }
      );
      console.log(`[SLA] Scheduled L1 for complaint ${complaintId} in ${deadlineHours}h`);
    } else {
      console.warn(`[SLA] Redis not available — could not schedule job for complaint ${complaintId}`);
    }
  }

  static async cancelSLAJob(complaintId: string): Promise<void> {
    if (!slaQueue) return;
    await slaQueue.remove(`sla-l1:${complaintId}`).catch(() => {});
    await slaQueue.remove(`sla-l2:${complaintId}`).catch(() => {});
  }
}
