export type UserRole = 'CITIZEN' | 'INSTITUTION_OFFICER' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isVerified: boolean;
  institutionId?: string;
  institution?: Institution;
  createdAt: string;
}

export interface Institution {
  id: string;
  name: string;
  city: string;
  district: string;
  emailAddress: string;
  webhookUrl?: string;
  isActive: boolean;
}

export interface JWTPayload {
  sub: string;
  role: UserRole;
  institutionId?: string;
  iat: number;
  exp: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tcKimlik: string;
  birthYear: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
