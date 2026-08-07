import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgres://crp_user:crp_password@localhost:5432/community_redressal'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.string().default('9000'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET_NAME: z.string().default('complaints'),
  JWT_ACCESS_SECRET: z.string().default('super-secret-access-token-key-32-chars-long'),
  JWT_REFRESH_SECRET: z.string().default('super-secret-refresh-token-key-32-chars-long'),
  FIELD_ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  MSG91_AUTH_KEY: z.string().default('mock_msg91_key'),
  MSG91_SENDER_ID: z.string().default('CIVICR'),
  SMTP_HOST: z.string().default('smtp.resend.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().default('resend'),
  SMTP_PASS: z.string().default('mock_smtp_password'),
  SMTP_FROM: z.string().default('noreply@communityredressal.gov'),
  WHATSAPP_TOKEN: z.string().default('mock_whatsapp_token'),
  WHATSAPP_PHONE_ID: z.string().default('mock_whatsapp_phone_id'),
  VAPID_PUBLIC_KEY: z.string().default('mock_vapid_public_key'),
  VAPID_PRIVATE_KEY: z.string().default('mock_vapid_private_key'),
  VAPID_SUBJECT: z.string().default('mailto:admin@communityredressal.gov'),
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
});

export const config = envSchema.parse({
  PORT: process.env.API_PORT || process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
  MINIO_PORT: process.env.MINIO_PORT,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
  MINIO_BUCKET_NAME: process.env.MINIO_BUCKET_NAME,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  FIELD_ENCRYPTION_KEY: process.env.FIELD_ENCRYPTION_KEY,
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
  MSG91_SENDER_ID: process.env.MSG91_SENDER_ID,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
  WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID,
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  AI_SERVICE_URL: process.env.AI_SERVICE_URL,
});
