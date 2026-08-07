import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { authRouter } from './auth/auth.controller';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
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

// Routes
app.use('/auth', authRouter);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`Core API listening on port ${config.PORT} [${config.NODE_ENV}]`);
  });
}

export default app;
