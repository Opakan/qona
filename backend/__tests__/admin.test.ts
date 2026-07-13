import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: () => ({}),
}));

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  workflow: {
    count: vi.fn(),
  },
  $disconnect: vi.fn(),
};

vi.mock('../src/lib/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  PrismaClient: vi.fn(),
}));

const app = createApp();
let mockJwtVerify: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.clearAllMocks();
  const jose = await import('jose');
  mockJwtVerify = vi.mocked(jose.jwtVerify);
});

const validToken = 'Bearer valid.jwt.token';
const adminPayload = { sub: 'admin_123', email: 'admin@qona.ai', user_metadata: { role: 'ADMIN', full_name: 'Admin User' } };
const userPayload = { sub: 'user_123', email: 'user@qona.ai', user_metadata: { role: 'USER', full_name: 'Regular User' } };

describe('Admin Endpoints Authorization', () => {
  it('should return 401 for /api/admin/stats without auth header', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('should return 403 for /api/admin/stats when logged-in user is not an admin in DB', async () => {
    mockJwtVerify.mockResolvedValue({ payload: userPayload });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'usr_abc',
      authId: 'user_123',
      email: 'user@qona.ai',
      name: 'Regular User',
      role: 'USER',
    });

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', validToken);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('should allow /api/admin/stats when logged-in user is an admin in DB', async () => {
    mockJwtVerify.mockResolvedValue({ payload: adminPayload });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'adm_abc',
      authId: 'admin_123',
      email: 'admin@qona.ai',
      name: 'Admin User',
      role: 'ADMIN',
    });

    // Mock stats dependencies
    mockPrisma.user.count.mockResolvedValue(10);
    mockPrisma.workflow.count.mockResolvedValue(5);
    mockPrisma.user.findMany.mockResolvedValue([
      { email: 'test@gmail.com', country: 'US', createdAt: new Date(), subscriptions: [] },
    ]);

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', validToken);

    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.totalUsers).toBe(10);
  });
});

describe('User Management Admin Endpoints', () => {
  beforeEach(() => {
    mockJwtVerify.mockResolvedValue({ payload: adminPayload });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'adm_abc',
      authId: 'admin_123',
      email: 'admin@qona.ai',
      name: 'Admin User',
      role: 'ADMIN',
    });
  });

  it('GET /api/admin/users returns paginated list of users', async () => {
    mockPrisma.user.count.mockResolvedValue(2);
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'usr_1',
        authId: 'auth_1',
        email: 'user1@gmail.com',
        name: 'User One',
        avatarUrl: null,
        role: 'USER',
        country: 'US',
        createdAt: new Date(),
        updatedAt: new Date(),
        subscriptions: [],
        _count: { workflows: 2, conversations: 1 },
      },
    ]);

    const res = await request(app)
      .get('/api/admin/users')
      .query({ page: 1, limit: 10 })
      .set('Authorization', validToken);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.total).toBe(2);
    expect(res.body.users[0].planName).toBe('Free');
  });

  it('PATCH /api/admin/users/:id/role updates a user role', async () => {
    mockPrisma.user.update.mockResolvedValue({
      id: 'usr_target',
      role: 'ADMIN',
    });

    const res = await request(app)
      .patch('/api/admin/users/usr_target/role')
      .set('Authorization', validToken)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('PATCH /api/admin/users/:id/role rejects invalid role values', async () => {
    const res = await request(app)
      .patch('/api/admin/users/usr_target/role')
      .set('Authorization', validToken)
      .send({ role: 'SUPERUSER' });

    expect(res.status).toBe(400);
  });

  it('DELETE /api/admin/users/:id deletes user but blocks deleting self', async () => {
    // Mock findUnique to return different users based on whether it is doing authentication lookup or deletion lookup
    mockPrisma.user.findUnique.mockImplementation(async (args: any) => {
      if (args.where?.authId === 'admin_123') {
        return { id: 'adm_abc', authId: 'admin_123', role: 'ADMIN' };
      }
      if (args.where?.id === 'usr_to_del') {
        return { id: 'usr_to_del', authId: 'some_other_auth' };
      }
      return null;
    });
    mockPrisma.user.delete.mockResolvedValue({ id: 'usr_to_del' });

    const deleteTargetRes = await request(app)
      .delete('/api/admin/users/usr_to_del')
      .set('Authorization', validToken);

    expect(deleteTargetRes.status).toBe(200);
    expect(deleteTargetRes.body.success).toBe(true);

    // Attempt deleting self
    mockPrisma.user.findUnique.mockImplementation(async (args: any) => {
      if (args.where?.authId === 'admin_123') {
        return { id: 'adm_abc', authId: 'admin_123', role: 'ADMIN' };
      }
      if (args.where?.id === 'adm_abc') {
        return { id: 'adm_abc', authId: 'admin_123', role: 'ADMIN' };
      }
      return null;
    });

    const deleteSelfRes = await request(app)
      .delete('/api/admin/users/adm_abc')
      .set('Authorization', validToken);

    expect(deleteSelfRes.status).toBe(409);
    expect(deleteSelfRes.body.error).toContain('cannot delete your own');
  });
});
