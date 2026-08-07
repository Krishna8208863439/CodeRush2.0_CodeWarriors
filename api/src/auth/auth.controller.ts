import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { authenticate, AuthenticatedRequest } from './auth.middleware';
import { query } from '../db';
import { Role } from './roles';

export const authRouter = Router();

// Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  role: z.nativeEnum(Role).default(Role.CITIZEN),
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  otp: z.string().optional(),
});

const sendOtpSchema = z.object({
  phone: z.string().min(10),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

// 1. POST /auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await query(`SELECT id FROM users WHERE email = $1 OR (phone IS NOT NULL AND phone = $2)`, [
      data.email,
      data.phone || null,
    ]);

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'USER_EXISTS', message: 'Email or phone already registered' });
    }

    const passwordHash = await AuthService.hashPassword(data.password);
    const userRes = await query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, created_at`,
      [data.name, data.email, data.phone || null, passwordHash, data.role]
    );
    const user = userRes.rows[0];

    if (data.role === Role.CITIZEN) {
      await query(`INSERT INTO citizens (user_id) VALUES ($1)`, [user.id]);
    }

    // Generate verification token
    const { token } = AuthService.generateVerificationToken();
    console.log(`[Email Verification] Verification token for ${user.email}: ${token}`);

    return res.status(201).json({
      message: 'User registered successfully. Please verify your email.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// 2. GET /auth/verify-email
authRouter.get('/verify-email', async (req: Request, res: Response) => {
  const { token, email } = req.query;
  if (!email || !token) {
    return res.status(400).json({ error: 'MISSING_PARAMS', message: 'Email and token required' });
  }

  await query(`UPDATE users SET is_verified = TRUE WHERE email = $1`, [email as string]);
  return res.json({ message: 'Email verified successfully' });
});

// 3. POST /auth/send-otp
authRouter.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = sendOtpSchema.parse(req.body);
    const otp = await AuthService.sendOtp(phone);
    return res.json({ message: 'OTP sent successfully via MSG91 SMS', phone, devOtp: otp });
  } catch (err: any) {
    if (err.message === 'TOO_MANY_OTP_REQUESTS') {
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'Max 3 OTP requests allowed per 10 minutes' });
    }
    return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
  }
});

// 4. POST /auth/verify-otp
authRouter.post('/verify-otp', async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'MISSING_FIELDS' });

  const isValid = await AuthService.verifyOtp(phone, otp);
  if (!isValid) {
    return res.status(400).json({ error: 'INVALID_OTP', message: 'Invalid or expired OTP' });
  }
  return res.json({ message: 'OTP verified successfully' });
});

// 5. POST /auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, phone, password, otp } = loginSchema.parse(req.body);
    let userRow: any;

    if (email && password) {
      const resDb = await query(`SELECT * FROM users WHERE email = $1`, [email]);
      userRow = resDb.rows[0];
    } else if (phone && otp) {
      const isValidOtp = await AuthService.verifyOtp(phone, otp);
      if (!isValidOtp) {
        return res.status(401).json({ error: 'INVALID_OTP', message: 'Invalid or expired OTP' });
      }
      const resDb = await query(`SELECT * FROM users WHERE phone = $1`, [phone]);
      userRow = resDb.rows[0];
    } else {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Must supply email+password or phone+otp' });
    }

    if (!userRow) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'User not found or bad credentials' });
    }

    // Check account lockout
    if (userRow.is_locked && userRow.locked_until && new Date(userRow.locked_until) > new Date()) {
      return res.status(423).json({
        error: 'ACCOUNT_LOCKED',
        message: 'Account locked due to 5 consecutive failed login attempts. Try again after 30 minutes.',
      });
    }

    // If password login, verify password hash
    if (email && password) {
      const isValid = await AuthService.verifyPassword(userRow.password_hash, password);
      if (!isValid) {
        await AuthService.recordFailedLogin(userRow.id, email, req.ip);
        return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
      }
    }

    // Reset failed login counter upon successful authentication
    await AuthService.resetFailedLogins(userRow.id);

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
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Write audit log for login
    await query(
      `INSERT INTO audit_logs (acting_user_id, table_name, operation, event, ip_address, user_agent)
       VALUES ($1, 'users', 'LOGIN', 'USER_LOGIN', $2, $3)`,
      [userRow.id, req.ip || '127.0.0.1', req.headers['user-agent'] || '']
    );

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
    return res.status(400).json({ error: 'LOGIN_FAILED', message: err.message });
  }
});

// 6. POST /auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: 'MISSING_REFRESH_TOKEN', message: 'Refresh token required' });
  }

  try {
    const tokens = await AuthService.rotateRefreshToken(token);
    return res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err: any) {
    return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN', message: err.message });
  }
});

// 7. POST /auth/logout
authRouter.post('/logout', async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (token) {
    await AuthService.logout(token);
  }
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out successfully' });
});

// 8. GET /auth/me
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// 9. POST /auth/forgot-password
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const userRes = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (userRes.rows.length === 0) {
      return res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
    }

    const { token, hash } = AuthService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userRes.rows[0].id, hash, expiresAt]
    );

    console.log(`[Password Reset] Reset token for ${email}: ${token}`);
    return res.json({ message: 'Password reset link sent to email.', devToken: token });
  } catch (err: any) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
  }
});

// 10. POST /auth/reset-password
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const hash = AuthService.generateVerificationToken().hash; // sha256 helper

    const resToken = await query(
      `SELECT * FROM password_reset_tokens WHERE used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`
    );

    if (resToken.rows.length === 0) {
      return res.status(400).json({ error: 'INVALID_RESET_TOKEN', message: 'Invalid or expired password reset token' });
    }

    const resetRow = resToken.rows[0];
    const newHash = await AuthService.hashPassword(newPassword);

    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, resetRow.user_id]);
    await query(`UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`, [resetRow.id]);
    await AuthService.revokeUserSessions(resetRow.user_id);

    return res.json({ message: 'Password reset successfully. Prior sessions invalidated.' });
  } catch (err: any) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
  }
});
