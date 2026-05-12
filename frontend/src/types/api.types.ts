export type Role = 'ADMIN' | 'SELLER' | 'BUYER';

export type DeviceCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'RESERVED' | 'SOLD' | 'REMOVED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  avatar?: string;
  role: Role;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  children?: Category[];
}

export interface ListingImage {
  id: string;
  url: string;
  order: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  condition: DeviceCondition;
  askingPrice: number;
  brand: string;
  model: string;
  storage?: string;
  color?: string;
  warranty?: string;
  origin?: string;
  location?: string;
  iphoneVersion?: string;
  status: ListingStatus;
  aiPriceResult?: AiPriceResult;
  images: ListingImage[];
  category?: Category;
  seller: PublicSeller;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSeller {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  createdAt?: string;
}

export interface AiPriceResult {
  // Field cũ (giữ tương thích)
  P_market?: number;
  P_final?: number;
  // Field mới khớp với EstimateResponseDto của backend
  pMarket?: number;
  pFinal?: number;
  confidenceScore: number;
  priceRange: { low: number; high: number };
  damageBreakdown: {
    part: string;
    severity: number;
    weight: number;
    description?: string;
    deductionPercent?: number;
  }[];
  detectedModel?: string;
  overallCondition?: string;
  summary?: string;
  marketSummary?: string;
  dataPoints?: number;
  detectedGeneration?: string | null;
  claimedModel?: string;
  claimedMatches?: boolean;
  damageDetections?: AiDamageDetection[];
  images?: AiImageMeta[];
}

export interface AiDamageDetection {
  label: string;
  labelDisplay: string;
  confidence: number;
  imageIndex: number;
  bbox: { xMin: number; yMin: number; xMax: number; yMax: number };
  imageWidth: number;
  imageHeight: number;
  areaRatio: number;
  location: 'screen' | 'housing' | 'camera' | 'other';
}

export interface AiImageMeta {
  index: number;
  width: number;
  height: number;
  detectionCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
}

export const CONDITION_LABELS: Record<DeviceCondition, string> = {
  NEW: 'Mới 100%',
  LIKE_NEW: 'Như mới (99%)',
  GOOD: 'Tốt (90-98%)',
  FAIR: 'Khá (70-89%)',
  POOR: 'Kém (<70%)',
};
