import type { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';
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

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid authorization header', 401);
    }

    const token = authHeader.slice(7);

    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: `${config.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });

    const authId = payload.sub as string;
    const email = payload.email as string;
    if (!authId || !email) {
      throw new AppError('Invalid token payload', 401);
    }

    const metadata = (payload.user_metadata as Record<string, unknown> | undefined) ?? {};
    req.user = {
      authId,
      email,
      name: (metadata.full_name as string) ?? email.split('@')[0],
      role: (metadata.role as string) ?? 'USER',
    };

    next();
  } catch (error) {
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
