import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { Role } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

// JWT payload tipi
export interface JWTPayload {
  sub: string;          // userId
  role: Role;
  type: 'access' | 'refresh';
  institutionId?: string;
  iat: number;
  exp: number;
}

// Request'e user bilgisi ekle
declare global {
  namespace Express {
    interface Request {
      user: JWTPayload;
    }
  }
}

/**
 * Access token doğrulama middleware
 */
export async function isAuthenticated(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authorization header eksik veya geçersiz format.');
  }

  const token = authHeader.slice(7);

  let payload: JWTPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTPayload;
    if (payload.type !== 'access') {
      throw new UnauthorizedError('Geçersiz token tipi.');
    }
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token süresi dolmuş. Lütfen tekrar giriş yapın.');
    }
    throw new UnauthorizedError('Geçersiz token.');
  }

  req.user = payload;
  next();
}

/**
 * Role-based access control factory
 */
export function requireRole(...allowedRoles: Role[]) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    const userRole = _req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new ForbiddenError(
        `Bu işlem için gerekli rol: ${allowedRoles.join(' veya ')}`,
      );
    }

    next();
  };
}

/**
 * Optional authentication — token varsa doğrular, yoksa devam eder
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTPayload;
    if (payload.type === 'access') {
      req.user = payload;
    }
  } catch {
    // Token geçersizse sessizce devam et
  }

  next();
}

/**
 * JWT token oluşturma yardımcı fonksiyonları
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as any,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as any,
  });
}

export function verifyRefreshToken(token: string): { sub: string } {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string, type: string };
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Geçersiz token tipi.');
    }
    return payload;
  } catch {
    throw new UnauthorizedError('Geçersiz refresh token.');
  }
}
