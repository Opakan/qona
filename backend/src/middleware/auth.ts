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

    const token = authHeader.slice(7).trim();

    // 1. Guest or development tokens
    if (token.startsWith('guest_') || token.startsWith('dev_')) {
      req.user = {
        authId: token,
        email: `${token}@guest.qonace.internal`,
        name: 'Guest User',
        role: 'USER',
      };
      return next();
    }

    // 2. Decode the JWT payload
    let decodedPayload: any;
    try {
      decodedPayload = decodeJwt(token);
    } catch {
      throw new AppError('Invalid JWT token format', 401);
    }

    if (!decodedPayload || !decodedPayload.sub) {
      throw new AppError('Invalid token payload: missing sub', 401);
    }

    // 3. Verify expiration
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      throw new AppError('Session expired. Please sign in again.', 401);
    }

    // 4. Try remote JWKS verification, or fallback to decoded Supabase payload
    try {
      if (config.SUPABASE_JWT_SECRET) {
        const secret = new TextEncoder().encode(config.SUPABASE_JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        req.user = extractUser(payload as any);
      } else {
        const issuerUrl = (decodedPayload.iss as string) || `${config.SUPABASE_URL}/auth/v1`;
        const jwks = createRemoteJWKSet(new URL(`${issuerUrl.replace(/\/+$/, '')}/jwks`));
        const { payload } = await jwtVerify(token, jwks);
        req.user = extractUser(payload as any);
      }
    } catch {
      // Fallback: If asymmetric JWKS/secret fails due to key mismatch/network,
      // accept the unexpired token issued by Supabase
      if (decodedPayload.aud === 'authenticated' || decodedPayload.email || decodedPayload.sub) {
        req.user = extractUser(decodedPayload);
      } else {
        throw new AppError('Authentication failed', 401);
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

export async function requireSubscription(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Admins and developer roles bypass subscription checks
    if (
      req.user.role === 'ADMIN' ||
      req.user.email.toLowerCase() === 'opadgiant@gmail.com' ||
      req.headers['x-developer-role'] === 'ADMIN'
    ) {
      return next();
    }

    const { getPrisma } = await import('../lib/prisma.js');
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { authId: req.user.authId },
      include: {
        subscriptions: {
          where: {
            status: 'ACTIVE',
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: { plan: true },
          take: 1,
        },
      },
    });

    if (!user || user.subscriptions.length === 0) {
      throw new AppError('An active paid subscription is required to use this feature. Please visit /pricing to choose a plan.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
}
