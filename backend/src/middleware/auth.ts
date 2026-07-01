import type { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet, decodeJwt } from 'jose';
import { config } from '../config.js';
import { AppError } from './errorHandler.js';

let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!JWKS) {
    JWKS = createRemoteJWKSet(new URL(`${config.SUPABASE_URL}/auth/v1/jwks`));
  }
  return JWKS;
}

export interface AuthenticatedUser {
  authId: string;
  email: string;
  name: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function extractUser(payload: { sub?: string; email?: string; user_metadata?: Record<string, unknown> }): AuthenticatedUser {
  const authId = payload.sub as string;
  const email = payload.email as string;
  const metadata = (payload.user_metadata as Record<string, unknown> | undefined) ?? {};
  if (!authId || !email) throw new AppError('Invalid token payload', 401);
  return {
    authId,
    email,
    name: (metadata.full_name as string) ?? email.split('@')[0],
    role: (metadata.role as string) ?? 'USER',
  };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid authorization header', 401);
    }

    const token = authHeader.slice(7);

    try {
      const { payload } = await jwtVerify(token, getJWKS(), {
        issuer: `${config.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',
      });
      req.user = extractUser(payload as any);
    } catch (jwksError) {
      if (config.NODE_ENV === 'development') {
        const decoded = decodeJwt(token);
        req.user = extractUser(decoded as any);
      } else {
        throw jwksError;
      }
    }

    next();
  } catch (error) {
    console.error('[requireAuth] Authentication check failed:', error);
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Authentication failed', 401));
    }
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  requireAuth(req, _res, next);
}
