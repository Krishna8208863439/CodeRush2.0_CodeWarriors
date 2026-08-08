import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/community_redressal';

export const pool = new Pool({
  connectionString,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let isPgConnected = false;

// Attempt initial check
pool.query('SELECT NOW()')
  .then(() => {
    isPgConnected = true;
    console.log('[DB] Successfully connected to PostgreSQL Database.');
  })
  .catch((err) => {
    isPgConnected = false;
    console.warn('[DB] Could not connect to external PostgreSQL server. Using High-Performance In-Memory DB Fallback Store for active session.');
  });

export function isPostgresAvailable() {
  return isPgConnected;
}

export async function queryDB(text, params = []) {
  if (isPgConnected) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('[DB Query Error]', err.message);
      throw err;
    }
  } else {
    // Fallback handler will be seamlessly routed via memory store
    return null;
  }
}
