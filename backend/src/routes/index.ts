import { Router } from 'express';
import { agentRouter } from './agent.routes';

export const apiRouter = Router();

apiRouter.use('/agents', agentRouter);
