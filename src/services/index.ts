import api from './api';
import {
  ApiResponse,
  AuthResponse,
  User,
  Client,
  Devis,
  MachinePricing,
  Material,
  FixedService,
  MachineType,
  CreateDevisInput,
  AddDevisLineInput,
} from '../types';

// Auth
export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', { username, password });
    return res.data.data!;
  },
  me: async (): Promise<User> => {
    const res = await api.get<ApiResponse<User>>('/auth/me');
    return res.data.data!;
  },
};

// Clients
export const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const res = await api.get<ApiResponse<Client[]>>('/clients');
    return res.data.data!;
  },
  search: async (query: string): Promise<Client[]> => {
    const res = await api.get<ApiResponse<Client[]>>('/clients/search', { params: { q: query } });
    return res.data.data!;
  },
};

// Machines
export const machinesApi = {
  getPricing: async (): Promise<MachinePricing[]> => {
    const res = await api.get<ApiResponse<MachinePricing[]>>('/machines/pricing');
    return res.data.data!;
  },
  getMyMachines: async (): Promise<MachineType[]> => {
    const res = await api.get<ApiResponse<MachineType[]>>('/machines/my');
    return res.data.data!;
  },
};

// Materials
export const materialsApi = {
  getAll: async (): Promise<Material[]> => {
    const res = await api.get<ApiResponse<Material[]>>('/materials');
    return res.data.data!;
  },
};

// Services
export const servicesApi = {
  getAll: async (): Promise<FixedService[]> => {
    const res = await api.get<ApiResponse<FixedService[]>>('/services');
    return res.data.data!;
  },
};

// Devis
export const devisApi = {
  getAll: async (): Promise<Devis[]> => {
    const res = await api.get<ApiResponse<Devis[]>>('/devis');
    return res.data.data!;
  },
  getById: async (id: string): Promise<Devis> => {
    const res = await api.get<ApiResponse<Devis>>(`/devis/${id}`);
    return res.data.data!;
  },
  create: async (data: CreateDevisInput): Promise<Devis> => {
    const res = await api.post<ApiResponse<Devis>>('/devis', data);
    return res.data.data!;
  },
  addLine: async (devisId: string, data: AddDevisLineInput): Promise<any> => {
    const res = await api.post<ApiResponse<any>>(`/devis/${devisId}/lines`, data);
    return res.data.data!;
  },
  removeLine: async (devisId: string, lineId: string): Promise<void> => {
    await api.delete(`/devis/${devisId}/lines/${lineId}`);
  },
  addService: async (devisId: string, serviceId: string): Promise<any> => {
    const res = await api.post<ApiResponse<any>>(`/devis/${devisId}/services`, { serviceId });
    return res.data.data!;
  },
  removeService: async (devisId: string, serviceId: string): Promise<void> => {
    await api.delete(`/devis/${devisId}/services/${serviceId}`);
  },
};
