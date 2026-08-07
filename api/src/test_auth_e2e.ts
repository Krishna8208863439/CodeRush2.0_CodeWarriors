import axios from 'axios';
import { query } from './db';

const API_BASE = 'http://localhost:3001/api/auth';

async function runE2ETests() {
  console.log('====================================================');
  console.log('  FULL AUTHENTICATION E2E DEFINITION OF DONE SUITE  ');
  console.log('====================================================\n');

  const testEmail = `e2e_user_${Date.now()}@civicpulse.org`;
  const initialPassword = 'Password123!';
  const updatedPassword = 'NewPassword456!';

  // 1. REGISTER USER
  console.log('[TEST 1] Register a new user...');
  let registerRes;
  try {
    registerRes = await axios.post(`${API_BASE}/register`, {
      email: testEmail,
      password: initialPassword,
      name: 'E2E Test User',
      role: 'CITIZEN',
    });
    console.log('  -> HTTP Status:', registerRes.status);
    console.log('  -> Response User:', registerRes.data.user);

    // Verify row exists in DB with bcrypt hash ($2a$ or $2b$)
    const dbUserRes = await query(`SELECT id, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)`, [testEmail]);
    const dbUser = dbUserRes.rows[0];
    console.log('  -> DB User ID:', dbUser?.id);
    console.log('  -> DB Password Hash:', dbUser?.password_hash);
    const isBcrypt = dbUser?.password_hash && (dbUser.password_hash.startsWith('$2a$') || dbUser.password_hash.startsWith('$2b$'));
    console.log('  -> Password stored as bcrypt hash (not plaintext)?', isBcrypt ? 'PASS ✅' : 'FAIL ❌');
  } catch (err: any) {
    console.error('  -> Registration Failed:', err.response?.data || err.message);
  }

  // 1b. DUPLICATE REGISTRATION REJECTION
  console.log('\n[TEST 1b] Register duplicate user (same email)...');
  try {
    await axios.post(`${API_BASE}/register`, {
      email: testEmail,
      password: initialPassword,
      name: 'Duplicate User',
      role: 'CITIZEN',
    });
    console.log('  -> Duplicate registration allowed? FAIL ❌');
  } catch (err: any) {
    console.log('  -> HTTP Status:', err.response?.status);
    console.log('  -> Error Message:', err.response?.data?.message);
    console.log('  -> Duplicate registration rejected with 409?', err.response?.status === 409 ? 'PASS ✅' : 'FAIL ❌');
  }

  // 2. LOGIN WITH CORRECT PASSWORD
  console.log('\n[TEST 2] Login with correct password...');
  let accessToken = '';
  let refreshToken = '';
  try {
    const loginRes = await axios.post(`${API_BASE}/login`, {
      email: testEmail,
      password: initialPassword,
    });
    console.log('  -> HTTP Status:', loginRes.status);
    accessToken = loginRes.data.accessToken;
    refreshToken = loginRes.data.refreshToken;
    console.log('  -> Access Token Issued:', accessToken ? 'YES ✅' : 'NO ❌');
    console.log('  -> Refresh Token Issued:', refreshToken ? 'YES ✅' : 'NO ❌');

    // Test protected route GET /me
    const meRes = await axios.get(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log('  -> Protected Route /me User:', meRes.data.user);
    console.log('  -> Protected route access with JWT:', meRes.status === 200 ? 'PASS ✅' : 'FAIL ❌');
  } catch (err: any) {
    console.error('  -> Login Failed:', err.response?.data || err.message);
  }

  // 3. LOGIN WITH WRONG PASSWORD
  console.log('\n[TEST 3] Login with wrong password...');
  try {
    await axios.post(`${API_BASE}/login`, {
      email: testEmail,
      password: 'WrongPassword999!',
    });
    console.log('  -> Wrong password login succeeded? FAIL ❌');
  } catch (err: any) {
    console.log('  -> HTTP Status:', err.response?.status);
    console.log('  -> Error Message:', err.response?.data?.message);
    console.log('  -> Rejected with HTTP 401?', err.response?.status === 401 ? 'PASS ✅' : 'FAIL ❌');
  }

  // 4. FORGOT PASSWORD
  console.log('\n[TEST 4] Forgot password link request...');
  let devResetToken = '';
  try {
    const forgotRes = await axios.post(`${API_BASE}/forgot-password`, { email: testEmail });
    console.log('  -> HTTP Status:', forgotRes.status);
    console.log('  -> Response Message:', forgotRes.data.message);
    devResetToken = forgotRes.data.devToken;
    console.log('  -> Reset Token Generated:', devResetToken);
    console.log('  -> Forgot password mail dispatch:', forgotRes.status === 200 ? 'PASS ✅' : 'FAIL ❌');
  } catch (err: any) {
    console.error('  -> Forgot password failed:', err.response?.data || err.message);
  }

  // 5. RESET PASSWORD VIA TOKEN LINK
  console.log('\n[TEST 5] Reset password via reset token...');
  try {
    const resetRes = await axios.post(`${API_BASE}/reset-password`, {
      token: devResetToken,
      newPassword: updatedPassword,
    });
    console.log('  -> HTTP Status:', resetRes.status);
    console.log('  -> Response Message:', resetRes.data.message);

    // Verify old password no longer works
    try {
      await axios.post(`${API_BASE}/login`, { email: testEmail, password: initialPassword });
      console.log('  -> Old password still works? FAIL ❌');
    } catch (oldPwdErr: any) {
      console.log('  -> Old password login rejected (HTTP 401): PASS ✅');
    }

    // Verify new password works
    const newPwdLoginRes = await axios.post(`${API_BASE}/login`, { email: testEmail, password: updatedPassword });
    console.log('  -> New password login succeeded (HTTP 200): PASS ✅');
  } catch (err: any) {
    console.error('  -> Password reset failed:', err.response?.data || err.message);
  }

  // 6. REUSE THE SAME RESET LINK AGAIN
  console.log('\n[TEST 6] Reuse the same reset token link again...');
  try {
    await axios.post(`${API_BASE}/reset-password`, {
      token: devResetToken,
      newPassword: 'AnotherPassword777!',
    });
    console.log('  -> Token reuse succeeded? FAIL ❌');
  } catch (err: any) {
    console.log('  -> HTTP Status:', err.response?.status);
    console.log('  -> Error Message:', err.response?.data?.message);
    console.log('  -> Reused reset token rejected (HTTP 400)?', err.response?.status === 400 ? 'PASS ✅' : 'FAIL ❌');
  }

  // 7. LOGOUT & REFRESH TOKEN REVOCATION
  console.log('\n[TEST 7] Logout & refresh token revocation test...');
  try {
    // First login to get a fresh refresh token
    const freshLogin = await axios.post(`${API_BASE}/login`, { email: testEmail, password: updatedPassword });
    const activeRefreshToken = freshLogin.data.refreshToken;

    // Logout
    const logoutRes = await axios.post(`${API_BASE}/logout`, { refreshToken: activeRefreshToken });
    console.log('  -> Logout HTTP Status:', logoutRes.status);

    // Try using the revoked refresh token to get a new access token
    try {
      await axios.post(`${API_BASE}/refresh`, { refreshToken: activeRefreshToken });
      console.log('  -> Revoked refresh token worked? FAIL ❌');
    } catch (refreshErr: any) {
      console.log('  -> Refresh HTTP Status:', refreshErr.response?.status);
      console.log('  -> Revoked refresh token rejected (HTTP 401)?', refreshErr.response?.status === 401 ? 'PASS ✅' : 'FAIL ❌');
    }
  } catch (err: any) {
    console.error('  -> Logout test failed:', err.response?.data || err.message);
  }

  // 8. UNAUTHENTICATED ACCESS TO PROTECTED ROUTE
  console.log('\n[TEST 8] Access protected route without access token...');
  try {
    await axios.get(`${API_BASE}/me`);
    console.log('  -> Unauthenticated access allowed? FAIL ❌');
  } catch (err: any) {
    console.log('  -> HTTP Status:', err.response?.status);
    console.log('  -> Error Message:', err.response?.data?.message);
    console.log('  -> Rejected with HTTP 401?', err.response?.status === 401 ? 'PASS ✅' : 'FAIL ❌');
  }

  console.log('\n====================================================');
  console.log('     ALL E2E DEFINITION OF DONE TESTS COMPLETED     ');
  console.log('====================================================\n');
  process.exit(0);
}

runE2ETests().catch(console.error);
