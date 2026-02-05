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
  DashboardStats,
  InvoiceFull,
  Expense,
  CreateUserInput,
  CreateClientInput,
  CreateExpenseInput,
  ClientBalanceData,
  Payment,
  PaymentStats,
  CreatePaymentInput,
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
  getBalance: async (id: string): Promise<ClientBalanceData> => {
    const res = await api.get<ApiResponse<ClientBalanceData>>(`/clients/${id}/balance`);
    return res.data.data!;
  },
  create: async (data: CreateClientInput): Promise<Client> => {
    const res = await api.post<ApiResponse<Client>>('/clients', data);
    return res.data.data!;
  },
  update: async (id: string, data: Partial<CreateClientInput>): Promise<Client> => {
    const res = await api.put<ApiResponse<Client>>(`/clients/${id}`, data);
    return res.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`);
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
  updatePricing: async (machineType: MachineType, pricePerUnit: number): Promise<MachinePricing> => {
    const res = await api.put<ApiResponse<MachinePricing>>(`/machines/pricing/${machineType}`, { pricePerUnit });
    return res.data.data!;
  },
};

// Materials
export const materialsApi = {
  getAll: async (): Promise<Material[]> => {
    const res = await api.get<ApiResponse<Material[]>>('/materials');
    return res.data.data!;
  },
  create: async (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<Material> => {
    const res = await api.post<ApiResponse<Material>>('/materials', data);
    return res.data.data!;
  },
  update: async (id: string, data: Partial<Material>): Promise<Material> => {
    const res = await api.put<ApiResponse<Material>>(`/materials/${id}`, data);
    return res.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/materials/${id}`);
  },
};

// Services
export const servicesApi = {
  getAll: async (): Promise<FixedService[]> => {
    const res = await api.get<ApiResponse<FixedService[]>>('/services');
    return res.data.data!;
  },
  create: async (data: Omit<FixedService, 'id' | 'createdAt' | 'updatedAt'>): Promise<FixedService> => {
    const res = await api.post<ApiResponse<FixedService>>('/services', data);
    return res.data.data!;
  },
  update: async (id: string, data: Partial<FixedService>): Promise<FixedService> => {
    const res = await api.put<ApiResponse<FixedService>>(`/services/${id}`, data);
    return res.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/services/${id}`);
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
  validate: async (id: string): Promise<Devis> => {
    const res = await api.post<ApiResponse<Devis>>(`/devis/${id}/validate`);
    return res.data.data!;
  },
  cancel: async (id: string): Promise<Devis> => {
    const res = await api.post<ApiResponse<Devis>>(`/devis/${id}/cancel`);
    return res.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/devis/${id}`);
  },
};

// Dashboard (Admin)
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return res.data.data!;
  },
};

// Users (Admin)
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const res = await api.get<ApiResponse<User[]>>('/users');
    return res.data.data!;
  },
  create: async (data: CreateUserInput): Promise<User> => {
    const res = await api.post<ApiResponse<User>>('/users', data);
    return res.data.data!;
  },
  update: async (id: string, data: Partial<CreateUserInput>): Promise<User> => {
    const res = await api.put<ApiResponse<User>>(`/users/${id}`, data);
    return res.data.data!;
  },
  assignMachines: async (id: string, machines: MachineType[]): Promise<User> => {
    const res = await api.put<ApiResponse<User>>(`/users/${id}/machines`, { machines });
    return res.data.data!;
  },
  deactivate: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

// Invoices (Admin)
export interface DirectInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export const invoicesApi = {
  getAll: async (): Promise<InvoiceFull[]> => {
    const res = await api.get<ApiResponse<InvoiceFull[]>>('/invoices');
    return res.data.data!;
  },
  createFromDevis: async (devisIds: string[]): Promise<InvoiceFull> => {
    const res = await api.post<ApiResponse<InvoiceFull>>('/invoices/from-devis', { devisIds });
    return res.data.data!;
  },
  createDirect: async (clientId: string, items: DirectInvoiceItem[]): Promise<InvoiceFull> => {
    const res = await api.post<ApiResponse<InvoiceFull>>('/invoices/direct', { clientId, items });
    return res.data.data!;
  },
};

// Payments
export const paymentsApi = {
  getByInvoice: async (invoiceId: string): Promise<Payment[]> => {
    const res = await api.get<ApiResponse<Payment[]>>(`/payments/invoice/${invoiceId}`);
    return res.data.data!;
  },
  getStats: async (invoiceId: string): Promise<PaymentStats> => {
    const res = await api.get<ApiResponse<PaymentStats>>(`/payments/invoice/${invoiceId}/stats`);
    return res.data.data!;
  },
  create: async (invoiceId: string, data: CreatePaymentInput): Promise<Payment> => {
    const res = await api.post<ApiResponse<Payment>>(`/payments/invoice/${invoiceId}`, data);
    return res.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/payments/${id}`);
  },
};

// Expenses (Admin)
export const expensesApi = {
  getAll: async (): Promise<Expense[]> => {
    const res = await api.get<ApiResponse<Expense[]>>('/expenses');
    return res.data.data!;
  },
  create: async (data: CreateExpenseInput): Promise<Expense> => {
    const res = await api.post<ApiResponse<Expense>>('/expenses', data);
    return res.data.data!;
  },
  update: async (id: string, data: Partial<CreateExpenseInput>): Promise<Expense> => {
    const res = await api.put<ApiResponse<Expense>>(`/expenses/${id}`, data);
    return res.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/expenses/${id}`);
  },
};
