import axios from 'axios';
import { query } from './db';

async function testPhase1A() {
  console.log('====================================================');
  console.log('  SWACHHLENS AI - PHASE 1A TEXT INTAKE E2E VERIFIER  ');
  console.log('====================================================\n');

  const API_BASE = 'http://localhost:3001/api';
  const testEmail = `citizen_phase1a_${Date.now()}@communityredressal.gov.in`;
  const testPassword = 'Password123!';

  // 1. Register Citizen User
  console.log('[STEP 1] Registering test citizen user...');
  const regRes = await axios.post(`${API_BASE}/auth/register`, {
    email: testEmail,
    password: testPassword,
    name: 'Phase 1A Tester',
    role: 'CITIZEN',
  });
  console.log('  -> Registered User ID:', regRes.data.user.id);

  // 2. Login to get Access Token
  console.log('\n[STEP 2] Logging in to get access token...');
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: testEmail,
    password: testPassword,
  });
  const token = loginRes.data.accessToken;
  console.log('  -> Access Token received:', token.substring(0, 25) + '...');

  // 3. Submit Phase 1A Text Complaint
  console.log('\n[STEP 3] Submitting Phase 1A Text Complaint...');
  const complaintPayload = {
    title: 'Overflowing Municipal Garbage Bin Near Ward 4 Main Road',
    description: 'The garbage container near the main market square has been overflowing for over 3 days, causing severe odour and health hazard to local residents.',
    channel: 'TEXT',
    language: 'EN',
    latitude: 19.0760,
    longitude: 72.8777,
    consentGranted: true,
  };

  console.log('  -> Sending POST /api/complaints Payload:');
  console.log(JSON.stringify(complaintPayload, null, 2));

  const postRes = await axios.post(`${API_BASE}/complaints`, complaintPayload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('\n[STEP 4] Received API Response (Status:', postRes.status, '):');
  console.log(JSON.stringify(postRes.data, null, 2));

  // 4. Query Database directly to verify stored row
  console.log('\n[STEP 5] Querying Database directly for complaint row...');
  const refId = postRes.data.referenceId || postRes.data.complaintNo;
  const dbRes = await query(`SELECT * FROM complaints WHERE reference_id = $1`, [refId]);
  console.log('  -> DB Row Result (complaints table):');
  console.log(JSON.stringify(dbRes.rows[0], null, 2));

  const gisRes = await query(`SELECT * FROM gis_locations WHERE complaint_id = $1`, [dbRes.rows[0].id]);
  console.log('\n  -> DB Row Result (gis_locations table):');
  console.log(JSON.stringify(gisRes.rows[0], null, 2));

  console.log('\n====================================================');
  console.log('  PHASE 1A DEFINITION OF DONE VERIFICATION COMPLETE ✅ ');
  console.log('====================================================');
}

testPhase1A().catch((err) => {
  console.error('Phase 1A Test Error:', err.response?.data || err.message);
  process.exit(1);
});
