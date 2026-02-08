export type UserRole = 'ADMIN' | 'EMPLOYEE';
export type MachineType = 'CNC' | 'LASER' | 'CHAMPS' | 'PANNEAUX' | 'SERVICE_MAINTENANCE' | 'VENTE_MATERIAU';
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
  width?: number;
  height?: number;
  dimensionUnit?: string;
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
  unitPrice?: number;
  materialId?: string;
  width?: number;
  height?: number;
  dimensionUnit?: string;
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
  width?: number;
  height?: number;
  dimensionUnit?: string;
  createdAt: string;
  materialId?: string;
  material?: Material;
}

// Admin types
export interface DashboardStats {
  totalClients: number;
  totalEmployees: number;
  totalDevis: number;
  totalInvoices: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  devisByStatus: {
    draft: number;
    validated: number;
    invoiced: number;
    cancelled: number;
  };
  monthlyRevenue: { month: string; revenue: number }[];
  monthlyExpenses: { month: string; expenses: number }[];
  recentDevis: {
    id: string;
    reference: string;
    clientName: string;
    totalAmount: number;
    status: DevisStatus;
    createdAt: string;
  }[];
}

export interface InvoiceFull {
  id: string;
  reference: string;
  totalAmount: number;
  paidAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  createdAt: string;
  client: Client;
  devis?: Devis[];
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type ExpenseCategory = 'MATERIAL' | 'EQUIPMENT' | 'UTILITIES' | 'SALARY' | 'RENT' | 'OTHER';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  machines?: MachineType[];
}

export interface CreateClientInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes?: string;
}

// Client Balance types
export interface ClientBalancePayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

export interface ClientBalanceInvoice {
  id: string;
  reference: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  createdAt: string;
  devisCount: number;
  payments: ClientBalancePayment[];
}

export interface ClientBalancePendingDevis {
  id: string;
  reference: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

export interface ClientBalanceData {
  client: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    outstandingBalance: number;
    pendingDevisTotal: number;
    pendingDevisCount: number;
  };
  invoices: ClientBalanceInvoice[];
  pendingDevis: ClientBalancePendingDevis[];
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

export interface PaymentStats {
  totalAmount: number;
  totalPaid: number;
  remaining: number;
  percentPaid: number;
  isPaid: boolean;
}

export interface CreatePaymentInput {
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}
