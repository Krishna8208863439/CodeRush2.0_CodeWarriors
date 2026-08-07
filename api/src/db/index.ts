import { Pool, QueryResultRow } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  connectionTimeoutMillis: 1500,
});

let isPostgresAvailable = true;

pool.on('error', (err) => {
  console.warn('[PostgreSQL Pool] Warning:', err.message);
});

// Local JSON file database fallback for test/dev environment when Postgres is not running
const DB_FILE = path.join(__dirname, '../../data/local_db.json');

interface DbSchema {
  users: any[];
  citizens: any[];
  refresh_tokens: any[];
  password_reset_tokens: any[];
  audit_logs: any[];
  complaints?: any[];
  consent_records?: any[];
  gis_locations?: any[];
}

function loadLocalDb(): DbSchema {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    // Ignore error
  }
  return { users: [], citizens: [], refresh_tokens: [], password_reset_tokens: [], audit_logs: [], complaints: [], consent_records: [], gis_locations: [] };
}

function saveLocalDb(db: DbSchema) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[LocalDB] Error saving DB:', err);
  }
}

export async function query<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
  if (isPostgresAvailable) {
    try {
      const start = Date.now();
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (config.NODE_ENV === 'development') {
        console.log('Executed Postgres query', { text: text.substring(0, 80), duration, rows: res.rowCount });
      }
      return { rows: res.rows, rowCount: res.rowCount ?? 0 };
    } catch (err: any) {
      console.warn(`[PostgreSQL Unavailable] Falling back to persistent file database: ${err.message}`);
      isPostgresAvailable = false;
    }
  }

  // File DB Fallback Query Engine
  const db = loadLocalDb();
  const normalizedQuery = text.trim().replace(/\s+/g, ' ');

  // Sequence nextval handling
  if (normalizedQuery.match(/SELECT nextval\('complaint_ref_seq'\)/i)) {
    const nextSeq = Math.floor(Date.now() % 899999 + 100000);
    return { rows: [{ seq: nextSeq }] as unknown as T[], rowCount: 1 };
  }

  // 1. SELECT users WHERE email = $1
  if (normalizedQuery.match(/SELECT \* FROM users WHERE LOWER\(email\) = LOWER\(\$1\)/i) ||
      normalizedQuery.match(/SELECT \* FROM users WHERE email = \$1/i)) {
    const emailParam = String(params[0] || '').toLowerCase();
    const rows = db.users.filter(u => String(u.email).toLowerCase() === emailParam);
    return { rows: rows as T[], rowCount: rows.length };
  }

  // 2. SELECT id, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)
  if (normalizedQuery.match(/SELECT.*FROM users WHERE LOWER\(email\) = LOWER\(\$1\)/i) ||
      normalizedQuery.match(/SELECT.*FROM users WHERE email = \$1/i)) {
    const emailParam = String(params[0] || '').toLowerCase();
    const rows = db.users.filter(u => String(u.email).toLowerCase() === emailParam);
    return { rows: rows as T[], rowCount: rows.length };
  }

  // 3. INSERT INTO users
  if (normalizedQuery.match(/INSERT INTO users/i)) {
    const id = crypto.randomUUID();
    const newUser = {
      id,
      name: params[0],
      email: String(params[1]).toLowerCase(),
      password_hash: params[2],
      role: params[3],
      is_verified: false,
      is_locked: false,
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveLocalDb(db);
    return { rows: [newUser] as unknown as T[], rowCount: 1 };
  }

  // 4. UPDATE users SET password_hash = $1 WHERE id = $2
  if (normalizedQuery.match(/UPDATE users SET password_hash = \$1 WHERE id = \$2/i)) {
    const [newHash, userId] = params;
    let count = 0;
    db.users = db.users.map(u => {
      if (u.id === userId) {
        count++;
        return { ...u, password_hash: newHash };
      }
      return u;
    });
    saveLocalDb(db);
    return { rows: [], rowCount: count };
  }

  // 5. INSERT INTO citizens
  if (normalizedQuery.match(/INSERT INTO citizens/i)) {
    const newCitizen = { id: crypto.randomUUID(), user_id: params[0], created_at: new Date().toISOString() };
    db.citizens.push(newCitizen);
    saveLocalDb(db);
    return { rows: [newCitizen] as unknown as T[], rowCount: 1 };
  }

  // 6. INSERT INTO refresh_tokens
  if (normalizedQuery.match(/INSERT INTO refresh_tokens/i)) {
    const newToken = {
      id: crypto.randomUUID(),
      user_id: params[0],
      token_hash: params[1],
      expires_at: params[2] instanceof Date ? params[2].toISOString() : String(params[2]),
      revoked: false,
      created_at: new Date().toISOString(),
    };
    db.refresh_tokens.push(newToken);
    saveLocalDb(db);
    return { rows: [newToken] as unknown as T[], rowCount: 1 };
  }

  // 7. SELECT * FROM refresh_tokens WHERE token_hash = $1
  if (normalizedQuery.match(/SELECT \* FROM refresh_tokens WHERE token_hash = \$1/i)) {
    const hashParam = String(params[0]);
    const now = new Date();
    const rows = db.refresh_tokens.filter(t => 
      t.token_hash === hashParam && 
      !t.revoked && 
      new Date(t.expires_at) > now
    );
    return { rows: rows as T[], rowCount: rows.length };
  }

  // 8. UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1
  if (normalizedQuery.match(/UPDATE refresh_tokens SET revoked = TRUE WHERE id = \$1/i)) {
    const idParam = params[0];
    db.refresh_tokens = db.refresh_tokens.map(t => t.id === idParam ? { ...t, revoked: true } : t);
    saveLocalDb(db);
    return { rows: [], rowCount: 1 };
  }

  // 9. UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1
  if (normalizedQuery.match(/UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = \$1/i)) {
    const userIdParam = params[0];
    db.refresh_tokens = db.refresh_tokens.map(t => t.user_id === userIdParam ? { ...t, revoked: true } : t);
    saveLocalDb(db);
    return { rows: [], rowCount: 1 };
  }

  // 10. UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1
  if (normalizedQuery.match(/UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = \$1/i)) {
    const hashParam = params[0];
    db.refresh_tokens = db.refresh_tokens.map(t => t.token_hash === hashParam ? { ...t, revoked: true } : t);
    saveLocalDb(db);
    return { rows: [], rowCount: 1 };
  }

  // 11. INSERT INTO password_reset_tokens
  if (normalizedQuery.match(/INSERT INTO password_reset_tokens/i)) {
    const newToken = {
      id: crypto.randomUUID(),
      user_id: params[0],
      token_hash: params[1],
      expires_at: params[2] instanceof Date ? params[2].toISOString() : String(params[2]),
      used: false,
      created_at: new Date().toISOString(),
    };
    db.password_reset_tokens.push(newToken);
    saveLocalDb(db);
    return { rows: [newToken] as unknown as T[], rowCount: 1 };
  }

  // 12. SELECT * FROM password_reset_tokens WHERE token_hash = $1
  if (normalizedQuery.match(/SELECT \* FROM password_reset_tokens WHERE token_hash = \$1/i)) {
    const hashParam = params[0];
    const now = new Date();
    const rows = db.password_reset_tokens.filter(t => 
      t.token_hash === hashParam && 
      !t.used && 
      new Date(t.expires_at) > now
    );
    return { rows: rows as T[], rowCount: rows.length };
  }

  // 13. UPDATE password_reset_tokens SET used = TRUE WHERE id = $1
  if (normalizedQuery.match(/UPDATE password_reset_tokens SET used = TRUE WHERE id = \$1/i)) {
    const idParam = params[0];
    db.password_reset_tokens = db.password_reset_tokens.map(t => t.id === idParam ? { ...t, used: true } : t);
    saveLocalDb(db);
    return { rows: [], rowCount: 1 };
  }

  // 14. INSERT INTO complaints
  if (normalizedQuery.match(/INSERT INTO complaints/i)) {
    const id = crypto.randomUUID();
    const newComplaint = {
      id,
      reference_id: params[0],
      citizen_id: params[1],
      title: params[2],
      description: params[3],
      channel: params[4],
      language: params[5],
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
    };
    if (!db.complaints) (db as any).complaints = [];
    (db as any).complaints.push(newComplaint);
    saveLocalDb(db);
    return { rows: [newComplaint] as unknown as T[], rowCount: 1 };
  }

  // 15. INSERT INTO consent_records
  if (normalizedQuery.match(/INSERT INTO consent_records/i)) {
    const record = { id: crypto.randomUUID(), citizen_id: params[0], consent_version: params[1], granted: params[2], created_at: new Date().toISOString() };
    if (!(db as any).consent_records) (db as any).consent_records = [];
    (db as any).consent_records.push(record);
    saveLocalDb(db);
    return { rows: [record] as unknown as T[], rowCount: 1 };
  }

  // 16. INSERT INTO gis_locations
  if (normalizedQuery.match(/INSERT INTO gis_locations/i)) {
    const record = { id: crypto.randomUUID(), complaint_id: params[0], latitude: params[2], longitude: params[1], formatted_address: params[3], created_at: new Date().toISOString() };
    if (!(db as any).gis_locations) (db as any).gis_locations = [];
    (db as any).gis_locations.push(record);
    saveLocalDb(db);
    return { rows: [record] as unknown as T[], rowCount: 1 };
  }

  // 17. INSERT INTO audit_logs
  if (normalizedQuery.match(/INSERT INTO audit_logs/i)) {
    const log = { id: crypto.randomUUID(), created_at: new Date().toISOString() };
    db.audit_logs.push(log);
    saveLocalDb(db);
    return { rows: [log] as unknown as T[], rowCount: 1 };
  }

  // ── EXTENDED FALLBACK PATTERNS (needed when PostgreSQL is unavailable) ──

  // 18. SELECT user profile (JOIN users + citizens) — used by citizen profile endpoint
  if (normalizedQuery.match(/SELECT.*FROM users u.*LEFT JOIN citizens c ON c\.user_id = u\.id.*WHERE u\.id = \$1/i) ||
      normalizedQuery.match(/SELECT.*FROM users.*WHERE.*id = \$1/i)) {
    const userId = String(params[0] || '');
    const user = db.users.find(u => u.id === userId);
    if (!user) return { rows: [], rowCount: 0 };
    const citizen = db.citizens.find((c: any) => c.user_id === userId) || {};
    const merged = {
      ...user,
      address: (citizen as any).address || '',
      preferred_language: user.preferred_language || 'EN',
      notification_preferences: user.notification_preferences || { email: true, sms: true, push: true },
      is_phone_verified: user.is_phone_verified || false,
    };
    return { rows: [merged] as unknown as T[], rowCount: 1 };
  }

  // 19. UPDATE users SET name/phone/preferred_language etc WHERE id = $N (PATCH profile)
  if (normalizedQuery.match(/UPDATE users\s+SET/i) && normalizedQuery.match(/WHERE id = \$/i)) {
    const userId = params[params.length - 1];
    db.users = db.users.map(u => {
      if (u.id !== userId) return u;
      const updated = { ...u };
      if (params[0] !== null && params[0] !== undefined) updated.name = params[0];
      if (params[1] !== null && params[1] !== undefined) updated.phone = params[1];
      if (params[2] !== null && params[2] !== undefined) updated.preferred_language = params[2];
      if (params[3] !== null && params[3] !== undefined) updated.notification_preferences = params[3];
      return updated;
    });
    saveLocalDb(db);
    return { rows: [], rowCount: 1 };
  }

  // 20. SELECT complaints by citizen_id (citizen dashboard + profile complaints tab)
  if (normalizedQuery.match(/FROM complaints.*WHERE.*citizen_id = \$1/i) ||
      normalizedQuery.match(/FROM complaints c.*WHERE c\.citizen_id = \$1/i)) {
    const citizenId = String(params[0] || '');
    const complaints = ((db as any).complaints || []).filter((c: any) => c.citizen_id === citizenId);
    // Attach empty department/ward info so the JOIN-expected fields exist
    const rows = complaints.map((c: any) => ({ ...c, department_name: null, ward_name: null, formatted_address: null, latitude: null, longitude: null }));
    return { rows: rows as unknown as T[], rowCount: rows.length };
  }

  // 21. SELECT complaints by officer_id (officer dashboard)
  if (normalizedQuery.match(/WHERE c\.officer_id = \$1/i) ||
      normalizedQuery.match(/WHERE.*officer_id = \$1/i)) {
    const officerId = String(params[0] || '');
    const complaints = ((db as any).complaints || []).filter((c: any) => c.officer_id === officerId);
    const rows = complaints.map((c: any) => ({ ...c, department_name: null, ward_name: null, formatted_address: null, latitude: null, longitude: null }));
    return { rows: rows as unknown as T[], rowCount: rows.length };
  }

  // 22. UPDATE complaints SET status (officer status update)
  if (normalizedQuery.match(/UPDATE complaints SET status = \$1.*WHERE id = \$2/i)) {
    const [status, complaintId] = params;
    let count = 0;
    (db as any).complaints = ((db as any).complaints || []).map((c: any) => {
      if (c.id === complaintId) { count++; return { ...c, status, updated_at: new Date().toISOString() }; }
      return c;
    });
    saveLocalDb(db);
    return { rows: [], rowCount: count };
  }

  // 23. INSERT INTO status_history (officer status updates)
  if (normalizedQuery.match(/INSERT INTO status_history/i)) {
    if (!(db as any).status_history) (db as any).status_history = [];
    const record = {
      id: crypto.randomUUID(),
      complaint_id: params[0],
      officer_id: params[1],
      status: params[2],
      note: params[3] || '',
      created_at: new Date().toISOString(),
    };
    (db as any).status_history.push(record);
    saveLocalDb(db);
    return { rows: [record] as unknown as T[], rowCount: 1 };
  }

  // 24. SELECT complaints (general / dashboard / detail) by id or reference_id
  if (normalizedQuery.match(/WHERE c\.id = \$1 OR c\.reference_id = \$1/i) ||
      normalizedQuery.match(/WHERE.*c\.id = \$1/i)) {
    const idParam = String(params[0] || '');
    const c = ((db as any).complaints || []).find((x: any) => x.id === idParam || x.reference_id === idParam);
    if (!c) return { rows: [], rowCount: 0 };
    return { rows: [{ ...c, department_name: null, officer_name: null }] as unknown as T[], rowCount: 1 };
  }

  // 25. SELECT gis_locations for GIS map — returns all gis_locations joined with complaints
  if (normalizedQuery.match(/FROM complaints c\s+JOIN gis_locations gl/i) ||
      normalizedQuery.match(/FROM gis_locations/i)) {
    const gisLocations = ((db as any).gis_locations || []);
    const complaints = ((db as any).complaints || []);
    // Join gis_locations to complaints
    const rows = gisLocations.map((gl: any) => {
      const complaint = complaints.find((c: any) => c.id === gl.complaint_id) || {};
      return {
        id: complaint.id,
        reference_id: complaint.reference_id,
        category: complaint.category || 'GENERAL',
        status: complaint.status || 'SUBMITTED',
        created_at: complaint.created_at,
        latitude: gl.latitude,
        longitude: gl.longitude,
        formatted_address: gl.formatted_address || '',
        geometry: gl.latitude && gl.longitude
          ? { type: 'Point', coordinates: [gl.longitude, gl.latitude] }
          : null,
        officer_id: complaint.officer_id || null,
        officer_name: null,
      };
    });
    // Apply status/category filters if present
    const statusFilter = params.find((p: any) => typeof p === 'string' && ['SUBMITTED','ASSIGNED','IN_PROGRESS','RESOLVED','REJECTED'].includes(p));
    const categoryFilter = params.find((p: any) => typeof p === 'string' && ['GARBAGE','STREET_LIGHT','WATER_LEAKAGE','ROAD_DAMAGE','DRAINAGE'].includes(p));
    const filtered = rows.filter((r: any) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      return true;
    });
    return { rows: filtered as unknown as T[], rowCount: filtered.length };
  }

  // 26. SELECT ai_predictions for complaint
  if (normalizedQuery.match(/FROM ai_predictions WHERE complaint_id = \$1/i)) {
    const preds = ((db as any).ai_predictions || []).filter((p: any) => p.complaint_id === params[0]);
    return { rows: preds as unknown as T[], rowCount: preds.length };
  }

  // 27. SELECT evidence for complaint
  if (normalizedQuery.match(/FROM evidence WHERE complaint_id = \$1/i)) {
    return { rows: [] as unknown as T[], rowCount: 0 };
  }

  // 28. SELECT status_history for complaint
  if (normalizedQuery.match(/FROM status_history.*WHERE.*complaint_id = \$1/i)) {
    const history = ((db as any).status_history || []).filter((h: any) => h.complaint_id === params[0]);
    return { rows: history as unknown as T[], rowCount: history.length };
  }

  // 29. UPDATE citizens SET address (PATCH profile address field)
  if (normalizedQuery.match(/UPDATE citizens SET address = \$1 WHERE user_id = \$2/i)) {
    const [address, userId] = params;
    let count = 0;
    db.citizens = db.citizens.map((c: any) => {
      if (c.user_id === userId) { count++; return { ...c, address }; }
      return c;
    });
    saveLocalDb(db);
    return { rows: [], rowCount: count };
  }

  // 30. UPDATE users SET phone/otp fields (phone verification)
  if (normalizedQuery.match(/UPDATE users\s+SET phone = \$1.*WHERE id = \$4/i)) {
    const [phone, otp, expiresAt, userId] = params;
    db.users = db.users.map(u => {
      if (u.id !== userId) return u;
      return { ...u, phone, phone_otp_code: otp, phone_otp_expires_at: expiresAt instanceof Date ? expiresAt.toISOString() : String(expiresAt) };
    });
    saveLocalDb(db);
    return { rows: [], rowCount: 1 };
  }

  // 31. SELECT phone_otp_code from users for OTP verification
  if (normalizedQuery.match(/SELECT phone_otp_code.*FROM users WHERE id = \$1/i)) {
    const user = db.users.find(u => u.id === params[0]);
    if (!user) return { rows: [], rowCount: 0 };
    return { rows: [{ phone_otp_code: user.phone_otp_code || null, phone_otp_expires_at: user.phone_otp_expires_at || null }] as unknown as T[], rowCount: 1 };
  }

  // 32. UPDATE users SET is_phone_verified = TRUE
  if (normalizedQuery.match(/UPDATE users\s+SET is_phone_verified = TRUE/i)) {
    const userId = params[0];
    db.users = db.users.map(u => u.id === userId ? { ...u, is_phone_verified: true, phone_otp_code: null, phone_otp_expires_at: null } : u);
    saveLocalDb(db);
    return { rows: [], rowCount: 1 };
  }

  // 33. SELECT wards (GIS ward boundaries)
  if (normalizedQuery.match(/FROM wards/i)) {
    return { rows: [] as unknown as T[], rowCount: 0 };
  }

  // 34. Departments lookup by code (AI pipeline routing)
  if (normalizedQuery.match(/SELECT id FROM departments WHERE code = \$1/i)) {
    return { rows: [] as unknown as T[], rowCount: 0 };
  }

  // 35. SELECT departments WHERE department_head_id (department dashboard)
  if (normalizedQuery.match(/FROM departments WHERE department_head_id = \$1/i)) {
    return { rows: [] as unknown as T[], rowCount: 0 };
  }

  // 36. Analytics — complaints by category
  if (normalizedQuery.match(/SELECT category.*COUNT\(\*\).*FROM complaints.*GROUP BY category/i)) {
    const complaints = ((db as any).complaints || []);
    const tally: Record<string, number> = {};
    for (const c of complaints) { if (c.category) tally[c.category] = (tally[c.category] || 0) + 1; }
    const rows = Object.entries(tally).map(([category, volume]) => ({ category, volume: String(volume) }));
    return { rows: rows as unknown as T[], rowCount: rows.length };
  }

  // 37. Analytics — complaints by ward (LEFT JOIN wards)
  if (normalizedQuery.match(/FROM wards w.*LEFT JOIN complaints/i) ||
      normalizedQuery.match(/SELECT w\.id.*w\.name.*COUNT\(c\.id\).*FROM wards/i)) {
    return { rows: [] as unknown as T[], rowCount: 0 };
  }

  // 38. Analytics — department performance
  if (normalizedQuery.match(/FROM departments d.*LEFT JOIN complaints c ON c\.department_id = d\.id.*GROUP BY d\.name/i)) {
    return { rows: [] as unknown as T[], rowCount: 0 };
  }

  // 39. Analytics — satisfaction scores
  if (normalizedQuery.match(/FROM departments d.*LEFT JOIN complaints c.*JOIN feedback f.*GROUP BY d\.name/i)) {
    return { rows: [] as unknown as T[], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
}
