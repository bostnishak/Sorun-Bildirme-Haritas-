import axios from 'axios';
import type {
  ApiResponse,
  Issue,
  MapCluster,
  BoundingBoxQuery,
  IssueStatus,
} from '../types/issue.types';
import type { User, LoginDto, RegisterDto, AuthResponse } from '../types/auth.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api = axios.create({
  baseURL: `${API_URL}/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: JWT token ekleme ───────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor: 401'de token yenileme ────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        // Ayrı axios instance ile refresh (interceptor sonsuz döngüsünü önler)
        const refreshRes = await axios.post(`${API_URL}/v1/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = refreshRes.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);

// ─── Auth Endpoints ──────────────────────────────────────────────────────────

export const authApi = {
  login: (dto: LoginDto) =>
    api.post<AuthResponse, AuthResponse>('/auth/login', dto),

  register: (dto: RegisterDto) =>
    api.post<AuthResponse, AuthResponse>('/auth/register', dto),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse, AuthResponse>('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: () =>
    api.get<ApiResponse<User>, ApiResponse<User>>('/auth/me'),
};

// ─── Issues Endpoints ────────────────────────────────────────────────────────

export const issuesApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    city?: string;
    district?: string;
    category?: string;
    status?: string;
    search?: string;
  }) => api.get<ApiResponse<Issue[]>, ApiResponse<Issue[]>>('/issues', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Issue>, ApiResponse<Issue>>(`/issues/${id}`),

  getClusters: (bbox: BoundingBoxQuery) =>
    api.get<ApiResponse<MapCluster[]>, ApiResponse<MapCluster[]>>('/issues/map-cluster', {
      params: bbox,
    }),

  create: (formData: FormData) =>
    api.post<ApiResponse<Issue>, ApiResponse<Issue>>('/issues', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateStatus: (id: string, status: IssueStatus, note?: string) =>
    api.patch<ApiResponse<Issue>, ApiResponse<Issue>>(`/issues/${id}/status`, { status, note }),

  delete: (id: string) =>
    api.delete(`/issues/${id}`),
};

// ─── Admin Endpoints ─────────────────────────────────────────────────────────

export const adminApi = {
  getIssues: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    priority?: string;
  }) => api.get<any, any>('/admin/issues', { params }),

  getStats: () =>
    api.get<any, any>('/admin/stats'),

  getInstitutions: () =>
    api.get<any, any>('/admin/institutions'),

  createInstitution: (data: {
    name: string;
    city: string;
    district: string;
    emailAddress: string;
    webhookUrl?: string;
  }) => api.post<any, any>('/admin/institutions', data),
};
