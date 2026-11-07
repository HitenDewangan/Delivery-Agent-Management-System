import type { Request, Response } from 'express';
import {
  agentIdParamSchema,
  createAgentSchema,
  listAgentsQuerySchema,
  updateAgentSchema,
} from '../schemas/agent.schema';
import { agentService } from '../services/agent.service';

// Express 5 forwards rejected promises to the error middleware, so no try/catch here.
// Zod errors thrown by .parse() are turned into 400 responses centrally.

export async function createAgent(req: Request, res: Response): Promise<void> {
  const input = createAgentSchema.parse(req.body);
  const agent = await agentService.create(input);
  res.status(201).json({ success: true, data: agent });
}

export async function listAgents(req: Request, res: Response): Promise<void> {
  const query = listAgentsQuerySchema.parse(req.query);
  const { items, pagination } = await agentService.list(query);
  res.status(200).json({ success: true, data: items, meta: { pagination } });
}

export async function getAgent(req: Request, res: Response): Promise<void> {
  const { id } = agentIdParamSchema.parse(req.params);
  const agent = await agentService.getById(id);
  res.status(200).json({ success: true, data: agent });
}

export async function updateAgent(req: Request, res: Response): Promise<void> {
  const { id } = agentIdParamSchema.parse(req.params);
  const input = updateAgentSchema.parse(req.body);
  const agent = await agentService.update(id, input);
  res.status(200).json({ success: true, data: agent });
}

export async function deleteAgent(req: Request, res: Response): Promise<void> {
  const { id } = agentIdParamSchema.parse(req.params);
  await agentService.remove(id);
  res.status(200).json({ success: true, data: { id } });
}

export async function getAgentStats(_req: Request, res: Response): Promise<void> {
  const stats = await agentService.getStats();
  res.status(200).json({ success: true, data: stats });
}
