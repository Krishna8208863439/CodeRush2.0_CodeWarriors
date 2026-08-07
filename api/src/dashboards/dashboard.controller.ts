import { Request, Response, Router } from 'express';
import { query } from '../db';
import { authenticate, authorise, AuthenticatedRequest } from '../auth/auth.middleware';
import { Role } from '../auth/roles';

export const dashboardRouter = Router();

// 1. GET /dashboard/citizen
dashboardRouter.get('/citizen', authenticate, authorise([Role.CITIZEN]), async (req: AuthenticatedRequest, res: Response) => {
  const dbRes = await query(
    `SELECT c.*, d.name as department_name
     FROM complaints c
     LEFT JOIN departments d ON d.id = c.department_id
     WHERE c.citizen_id = $1
     ORDER BY c.created_at DESC`,
    [req.user!.sub]
  );
  return res.json({ complaints: dbRes.rows });
});

// 2. GET /dashboard/officer
dashboardRouter.get('/officer', authenticate, authorise([Role.OFFICER]), async (req: AuthenticatedRequest, res: Response) => {
  const dbRes = await query(
    `SELECT c.*, d.name as department_name, w.name as ward_name, gl.latitude, gl.longitude, gl.formatted_address
     FROM complaints c
     LEFT JOIN departments d ON d.id = c.department_id
     LEFT JOIN wards w ON w.id = c.ward_id
     LEFT JOIN gis_locations gl ON gl.complaint_id = c.id
     WHERE c.officer_id = $1
     ORDER BY c.priority_score DESC, c.created_at ASC`,
    [req.user!.sub]
  );
  return res.json({ assignedComplaints: dbRes.rows });
});

// 3. GET /dashboard/department
dashboardRouter.get(
  '/department',
  authenticate,
  authorise([Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    // Fetch Department Head's department
    const deptHeadRes = await query(`SELECT id, name FROM departments WHERE department_head_id = $1 LIMIT 1`, [req.user!.sub]);
    const department = deptHeadRes.rows[0] || null;
    const deptId = department?.id || null;

    const complaintsRes = await query(
      `SELECT c.*, u.name as officer_name
       FROM complaints c
       LEFT JOIN users u ON u.id = c.officer_id
       WHERE ($1::uuid IS NULL OR c.department_id = $1)
       ORDER BY c.created_at DESC`,
      [deptId]
    );

    // Officers in department
    const officersRes = await query(
      `SELECT o.id, u.name, u.email, o.designation,
              (SELECT COUNT(*) FROM complaints WHERE officer_id = u.id AND status != 'RESOLVED') as active_count,
              (SELECT COUNT(*) FROM complaints WHERE officer_id = u.id AND status = 'RESOLVED') as resolved_count
       FROM officers o
       JOIN users u ON u.id = o.user_id
       WHERE ($1::uuid IS NULL OR o.department_id = $1)`,
      [deptId]
    );

    return res.json({
      department,
      complaints: complaintsRes.rows,
      officers: officersRes.rows,
    });
  }
);

// 4. GET /dashboard/executive
dashboardRouter.get(
  '/executive',
  authenticate,
  authorise([Role.COMMISSIONER, Role.ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    const totalVolume = await query(`SELECT COUNT(*) as total FROM complaints`);
    const resolvedVolume = await query(`SELECT COUNT(*) as total FROM complaints WHERE status = 'RESOLVED'`);
    const slaBreaches = await query(`SELECT COUNT(*) as total FROM complaints WHERE escalated = TRUE`);

    const byDept = await query(
      `SELECT d.name, COUNT(c.id) as volume,
              COUNT(CASE WHEN c.status = 'RESOLVED' THEN 1 END) as resolved
       FROM departments d
       LEFT JOIN complaints c ON c.department_id = d.id
       GROUP BY d.name`
    );

    return res.json({
      totalComplaints: parseInt(totalVolume.rows[0].total),
      resolvedComplaints: parseInt(resolvedVolume.rows[0].total),
      slaBreaches: parseInt(slaBreaches.rows[0].total),
      byDepartment: byDept.rows,
    });
  }
);

// 5. GET /dashboard/admin
dashboardRouter.get('/admin', authenticate, authorise([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const usersRes = await query(`SELECT id, name, email, phone, role, is_verified, is_locked, created_at FROM users ORDER BY created_at DESC`);
  const reviewQueueRes = await query(
    `SELECT c.*, ap.confidence, ap.reasoning
     FROM complaints c
     JOIN ai_predictions ap ON ap.complaint_id = c.id
     WHERE c.status = 'MANUAL_REVIEW' OR ap.is_manual_review = TRUE`
  );
  const appealsRes = await query(
    `SELECT a.*, c.reference_id, u.name as citizen_name
     FROM appeals a
     JOIN complaints c ON c.id = a.complaint_id
     JOIN users u ON u.id = a.citizen_id
     WHERE a.status = 'PENDING'`
  );

  return res.json({
    users: usersRes.rows,
    reviewQueue: reviewQueueRes.rows,
    appeals: appealsRes.rows,
  });
});

// 6. PATCH /complaints/:id/status (Officer Status Transition)
dashboardRouter.patch('/complaints/:id/status', authenticate, authorise([Role.OFFICER]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!['IN_PROGRESS', 'RESOLVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'INVALID_STATUS', message: 'Allowed status: IN_PROGRESS, RESOLVED, REJECTED' });
  }

  await query(`UPDATE complaints SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);
  await query(
    `INSERT INTO status_history (complaint_id, officer_id, status, note) VALUES ($1, $2, $3, $4)`,
    [id, req.user!.sub, status, note || '']
  );

  return res.json({ message: `Complaint status updated to ${status}` });
});

// 7. PATCH /complaints/:id/assign (Department Head Assignment)
dashboardRouter.patch(
  '/complaints/:id/assign',
  authenticate,
  authorise([Role.DEPARTMENT_HEAD, Role.ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { officerId } = req.body;

    if (!officerId) return res.status(400).json({ error: 'OFFICER_ID_REQUIRED' });

    await query(`UPDATE complaints SET officer_id = $1, status = 'ASSIGNED', updated_at = NOW() WHERE id = $2`, [
      officerId,
      id,
    ]);

    await query(
      `INSERT INTO status_history (complaint_id, officer_id, status, note) VALUES ($1, $2, 'ASSIGNED', 'Assigned by Department Head')`,
      [id, officerId]
    );

    return res.json({ message: 'Complaint assigned to officer successfully' });
  }
);
