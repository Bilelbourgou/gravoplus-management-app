import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiResponse } from '../types';

const API_BASE_URL = 'http://192.168.100.119:3001/api'; // Update with your backend IP

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;

export const setApiToken = async (token: string | null) => {
  if (token) {
    await SecureStore.setItemAsync('authToken', token);
  } else {
    await SecureStore.deleteItemAsync('authToken');
  }
};

export const getApiToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync('authToken');
};
