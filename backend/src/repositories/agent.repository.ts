import { prisma } from '../lib/prisma';
import type { Prisma } from '../generated/prisma/client';
import type {
  Agent,
  AgentFilters,
  AgentStats,
  CreateAgentInput,
  UpdateAgentInput,
  VehicleType,
} from '../types/agent';
import { translatePrismaError } from '../utils/prisma-errors';

// Prisma treats `undefined` as "leave unchanged", but with exactOptionalPropertyTypes
// we drop undefined keys explicitly so intent is obvious and types stay strict.
function definedOnly<T extends object>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as T;
}

function buildWhere({ search, status, serviceArea }: AgentFilters): Prisma.AgentWhereInput {
  const where: Prisma.AgentWhereInput = {};

  if (status) where.status = status;
  if (serviceArea) where.serviceArea = { equals: serviceArea, mode: 'insensitive' };
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { serviceArea: { contains: search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export const agentRepository = {
  async create(data: CreateAgentInput): Promise<Agent> {
    try {
      return await prisma.agent.create({ data: definedOnly(data) });
    } catch (err) {
      throw translatePrismaError(err);
    }
  },

  async findById(id: string): Promise<Agent | null> {
    return prisma.agent.findUnique({ where: { id } });
  },

  async findMany(
    filters: AgentFilters,
    skip: number,
    take: number,
  ): Promise<{ items: Agent[]; total: number }> {
    const where = buildWhere(filters);
    const [items, total] = await prisma.$transaction([
      prisma.agent.findMany({ where, skip, take, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] }),
      prisma.agent.count({ where }),
    ]);
    return { items, total };
  },

  async update(id: string, data: UpdateAgentInput): Promise<Agent> {
    try {
      return await prisma.agent.update({ where: { id }, data: definedOnly(data) });
    } catch (err) {
      throw translatePrismaError(err);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await prisma.agent.delete({ where: { id } });
    } catch (err) {
      throw translatePrismaError(err);
    }
  },

  async getStats(): Promise<AgentStats> {
    const [byStatus, byVehicle, byArea] = await Promise.all([
      prisma.agent.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
      prisma.agent.groupBy({
        by: ['vehicleType'],
        _count: { _all: true },
        orderBy: { vehicleType: 'asc' },
      }),
      prisma.agent.groupBy({
        by: ['serviceArea'],
        _count: { _all: true },
        orderBy: [{ _count: { serviceArea: 'desc' } }, { serviceArea: 'asc' }],
        take: 10,
      }),
    ]);

    const countFor = (status: 'ACTIVE' | 'INACTIVE'): number =>
      byStatus.find((row) => row.status === status)?._count._all ?? 0;
    const active = countFor('ACTIVE');
    const inactive = countFor('INACTIVE');

    return {
      total: active + inactive,
      active,
      inactive,
      byVehicleType: byVehicle.map((row) => ({
        vehicleType: row.vehicleType as VehicleType | null,
        count: row._count._all,
      })),
      byServiceArea: byArea.map((row) => ({
        serviceArea: row.serviceArea,
        count: row._count._all,
      })),
    };
  },
};
