import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../db';
import { redis } from '../redis';
import { Role } from './roles';

export interface TokenPayload {
  sub: string;
  role: Role;
  name: string;
  email: string;
}

export class AuthService {
  // 1. Password Hashing (Argon2id)
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  static async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  // 2. JWT Generation & Verification
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, config.JWT_REFRESH_SECRET) as TokenPayload;
  }

  // 3. Refresh Token Storage & Rotation
  static async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  }

  static async rotateRefreshToken(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.verifyRefreshToken(oldRefreshToken);
    const oldHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');

    const res = await query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = FALSE AND expires_at > NOW()`,
      [oldHash]
    );

    if (res.rows.length === 0) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Revoke old token
    await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [res.rows[0].id]);

    // Issue new tokens
    const newPayload: TokenPayload = {
      sub: payload.sub,
      role: payload.role,
      name: payload.name,
      email: payload.email,
    };

    const newAccessToken = this.generateAccessToken(newPayload);
    const newRefreshToken = this.generateRefreshToken(newPayload);

    await this.storeRefreshToken(payload.sub, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  static async revokeUserSessions(userId: string): Promise<void> {
    await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, [userId]);
  }

  static async logout(refreshToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [tokenHash]);
  }

  // 4. Failed Login Rate Limiting & Account Lockout
  static async recordFailedLogin(userId: string, email: string, ipAddress?: string): Promise<void> {
    const key = `failed_logins:${userId}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, 900); // 15 minute window
    }

    if (attempts >= 5) {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      await query(`UPDATE users SET is_locked = TRUE, locked_until = $1 WHERE id = $2`, [lockUntil, userId]);
      await query(
        `INSERT INTO audit_logs (acting_user_id, table_name, operation, record_id, event, ip_address)
         VALUES ($1, 'users', 'LOCKOUT', $1, 'ACCOUNT_LOCKED', $2)`,
        [userId, ipAddress || '127.0.0.1']
      );
    }
  }

  static async resetFailedLogins(userId: string): Promise<void> {
    await redis.del(`failed_logins:${userId}`);
    await query(`UPDATE users SET is_locked = FALSE, locked_until = NULL WHERE id = $1`, [userId]);
  }

  // 5. OTP Management
  static async sendOtp(phone: string): Promise<string> {
    const rateKey = `otp_rate:${phone}`;
    const count = await redis.incr(rateKey);
    if (count === 1) {
      await redis.expire(rateKey, 600); // 10 minute window
    }
    if (count > 3) {
      throw new Error('TOO_MANY_OTP_REQUESTS');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    await redis.set(`otp:${phone}`, otpHash, 'EX', 600); // 10 minutes TTL

    // In production, dispatch via MSG91 API
    console.log(`[MSG91 SMS OTP] Sent OTP ${otp} to ${phone}`);
    return otp;
  }

  static async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const storedHash = await redis.get(`otp:${phone}`);
    if (!storedHash) return false;

    const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (storedHash === inputHash) {
      await redis.del(`otp:${phone}`);
      return true;
    }
    return false;
  }

  // 6. Verification Email Token
  static generateVerificationToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }
}
