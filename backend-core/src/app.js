import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import complaintRoutes from './routes/complaints.js';
import officerRoutes from './routes/officer.js';
import slaRoutes from './routes/sla.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Community Redressal Planner Core Backend',
    timestamp: new Date().toISOString()
  });
});

// API V1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/officer', officerRoutes);
app.use('/api/v1/sla', slaRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Express Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`  CIVIC OPERATING SYSTEM - CORE BACKEND LISTENING ON PORT ${PORT} `);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log(`=============================================================`);
});

export default app;
