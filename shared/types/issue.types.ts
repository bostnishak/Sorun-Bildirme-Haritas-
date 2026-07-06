// Shared types between frontend and backend
// Bu dosya monorepo yapısında her iki tarafta da kullanılabilir

export type IssueStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Category =
  | 'WATER_SANITATION'
  | 'TRANSPORTATION'
  | 'ENVIRONMENT'
  | 'INFRASTRUCTURE'
  | 'SECURITY'
  | 'LIGHTING'
  | 'PARKS';

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: IssueStatus;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  address?: string;
  imageUrl?: string;
  imageBlurred: boolean;
  imageProcessed: boolean;
  exifVerified: boolean;
  llmGuardPassed: boolean;
  reportedById: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface MapCluster {
  lng: number;
  lat: number;
  point_count: number;
  ids: string[];
  dominant_category: Category;
  dominant_status: IssueStatus;
  dominant_priority: Priority;
}

export interface CreateIssueDto {
  title: string;
  description: string;
  category: Category;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  address?: string;
}

export interface BoundingBoxQuery {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  zoom: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export const CATEGORY_LABELS: Record<Category, string> = {
  WATER_SANITATION: 'Su ve Kanalizasyon',
  TRANSPORTATION: 'Yol / Ulaşım',
  ENVIRONMENT: 'Çevre ve Temizlik',
  INFRASTRUCTURE: 'Altyapı',
  SECURITY: 'Güvenlik',
  LIGHTING: 'Aydınlatma',
  PARKS: 'Park ve Yeşil Alan',
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: 'Açık',
  IN_REVIEW: 'İnceleniyor',
  RESOLVED: 'Çözüldü',
  REJECTED: 'Reddedildi',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Düşük',
  MEDIUM: 'Orta',
  HIGH: 'Yüksek',
  CRITICAL: 'Kritik',
};
