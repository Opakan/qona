import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { healthRouter } from './routes/health.js';
import { workflowsRouter } from './routes/workflows.js';
import { authRouter } from './routes/auth.js';
import { conversationsRouter } from './routes/conversations.js';
import { paymentsRouter } from './routes/payments.js';
import { sessionsRouter } from './routes/sessions.js';
import { debugRouter } from './routes/debug.js';
import { plannerRouter } from './routes/planner.js';
import { adminRouter } from './routes/admin.js';
import { templateRouter } from './routes/template.routes.js';
import { simulationRouter } from './routes/simulation.routes.js';

export function createApp() {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '5mb' }));
  if (config.NODE_ENV !== 'test') { app.use(morgan('dev')); }
  app.use('/api/health', healthRouter);
  app.use('/health', healthRouter);
  app.use('/healthz', healthRouter);
  app.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      message: 'Qona API is running',
      timestamp: new Date().toISOString(),
    });
  });
  app.use('/api/auth', authRouter);
  app.use('/auth', authRouter);
  app.use('/api/workflows', workflowsRouter);
  app.use('/workflows', workflowsRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/conversations', conversationsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/payments', paymentsRouter);
  app.use('/api/templates', templateRouter);
  app.use('/templates', templateRouter);
  app.use('/api/admin', adminRouter);
  app.use('/admin', adminRouter);
  app.use('/api', simulationRouter);
  app.use('/api', sessionsRouter);
  app.use('/api', debugRouter);
  app.use('/api', plannerRouter);
  app.use('/', simulationRouter);
  app.use('/', sessionsRouter);
  app.use('/', debugRouter);
  app.use('/', plannerRouter);
  app.use(errorHandler);
  return app;
}
