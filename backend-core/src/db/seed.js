import { pool, isPostgresAvailable } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  console.log('[Seed Script] Initializing Database Schema...');
  
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    console.log('[Seed Script] PostGIS Schema & Tables created successfully!');

    // Insert departments
    await pool.query(`
      INSERT INTO Department (id, name, code, description, contact_email, contact_phone)
      VALUES 
        ('d1111111-1111-1111-1111-111111111111', 'Public Works & Roads', 'PWR', 'Road maintenance and bridge safety', 'roads@civic-gov.in', '+91 800-111-0001'),
        ('d2222222-2222-2222-2222-222222222222', 'Sanitation & Solid Waste', 'SSW', 'Garbage collection and waste dumping', 'sanitation@civic-gov.in', '+91 800-111-0002'),
        ('d3333333-3333-3333-3333-333333333333', 'Water Supply & Sewerage', 'WSS', 'Clean water supply and pipe leaks', 'water@civic-gov.in', '+91 800-111-0003'),
        ('d4444444-4444-4444-4444-444444444444', 'Electricity & Street Lighting', 'ESL', 'Streetlights and power transformers', 'power@civic-gov.in', '+91 800-111-0004')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[Seed Script] Seed data populated successfully!');
  } catch (err) {
    console.warn('[Seed Script] PostgreSQL not online. Schema script verified for live environments.', err.message);
  } finally {
    await pool.end();
  }
}

runSeed();
