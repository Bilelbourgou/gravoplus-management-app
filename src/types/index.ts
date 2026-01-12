export type UserRole = 'ADMIN' | 'EMPLOYEE';
export type MachineType = 'CNC' | 'LASER' | 'CHAMPS' | 'PANNEAUX';
export type DevisStatus = 'DRAFT' | 'VALIDATED' | 'INVOICED' | 'CANCELLED';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  allowedMachines?: UserMachine[];
}

export interface UserMachine {
  id: string;
  userId: string;
  machine: MachineType;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MachinePricing {
  id: string;
  machineType: MachineType;
  pricePerUnit: number;
  description?: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  name: string;
  pricePerUnit: number;
  unit: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FixedService {
  id: string;
  name: string;
  price: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Devis {
  id: string;
  reference: string;
  status: DevisStatus;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string;
  clientId: string;
  client: Client;
  createdById: string;
  createdBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
  lines: DevisLine[];
  services: DevisServiceItem[];
  invoice?: Invoice;
}

export interface DevisLine {
  id: string;
  machineType: MachineType;
  description?: string;
  minutes?: number;
  meters?: number;
  quantity?: number;
  unitPrice: number;
  materialCost: number;
  lineTotal: number;
  createdAt: string;
  materialId?: string;
  material?: Material;
}

export interface DevisServiceItem {
  id: string;
  price: number;
  serviceId: string;
  service: FixedService;
}

export interface Invoice {
  id: string;
  reference: string;
  pdfUrl?: string;
  createdAt: string;
  devisId: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateDevisInput {
  clientId: string;
  notes?: string;
}

export interface AddDevisLineInput {
  machineType: MachineType;
  description?: string;
  minutes?: number;
  meters?: number;
  quantity?: number;
  materialId?: string;
}
