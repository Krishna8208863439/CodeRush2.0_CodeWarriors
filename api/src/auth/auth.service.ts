import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
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
  // 1. Password Hashing (bcrypt cost 12)
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
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
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, revoked) VALUES ($1, $2, $3, FALSE)`,
      [userId, tokenHash, expiresAt]
    );
  }

  static async rotateRefreshToken(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.verifyRefreshToken(oldRefreshToken);
    const oldHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');

    const res = await query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND (revoked = FALSE OR revoked IS NULL) AND expires_at > NOW()`,
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
    await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`, [tokenHash]);
  }

  // 4. Verification Token Helper
  static generateVerificationToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  // 5. Send Password Reset Email via Nodemailer SMTP
  static async sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void> {
    let transporter;
    const isRealSmtp = process.env.SMTP_HOST && 
                       process.env.SMTP_PASS && 
                       !process.env.SMTP_PASS.includes('mock') && 
                       !process.env.SMTP_PASS.includes('REPLACE');

    if (isRealSmtp) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    try {
      const info = await transporter.sendMail({
        from: '"Civic Operating System" <no-reply@civicpulse.org>',
        to: toEmail,
        subject: 'Password Reset Request — Community Redressal Planner',
        text: `You requested a password reset. Click the link to reset your password: ${resetLink}\nThis link expires in 30 minutes.`,
        html: `<div style="font-family: sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password for <strong>Community Redressal Planner</strong>:</p>
          <p><a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; display: inline-block;">Reset Password</a></p>
          <p>This link expires in 30 minutes.</p>
        </div>`,
      });

      console.log(`[SMTP Email] Sent password reset email to ${toEmail}. Preview URL: ${nodemailer.getTestMessageUrl(info) || 'SMTP Sent'}`);
    } catch (err: any) {
      console.warn(`[SMTP Dispatch Warning] Primary SMTP failed: ${err.message}. Falling back to Ethereal Test Account...`);
      const testAccount = await nodemailer.createTestAccount();
      const fallbackTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      const info = await fallbackTransporter.sendMail({
        from: '"Civic Operating System" <no-reply@civicpulse.org>',
        to: toEmail,
        subject: 'Password Reset Request — Community Redressal Planner',
        text: `Reset link: ${resetLink}`,
      });
      console.log(`[SMTP Email Fallback] Sent to ${toEmail}. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  }
}
