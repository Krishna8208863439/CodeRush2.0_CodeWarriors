import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { authRouter } from './auth/auth.controller';
import { complaintRouter } from './complaints/complaint.controller';
import { webhooksRouter } from './webhooks/webhooks.controller';
import { gisRouter } from './gis/gis.controller';
import { dashboardRouter } from './dashboards/dashboard.controller';
import { analyticsRouter } from './analytics/analytics.controller';
import { citizenRouter } from './citizens/citizen.controller';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    service: 'Community Redressal Planner Core API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);
app.use('/citizens', citizenRouter);
app.use('/api/citizens', citizenRouter);
app.use('/complaints', complaintRouter);
app.use('/api/complaints', complaintRouter);
app.use('/webhooks', webhooksRouter);
app.use('/gis', gisRouter);
app.use('/dashboard', dashboardRouter);
app.use('/analytics', analyticsRouter);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`Core API listening on port ${config.PORT} [${config.NODE_ENV}]`);
  });
}

export default app;
