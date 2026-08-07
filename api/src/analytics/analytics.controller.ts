import { Request, Response, Router } from 'express';
import { query } from '../db';
import { redis } from '../redis';
import { authenticate, authorise } from '../auth/auth.middleware';
import { Role } from '../auth/roles';

export const analyticsRouter = Router();

// Cache helper wrapper
async function getCachedAnalytics<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds = 300): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  const result = await fetchFn();
  await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds);
  return result;
}

// 1. GET /analytics/by-category
analyticsRouter.get(
  '/by-category',
  authenticate,
  authorise([Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN]),
  async (req: Request, res: Response) => {
    const data = await getCachedAnalytics('analytics:by-category', async () => {
      const dbRes = await query(
        `SELECT category, COUNT(*) as volume
         FROM complaints
         WHERE category IS NOT NULL
         GROUP BY category ORDER BY volume DESC`
      );
      return dbRes.rows;
    });
    return res.json({ data });
  }
);

// 2. GET /analytics/by-ward
analyticsRouter.get(
  '/by-ward',
  authenticate,
  authorise([Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN]),
  async (req: Request, res: Response) => {
    const data = await getCachedAnalytics('analytics:by-ward', async () => {
      const dbRes = await query(
        `SELECT w.id, w.name, w.ward_number, COUNT(c.id) as volume
         FROM wards w
         LEFT JOIN complaints c ON c.ward_id = w.id
         GROUP BY w.id, w.name, w.ward_number ORDER BY volume DESC`
      );
      return dbRes.rows;
    });
    return res.json({ data });
  }
);

// 3. GET /analytics/department-performance
analyticsRouter.get(
  '/department-performance',
  authenticate,
  authorise([Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN]),
  async (req: Request, res: Response) => {
    const data = await getCachedAnalytics('analytics:department-performance', async () => {
      const dbRes = await query(
        `SELECT d.name as department,
                COUNT(c.id) as total_assigned,
                COUNT(CASE WHEN c.status = 'RESOLVED' THEN 1 END) as total_resolved,
                COUNT(CASE WHEN c.escalated = TRUE THEN 1 END) as sla_breaches,
                ROUND(AVG(CASE WHEN c.status = 'RESOLVED' THEN EXTRACT(EPOCH FROM (c.updated_at - c.created_at))/3600 END), 2) as avg_resolution_hours
         FROM departments d
         LEFT JOIN complaints c ON c.department_id = d.id
         GROUP BY d.name`
      );
      return dbRes.rows;
    });
    return res.json({ data });
  }
);

// 4. GET /analytics/satisfaction
analyticsRouter.get(
  '/satisfaction',
  authenticate,
  authorise([Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN]),
  async (req: Request, res: Response) => {
    const data = await getCachedAnalytics('analytics:satisfaction', async () => {
      const dbRes = await query(
        `SELECT d.name as department,
                ROUND(AVG(f.rating), 2) as avg_satisfaction,
                COUNT(f.id) as feedback_count
         FROM departments d
         LEFT JOIN complaints c ON c.department_id = d.id
         JOIN feedback f ON f.complaint_id = c.id
         GROUP BY d.name`
      );
      return dbRes.rows;
    });
    return res.json({ data });
  }
);
