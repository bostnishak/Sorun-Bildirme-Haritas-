/**
 * Auth Middleware Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import { isAuthenticated, requireRole } from '../../middleware/auth.middleware';
import { UnauthorizedError, ForbiddenError } from '../../utils/errors';
import { Role } from '@prisma/client';

jest.mock('../../config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test_secret_at_least_32_characters_long',
    JWT_ACCESS_EXPIRES: '15m',
    JWT_REFRESH_EXPIRES: '7d',
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers } as any;
}

function makeRes(): Partial<Response> {
  return {} as any;
}

function makeNext(): NextFunction {
  return jest.fn() as NextFunction;
}

function signToken(payload: object, secret = 'test_secret_at_least_32_characters_long', options?: jwt.SignOptions) {
  return jwt.sign(payload, secret, { expiresIn: '15m', ...options });
}

// ─── isAuthenticated Tests ────────────────────────────────────────────────────

describe('isAuthenticated middleware', () => {

  it('geçerli Bearer token ile req.user set edilir ve next çağrılır', async () => {
    const token = signToken({ sub: 'user-1', role: Role.CITIZEN, type: 'access' });
    const req = makeReq({ authorization: `Bearer ${token}` }) as Request;
    const next = makeNext();

    await isAuthenticated(req, makeRes() as Response, next);

    expect(req.user).toBeDefined();
    expect(req.user.sub).toBe('user-1');
    expect(next).toHaveBeenCalled();
  });

  it('Authorization header eksik: UnauthorizedError fırlatır', async () => {
    const req = makeReq() as Request;

    await expect(isAuthenticated(req, makeRes() as Response, makeNext()))
      .rejects.toThrow(UnauthorizedError);
  });

  it('Bearer prefix eksik: UnauthorizedError fırlatır', async () => {
    const req = makeReq({ authorization: 'Basic sometoken' }) as Request;

    await expect(isAuthenticated(req, makeRes() as Response, makeNext()))
      .rejects.toThrow(UnauthorizedError);
  });

  it('geçersiz token: UnauthorizedError fırlatır', async () => {
    const req = makeReq({ authorization: 'Bearer invalid.token.here' }) as Request;

    await expect(isAuthenticated(req, makeRes() as Response, makeNext()))
      .rejects.toThrow(UnauthorizedError);
  });

  it('süresi dolmuş token: UnauthorizedError fırlatır', async () => {
    const token = signToken({ sub: 'user-1', role: Role.CITIZEN, type: 'access' }, undefined, { expiresIn: '-1s' });
    const req = makeReq({ authorization: `Bearer ${token}` }) as Request;

    await expect(isAuthenticated(req, makeRes() as Response, makeNext()))
      .rejects.toThrow(UnauthorizedError);
  });

});

// ─── requireRole Tests ────────────────────────────────────────────────────────

describe('requireRole middleware', () => {

  it('izin verilen role ile next çağrılır', () => {
    const req = { user: { role: Role.SUPER_ADMIN } } as Request;
    const next = makeNext();

    requireRole(Role.SUPER_ADMIN, Role.INSTITUTION_OFFICER)(req, makeRes() as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('izin verilmeyen role ile ForbiddenError fırlatır', () => {
    const req = { user: { role: Role.CITIZEN } } as Request;

    expect(() => {
      requireRole(Role.SUPER_ADMIN)(req, makeRes() as Response, makeNext());
    }).toThrow(ForbiddenError);
  });

  it('user yoksa ForbiddenError fırlatır', () => {
    const req = {} as Request;

    expect(() => {
      requireRole(Role.CITIZEN)(req, makeRes() as Response, makeNext());
    }).toThrow(ForbiddenError);
  });

});
