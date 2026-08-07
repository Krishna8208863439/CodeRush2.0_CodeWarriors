import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { config } from '../config';

const ENCRYPTION_KEY = Buffer.from(config.FIELD_ENCRYPTION_KEY, 'hex');

export function encryptField(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(dataHex, 'hex')).toString('utf8') + decipher.final('utf8');
}

export function maskPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/(\+?91\s?)(\d{5})(\d{5})/, '$1$2 XXXXX');
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
}
