import { Response, Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../auth/auth.middleware';
import { query } from '../db';

export const citizenRouter = Router();

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional().nullable(),
  address: z.string().optional().nullable(),
  preferred_language: z.enum(['EN', 'HI', 'MR', 'TA', 'TE', 'KN']).optional(),
  notification_preferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(true),
    push: z.boolean().default(true),
  }).optional(),
});

const requestOtpSchema = z.object({
  phone: z.string().min(10, 'Valid phone number required'),
});

const verifyOtpSchema = z.object({
  otp: z.string().min(6, '6-digit OTP code required'),
});

// 1. GET /api/citizens/profile
citizenRouter.get('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const userRes = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.preferred_language, 
              u.notification_preferences, u.is_phone_verified,
              c.address
       FROM users u
       LEFT JOIN citizens c ON c.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User profile not found' });
    }

    const user = userRes.rows[0];
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      address: user.address || '',
      preferred_language: user.preferred_language || 'EN',
      notification_preferences: user.notification_preferences || { email: true, sms: true, push: true },
      is_phone_verified: !!user.is_phone_verified,
    });
  } catch (err: any) {
    console.error('[Get Citizen Profile Error]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// 2. PATCH /api/citizens/profile
citizenRouter.patch('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const data = updateProfileSchema.parse(req.body);

    // Update users table
    if (data.name !== undefined || data.phone !== undefined || data.preferred_language !== undefined || data.notification_preferences !== undefined) {
      await query(
        `UPDATE users
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             preferred_language = COALESCE($3, preferred_language),
             notification_preferences = COALESCE($4, notification_preferences),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [
          data.name ?? null,
          data.phone ?? null,
          data.preferred_language ?? null,
          data.notification_preferences ? JSON.stringify(data.notification_preferences) : null,
          userId,
        ]
      );
    }

    // Update citizens table (address)
    if (data.address !== undefined) {
      // Upsert citizen record
      await query(
        `INSERT INTO citizens (user_id, address)
         VALUES ($1, $2)
         ON CONFLICT (id) DO NOTHING`,
        [userId, data.address]
      );
      await query(
        `UPDATE citizens SET address = $1 WHERE user_id = $2`,
        [data.address, userId]
      );
    }

    // Fetch updated profile
    const updatedRes = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.preferred_language, 
              u.notification_preferences, u.is_phone_verified,
              c.address
       FROM users u
       LEFT JOIN citizens c ON c.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    const user = updatedRes.rows[0];
    return res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address || '',
        preferred_language: user.preferred_language || 'EN',
        notification_preferences: user.notification_preferences || { email: true, sms: true, push: true },
        is_phone_verified: !!user.is_phone_verified,
      },
    });
  } catch (err: any) {
    console.error('[Update Citizen Profile Error]', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation failed' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// 3. POST /api/citizens/verify-phone/request
citizenRouter.post('/verify-phone/request', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { phone } = requestOtpSchema.parse(req.body);

    // Save phone and simulated OTP to user record
    const simulatedOtp = '123456';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await query(
      `UPDATE users
       SET phone = $1, phone_otp_code = $2, phone_otp_expires_at = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [phone, simulatedOtp, expiresAt, userId]
    );

    return res.json({
      message: 'OTP sent to mobile number',
      mode: '[SIMULATED]',
      simulatedOtp: '123456',
      instruction: 'Demo mode active: Use OTP code 123456 to verify',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation failed' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// 4. POST /api/citizens/verify-phone/verify
citizenRouter.post('/verify-phone/verify', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { otp } = verifyOtpSchema.parse(req.body);

    const userRes = await query(
      `SELECT phone_otp_code, phone_otp_expires_at FROM users WHERE id = $1`,
      [userId]
    );

    const user = userRes.rows[0];

    // Check if OTP matches '123456' (or saved OTP)
    if (otp !== '123456' && otp !== user?.phone_otp_code) {
      return res.status(400).json({ error: 'INVALID_OTP', message: 'Incorrect OTP entered. Demo code is 123456.' });
    }

    await query(
      `UPDATE users
       SET is_phone_verified = TRUE, phone_otp_code = NULL, phone_otp_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );

    return res.json({
      message: 'Mobile number verified successfully',
      is_phone_verified: true,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation failed' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// 5. GET /api/citizens/complaints
citizenRouter.get('/complaints', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const complaintsRes = await query(
      `SELECT c.id, c.reference_id, c.category, c.title, c.description, c.channel,
              c.language, c.status, c.priority_score, c.sla_deadline, c.created_at, c.updated_at,
              d.name AS department_name,
              w.name AS ward_name,
              g.formatted_address, g.latitude, g.longitude
       FROM complaints c
       LEFT JOIN departments d ON d.id = c.department_id
       LEFT JOIN wards w ON w.id = c.ward_id
       LEFT JOIN gis_locations g ON g.complaint_id = c.id
       WHERE c.citizen_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return res.json({
      count: complaintsRes.rows.length,
      complaints: complaintsRes.rows,
    });
  } catch (err: any) {
    console.error('[Get Citizen Complaints Error]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});
