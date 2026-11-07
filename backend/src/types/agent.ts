export const AGENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const VEHICLE_TYPES = ['BICYCLE', 'MOTORCYCLE', 'SCOOTER', 'CAR', 'VAN'] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export interface Agent {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  serviceArea: string;
  status: AgentStatus;
  vehicleType: VehicleType | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentInput {
  fullName: string;
  phone: string;
  email: string;
  serviceArea: string;
  status?: AgentStatus | undefined;
  vehicleType?: VehicleType | null | undefined;
  notes?: string | null | undefined;
}

export interface UpdateAgentInput {
  fullName?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  serviceArea?: string | undefined;
  status?: AgentStatus | undefined;
  vehicleType?: VehicleType | null | undefined;
  notes?: string | null | undefined;
}

export interface AgentFilters {
  search?: string | undefined;
  status?: AgentStatus | undefined;
  serviceArea?: string | undefined;
}

export interface AgentListParams extends AgentFilters {
  page: number;
  limit: number;
}

export interface AgentStats {
  total: number;
  active: number;
  inactive: number;
  byVehicleType: { vehicleType: VehicleType | null; count: number }[];
  byServiceArea: { serviceArea: string; count: number }[];
}
