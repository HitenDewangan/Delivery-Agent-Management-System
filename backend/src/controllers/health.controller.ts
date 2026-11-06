import type { Request, Response } from 'express';
import { healthService } from '../services/health.service';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const report = await healthService.check();
  res.status(report.httpStatus).json(report.body);
}
