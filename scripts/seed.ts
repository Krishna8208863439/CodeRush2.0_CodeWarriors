import argon2 from 'argon2';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://crp_user:crp_password@localhost:5432/community_redressal',
});

async function seed() {
  console.log('Seeding Community Redressal Planner database...');

  const passwordHash = await argon2.hash('Password123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // 1. Users (5 Roles)
  const citizenRes = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, is_verified)
     VALUES ('Ramesh Citizen', 'citizen@example.com', '+919876543210', $1, 'CITIZEN', true)
     ON CONFLICT (email) DO UPDATE SET is_verified = true RETURNING id`,
    [passwordHash]
  );
  const citizenId = citizenRes.rows[0].id;

  const officerRes = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, is_verified)
     VALUES ('Inspector Suresh', 'officer@example.com', '+919876543211', $1, 'OFFICER', true)
     ON CONFLICT (email) DO UPDATE SET is_verified = true RETURNING id`,
    [passwordHash]
  );
  const officerId = officerRes.rows[0].id;

  const deptHeadRes = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, is_verified)
     VALUES ('Head Anita', 'depthead@example.com', '+919876543212', $1, 'DEPARTMENT_HEAD', true)
     ON CONFLICT (email) DO UPDATE SET is_verified = true RETURNING id`,
    [passwordHash]
  );
  const deptHeadId = deptHeadRes.rows[0].id;

  await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, is_verified)
     VALUES ('Commissioner Rajesh', 'commissioner@example.com', '+919876543213', $1, 'COMMISSIONER', true)
     ON CONFLICT (email) DO UPDATE SET is_verified = true`
  );

  await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, is_verified)
     VALUES ('System Administrator', 'admin@example.com', '+919876543214', $1, 'ADMIN', true)
     ON CONFLICT (email) DO UPDATE SET is_verified = true`
  );

  // 2. Departments
  const deptRes = await pool.query(
    `INSERT INTO departments (name, code, department_head_id, description)
     VALUES ('Solid Waste Management', 'GARBAGE', $1, 'Handles municipal garbage and sanitation issues')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [deptHeadId]
  );
  const deptId = deptRes.rows[0].id;

  await pool.query(
    `INSERT INTO departments (name, code, description)
     VALUES ('Electrical & Lighting', 'STREET_LIGHT', 'Manages street lights and power poles')
     ON CONFLICT (code) DO NOTHING`
  );

  await pool.query(
    `INSERT INTO departments (name, code, description)
     VALUES ('Water Supply & Sewage', 'WATER_LEAKAGE', 'Handles water mains and drainage leaks')
     ON CONFLICT (code) DO NOTHING`
  );

  await pool.query(
    `INSERT INTO departments (name, code, description)
     VALUES ('Road Infrastructure', 'ROAD_DAMAGE', 'Maintains roads and potholes')
     ON CONFLICT (code) DO NOTHING`
  );

  // 3. Officers
  await pool.query(
    `INSERT INTO officers (user_id, department_id, designation, badge_number)
     VALUES ($1, $2, 'Senior Field Inspector', 'BADGE-101')
     ON CONFLICT DO NOTHING`,
    [officerId, deptId]
  );

  // 4. Wards with GeoJSON MultiPolygons
  const wardRes = await pool.query(
    `INSERT INTO wards (name, ward_number, boundary)
     VALUES ('Ward 1 - Central Market', 1, ST_GeomFromText('MULTIPOLYGON(((18.520 73.856, 18.525 73.856, 18.525 73.860, 18.520 73.860, 18.520 73.856)))', 4326))
     ON CONFLICT (ward_number) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
  );
  const wardId = wardRes.rows[0].id;

  await pool.query(
    `INSERT INTO wards (name, ward_number, boundary)
     VALUES ('Ward 2 - Station Area', 2, ST_GeomFromText('MULTIPOLYGON(((18.530 73.865, 18.535 73.865, 18.535 73.870, 18.530 73.870, 18.530 73.865)))', 4326))
     ON CONFLICT (ward_number) DO NOTHING`
  );

  // 5. Seed Sample Complaints
  const c1 = await pool.query(
    `INSERT INTO complaints (reference_id, citizen_id, category, title, description, channel, language, status, priority_score, department_id, officer_id, ward_id, sla_deadline)
     VALUES ('CRP-2026-000001', $1, 'GARBAGE', 'Overflowing garbage bin near main gate', 'Large trash pile emitting foul odor near school entrance', 'WEB', 'EN', 'ASSIGNED', 0.85, $2, $3, $4, NOW() + INTERVAL '12 hours')
     ON CONFLICT (reference_id) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
    [citizenId, deptId, officerId, wardId]
  );

  // GIS Location for complaint
  await pool.query(
    `INSERT INTO gis_locations (complaint_id, geom, latitude, longitude, formatted_address)
     VALUES ($1, ST_SetSRID(ST_MakePoint(73.8567, 18.5204), 4326), 18.5204, 73.8567, 'Central Market Rd, Ward 1')
     ON CONFLICT DO NOTHING`,
    [c1.rows[0].id]
  );

  // AI Prediction for complaint
  await pool.query(
    `INSERT INTO ai_predictions (complaint_id, model_name, model_version, category, confidence, priority_score, reasoning)
     VALUES ($1, 'distilbert-civic-v2', '2.1.0', 'GARBAGE', 0.94, 0.85, '{"keywords": ["garbage", "trash", "odor"], "entity_spans": [{"text": "Ward 1", "label": "LOCATION"}]}')
     ON CONFLICT DO NOTHING`,
    [c1.rows[0].id]
  );

  console.log('Seeding completed successfully!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
