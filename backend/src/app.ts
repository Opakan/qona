import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { workflowsRouter } from './routes/workflows.js';
import { authRouter } from './routes/auth.js';
import { conversationsRouter } from './routes/conversations.js';
import { paymentsRouter } from './routes/payments.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    }),
  );

  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '5mb' }));

  if (config.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/workflows', workflowsRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/payments', paymentsRouter);

  app.use(errorHandler);

  return app;
}
