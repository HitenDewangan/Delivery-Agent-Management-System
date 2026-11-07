import { z } from 'zod';
import { AGENT_STATUSES, VEHICLE_TYPES } from '../types/agent';

const fullName = z.string().trim().min(2, 'Full name must be at least 2 characters').max(100);

// Strip common formatting so "+91 98765-43210" and "+919876543210" are the same phone.
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-().]/g, ''))
  .pipe(z.string().regex(/^\+?\d{7,15}$/, 'Phone must contain 7 to 15 digits, optional leading +'));

const email = z.string().trim().toLowerCase().pipe(z.email('Invalid email address').max(254));

const serviceArea = z.string().trim().min(2, 'Service area must be at least 2 characters').max(100);

const notes = z.string().trim().max(1000);

export const createAgentSchema = z
  .object({
    fullName,
    phone,
    email,
    serviceArea,
    status: z.enum(AGENT_STATUSES).optional(),
    vehicleType: z.enum(VEHICLE_TYPES).nullable().optional(),
    notes: notes.nullable().optional(),
  })
  .strict();

export const updateAgentSchema = z
  .object({
    fullName,
    phone,
    email,
    serviceArea,
    status: z.enum(AGENT_STATUSES),
    vehicleType: z.enum(VEHICLE_TYPES).nullable(),
    notes: notes.nullable(),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const agentIdParamSchema = z.object({ id: z.uuid('Agent id must be a valid UUID') });

// Query-string values arrive as strings; an empty value (?status=) means "no filter".
const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const listAgentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(AGENT_STATUSES).optional()),
  serviceArea: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
});

export type CreateAgentBody = z.infer<typeof createAgentSchema>;
export type UpdateAgentBody = z.infer<typeof updateAgentSchema>;
export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;
