import { Router } from 'express';
import {
  createAgent,
  deleteAgent,
  getAgent,
  getAgentStats,
  listAgents,
  updateAgent,
} from '../controllers/agent.controller';

export const agentRouter = Router();

// '/stats' must be registered before '/:id', otherwise "stats" is treated as an id.
agentRouter.get('/stats', getAgentStats);
agentRouter.post('/', createAgent);
agentRouter.get('/', listAgents);
agentRouter.get('/:id', getAgent);
agentRouter.patch('/:id', updateAgent);
agentRouter.delete('/:id', deleteAgent);
