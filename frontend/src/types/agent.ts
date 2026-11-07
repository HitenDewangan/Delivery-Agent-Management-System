export const AGENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const VEHICLE_TYPES = ['BICYCLE', 'MOTORCYCLE', 'SCOOTER', 'CAR', 'VAN'] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const STATUS_LABELS: Record<AgentStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};
export const VEHICLE_LABELS: Record<VehicleType, string> = {
  BICYCLE: 'Bicycle',
  MOTORCYCLE: 'Motorcycle',
  SCOOTER: 'Scooter',
  CAR: 'Car',
  VAN: 'Van',
};

export interface Agent {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  serviceArea: string;
  status: AgentStatus;
  vehicleType: VehicleType | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AgentListResult {
  items: Agent[];
  pagination: Pagination;
}

export interface AgentListParams {
  page: number;
  limit: number;
  search?: string;
  status?: AgentStatus | '';
  serviceArea?: string;
}

export interface AgentPayload {
  fullName: string;
  phone: string;
  email: string;
  serviceArea: string;
  status: AgentStatus;
  vehicleType: VehicleType | null;
  notes: string | null;
}

export interface AgentStats {
  total: number;
  active: number;
  inactive: number;
  byVehicleType: { vehicleType: VehicleType | null; count: number }[];
  byServiceArea: { serviceArea: string; count: number }[];
}
