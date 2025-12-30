import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://vistoriasync-production.up.railway.app',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Funções auxiliares
export async function get<T>(url: string, params?: object) {
  const response = await api.get<{ success: boolean; data: T }>(url, { params });
  return response.data.data;
}

export async function post<T>(url: string, data?: object) {
  const response = await api.post<{ success: boolean; data: T }>(url, data);
  return response.data.data;
}

export async function patch<T>(url: string, data?: object) {
  const response = await api.patch<{ success: boolean; data: T }>(url, data);
  return response.data.data;
}

export async function del<T>(url: string) {
  const response = await api.delete<{ success: boolean; data: T }>(url);
  return response.data.data;
}

export async function upload<T>(url: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<{ success: boolean; data: T }>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
}
