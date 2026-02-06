import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User, MachineType } from '../types';
import { authApi, machinesApi } from '../services';
import { setApiToken, getApiToken } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  allowedMachines: MachineType[];
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  allowedMachines: [],

  login: async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password);
      await setApiToken(response.token);

      // Fetch allowed machines for employee
      let machines: MachineType[] = [];
      if (response.user.role === 'EMPLOYEE') {
        machines = await machinesApi.getMyMachines();
      } else {
        machines = ['CNC', 'LASER', 'CHAMPS', 'PANNEAUX', 'SERVICE_MAINTENANCE'];
      }

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        allowedMachines: machines,
      });
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    await setApiToken(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      allowedMachines: [],
    });
  },

  checkAuth: async () => {
    try {
      const token = await getApiToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const user = await authApi.me();

      let machines: MachineType[] = [];
      if (user.role === 'EMPLOYEE') {
        machines = await machinesApi.getMyMachines();
      } else {
        machines = ['CNC', 'LASER', 'CHAMPS', 'PANNEAUX', 'SERVICE_MAINTENANCE'];
      }

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        allowedMachines: machines,
      });
    } catch (error) {
      await setApiToken(null);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        allowedMachines: [],
      });
    }
  },
}));
