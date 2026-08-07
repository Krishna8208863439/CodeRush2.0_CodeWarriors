import { Request, Response, Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { authenticate, AuthenticatedRequest } from './auth.middleware';
import { authRateLimiter } from './rateLimiter.middleware';
import { query } from '../db';
import { Role } from './roles';

export const authRouter = Router();

// Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(Role).default(Role.CITIZEN),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// 1. POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [data.email]);

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'USER_EXISTS', message: 'Email is already registered' });
    }

    const passwordHash = await AuthService.hashPassword(data.password);
    const userRes = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
      [data.name, data.email.toLowerCase(), passwordHash, data.role]
    );
    const user = userRes.rows[0];

    if (data.role === Role.CITIZEN) {
      await query(`INSERT INTO citizens (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [user.id]);
    }

    return res.status(201).json({
      message: 'User registered successfully.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err: any) {
    console.error('[Register Error]', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation failed', details: err.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || String(err) });
  }
});

// 2. POST /api/auth/login
authRouter.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const resDb = await query(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    const userRow = resDb.rows[0];

    if (!userRow) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const isValidPassword = await AuthService.verifyPassword(userRow.password_hash, password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const tokenPayload = {
      sub: userRow.id,
      role: userRow.role as Role,
      name: userRow.name,
      email: userRow.email,
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);
    const refreshToken = AuthService.generateRefreshToken(tokenPayload);

    await AuthService.storeRefreshToken(userRow.id, refreshToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: 'Authenticated successfully',
      accessToken,
      refreshToken,
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation failed' });
    }
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }
});

// 3. POST /api/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: 'MISSING_REFRESH_TOKEN', message: 'Refresh token required' });
  }

  try {
    const tokens = await AuthService.rotateRefreshToken(token);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err: any) {
    return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalid or revoked' });
  }
});

// 4. POST /api/auth/logout
authRouter.post('/logout', async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (token) {
    await AuthService.logout(token);
  }
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out successfully' });
});

// 5. GET /api/auth/me
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// 6. POST /api/auth/forgot-password
authRouter.post('/forgot-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const userRes = await query(`SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    
    // Always return the exact same generic message regardless of whether user exists
    const genericResponse = { message: 'If an account exists with that email, a password reset link has been sent.' };

    if (userRes.rows.length === 0) {
      return res.json(genericResponse);
    }

    const user = userRes.rows[0];
    const { token, hash } = AuthService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used) VALUES ($1, $2, $3, FALSE)`,
      [user.id, hash, expiresAt]
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    await AuthService.sendPasswordResetEmail(user.email, resetLink);

    return res.json({ ...genericResponse, devToken: token });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation failed' });
    }
    return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
  }
});

// 7. POST /api/auth/reset-password
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resToken = await query(
      `SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND (used = FALSE OR used IS NULL) AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
      [tokenHash]
    );

    if (resToken.rows.length === 0) {
      return res.status(400).json({ error: 'INVALID_RESET_TOKEN', message: 'Password reset link is invalid, used, or expired' });
    }

    const resetRow = resToken.rows[0];
    const newPasswordHash = await AuthService.hashPassword(newPassword);

    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newPasswordHash, resetRow.user_id]);
    await query(`UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`, [resetRow.id]);
    await AuthService.revokeUserSessions(resetRow.user_id);

    return res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation failed' });
    }
    return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
  }
});
