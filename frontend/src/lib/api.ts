import axios from 'axios';
import type {
  ApiResponse,
  Issue,
  MapCluster,
  BoundingBoxQuery,
  IssueStatus,
} from '../types/issue.types';
import type { User, LoginDto, RegisterDto, AuthResponse } from '../types/auth.types';

// Tarayıcı tarafında (client-side) her zaman '/api' kullanarak Vercel rewrite/proxy üzerinden geç!
// Böylece HTTPS (Vercel) -> HTTP (Almanya sunucusu) Mixed Content / Network Error hatası kesinlikle yaşanmaz.
const API_URL = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://etiya-project-api:3001/api');

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
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        // Ayrı axios instance ile refresh (interceptor sonsuz döngüsünü önler)
        const refreshRes = await axios.post(`${API_URL}/v1/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = refreshRes.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        original.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        
        return api(original);
      } catch (err) {
        processQueue(err, null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');

          // Zustand store durumunu temizle (Sonsuz login döngüsünü engeller)
          try {
            const store = localStorage.getItem('etiya-project-store');
            if (store) {
              const parsed = JSON.parse(store);
              if (parsed && parsed.state) {
                parsed.state.user = null;
                parsed.state.isAuthenticated = false;
                localStorage.setItem('etiya-project-store', JSON.stringify(parsed));
              }
            }
          } catch (e) {}

          import('@/store/useAppStore').then(({ useAppStore }) => {
            useAppStore.getState().setUser(null);
          }).catch(() => {});

          const path = window.location.pathname;
          const isProtectedPage = ['/profile', '/my-issues', '/portal'].some(p => path.startsWith(p));
          
          if (isProtectedPage && !path.includes('/login')) {
            window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
          }
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
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

  exportData: () =>
    api.get<any, any>('/auth/me/export'),

  deleteAccount: () =>
    api.delete<any, any>('/auth/me'),

  generate2fa: () =>
    api.post<any, any>('/auth/2fa/generate'),

  verify2fa: (token: string) =>
    api.post<any, any>('/auth/2fa/verify', { token }),
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

// ─── Profile Endpoints ───────────────────────────────────────────────────────

export const profileApi = {
  updateProfile: (dto: { firstName?: string; lastName?: string; phone?: string | null }) =>
    api.patch<any, any>('/auth/me', dto),

  changePassword: (dto: { currentPassword: string; newPassword: string }) =>
    api.patch<any, any>('/auth/me/password', dto),

  uploadAvatar: (formData: FormData) =>
    api.post<any, any>('/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getMyIssues: () =>
    api.get<any, any>('/issues/my/list'),
};

// ─── Notification Endpoints ──────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  link?: string;
  createdAt: string;
}

export const notificationApi = {
  list: (limit = 20, unreadOnly = false) =>
    api.get<any, any>('/notifications', { params: { limit, unreadOnly } }),

  markAsRead: (notificationId: string) =>
    api.patch<any, any>(`/notifications/${notificationId}/read`),

  markAllAsRead: () =>
    api.patch<any, any>('/notifications/read-all'),
};

