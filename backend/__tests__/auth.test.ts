import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

vi.mock('jose', () => {
  const mockJwtVerify = vi.fn();

  return {
    jwtVerify: mockJwtVerify,
    createRemoteJWKSet: () => ({}),
  };
});

const app = createApp();

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when no auth header is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('Missing or invalid authorization header');
  });

  it('should return 401 when token verification fails', async () => {
    const { jwtVerify } = await import('jose');

    vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid token'));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Authentication failed');
  });

  it('should return 401 with malformed header', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'NotBearer token');

    expect(res.status).toBe(401);
  });
});
