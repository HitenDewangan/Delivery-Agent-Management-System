import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { healthRouter } from './routes/health.routes';
import { apiRouter } from './routes';
import { parseOrigins } from './utils/origins';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: parseOrigins(env.CORS_ORIGIN) }));
  app.use(express.json());

  // Lightweight liveness probe for hosting platforms and uptime pingers. It deliberately
  // touches no database or Redis, so frequent pings never wake a sleeping database.
  app.get('/ping', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.use('/health', healthRouter);
  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
