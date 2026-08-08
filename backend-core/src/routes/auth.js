import express from 'express';
import jwt from 'jsonwebtoken';
import { store } from '../db/store.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'civic_operating_system_secret_key_2026';

// Register Citizen / Officer / Admin
router.post('/register', (req, res) => {
  const { name, full_name, email, password, role = 'CITIZEN', department_id } = req.body;
  const userName = full_name || name;

  if (!email || !password || !userName) {
    return res.status(400).json({ error: 'Full name, email, and password are required.' });
  }

  const existing = store.citizens.find(c => c.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  const newUser = {
    id: `c-${Date.now()}`,
    full_name: userName,
    name: userName,
    email: email.toLowerCase(),
    password_hash: password,
    role,
    department_id: department_id || null,
    created_at: new Date().toISOString()
  };

  store.citizens.push(newUser);

  const token = jwt.sign({ id: newUser.id, role: newUser.role, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.status(201).json({ success: true, message: 'User registered successfully.', token, user: newUser });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = store.citizens.find(c => c.email.toLowerCase() === email?.toLowerCase());
  if (!user || user.password_hash !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user });
});

export default router;
