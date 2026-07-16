import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { issuesApi, authApi } from '@/lib/api';
// Types

// ─── Types ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: 'CITIZEN' | 'INSTITUTION_OFFICER' | 'SUPER_ADMIN';
  isVerified: boolean;
  institution?: {
    id: string;
    name: string;
    city: string;
    district: string;
  };
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  address?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  upvoteCount: number;
  reportedBy?: User;
}

export interface MapCluster {
  type: 'Feature';
  properties: {
    cluster: boolean;
    issueId: string;
    category?: string;
    priority?: string;
    status?: string;
    point_count?: number;
    point_count_abbreviated?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  zoom: number;
}

export interface Stats {
  total: number;
  open: number;
  inReview: number;
  resolved: number;
  thisMonth: number;
}

// ─── Store ─────────────────────────────────────────────────────────────────

interface AppStore {
  // Auth
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Map state
  clusters: MapCluster[];
  selectedIssue: Issue | null;
  isLoadingClusters: boolean;
  currentBbox: BoundingBox | null;

  // UI state
  isReportModalOpen: boolean;
  isSidebarOpen: boolean;
  activeView: 'map' | 'table';

  // Filters
  filters: {
    city: string;
    district: string;
    category: string;
    status: string;
    search: string;
  };

  // Actions
  setUser: (user: User | null) => void;
  updateUser: (partial: Partial<User>) => void;
  setTokens: (access: string, refresh: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tcKimlik: string;
    birthYear: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchClusters: (bbox: BoundingBox, force?: boolean) => Promise<void>;
  selectIssue: (issueOrId: Issue | string | number | null) => Promise<void>;
  setReportModalOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveView: (view: 'map' | 'table') => void;
  updateFilter: (key: keyof AppStore['filters'], value?: string) => void;
  setFilter: (key: keyof AppStore['filters'], value?: string) => void;
  clearFilters: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

const defaultFilters = { city: '', district: '', category: '', status: '', search: '' };

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      clusters: [],
      selectedIssue: null,
      isLoadingClusters: false,
      currentBbox: null,
      isReportModalOpen: false,
      isSidebarOpen: true,
      activeView: 'map',
      filters: defaultFilters,
      _hasHydrated: false,

      // Auth actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      setTokens: (access, refresh) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', access);
          localStorage.setItem('refreshToken', refresh);
        }
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
      },

      login: async (email, password) => {
        const res = await authApi.login({ email, password }) as any;
        const { user, accessToken, refreshToken } = res.data ?? res;
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      register: async (dto) => {
        const res = await authApi.register(dto) as any;
        const { user, accessToken, refreshToken } = res.data ?? res;
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      logout: async () => {
        try {
          const refreshToken = typeof window !== 'undefined'
            ? localStorage.getItem('refreshToken')
            : null;
          if (refreshToken) await authApi.logout(refreshToken);
        } catch {
          // Sessizce yoksay — token zaten geçersiz olabilir
        } finally {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      },

      // Map actions — gerçek API
      fetchClusters: async (bbox: BoundingBox, force = false) => {
        const { isLoadingClusters, currentBbox } = get();

        // Aynı bbox için tekrar istek atma
        if (isLoadingClusters) return;
        if (
          !force &&
          currentBbox &&
          Math.abs(currentBbox.minLng - bbox.minLng) < 0.01 &&
          Math.abs(currentBbox.minLat - bbox.minLat) < 0.01 &&
          Math.abs(currentBbox.maxLng - bbox.maxLng) < 0.01 &&
          Math.abs(currentBbox.maxLat - bbox.maxLat) < 0.01 &&
          currentBbox.zoom === bbox.zoom
        ) return;

        set({ isLoadingClusters: true, currentBbox: bbox });

        try {
          const response = await issuesApi.getClusters(bbox) as any;
          set({ clusters: response.data ?? [] });
        } catch (err) {
          console.error('Cluster yükleme hatası:', err);
          set({ clusters: [] });
        } finally {
          set({ isLoadingClusters: false });
        }
      },

      selectIssue: async (issueOrId) => {
        if (!issueOrId) {
          set({ selectedIssue: null });
          return;
        }
        if (typeof issueOrId === 'string' || typeof issueOrId === 'number') {
          try {
            const response = await issuesApi.getById(issueOrId.toString()) as any;
            const issueData = response.data ?? response;
            set({ selectedIssue: issueData });
          } catch (err) {
            console.error('İhbar detayı yüklenirken hata oluştu:', err);
            set({ selectedIssue: null });
          }
        } else {
          set({ selectedIssue: issueOrId as Issue });
        }
      },

      // UI actions
      setReportModalOpen: (open) => set({ isReportModalOpen: open }),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      setActiveView: (view) => set({ activeView: view }),

      // Filter actions
      updateFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value || '' },
        })),
      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value || '' },
        })),

      clearFilters: () => set({ filters: defaultFilters }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'etiya-project-store',
      partialize: (state) => ({
        // Sadece user ve token'ları persist et
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        activeView: state.activeView,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
