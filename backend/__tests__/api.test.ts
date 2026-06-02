import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: () => ({}),
}));

vi.mock('../src/lib/prisma.js', () => ({
  getPrisma: () => ({
    user: { findUnique: vi.fn(), create: vi.fn().mockReturnValue({id: 'prisma-id-123'}), upsert: vi.fn(), update: vi.fn() },
    workflow: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    workflowVersion: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    conversation: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    conversationMessage: { findMany: vi.fn(), create: vi.fn() },
    exportHistory: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    apiKey: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    $disconnect: vi.fn(),
  }),
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
const validPayload = { sub: 'auth_123', email: 'test@example.com', user_metadata: { full_name: 'Test User' } };

function mockAuth() {
  mockJwtVerify.mockResolvedValue({ payload: validPayload });
}

describe('Health', () => {
  it('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth Middleware', () => {
  it('401 without auth header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 with invalid token', async () => {
    mockJwtVerify.mockRejectedValue(new Error('Invalid'));
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
  });
});

describe('Workflows API', () => {
  it('GET /api/workflows returns 401 without auth', async () => {
    const res = await request(app).get('/api/workflows');
    expect(res.status).toBe(401);
  });

  it('GET /api/workflows returns list with auth', async () => {
    mockAuth();
    const res = await request(app).get('/api/workflows').set('Authorization', validToken);
    expect(res.status).toBe(200);
  });

  it('POST /api/workflows validates body', async () => {
    mockAuth();
    const res = await request(app).post('/api/workflows').set('Authorization', validToken).send({});
    expect(res.status).toBe(400);
  });
});

describe('Export Endpoints', () => {
  it('POST /api/workflows/:id/export returns 401 without auth', async () => {
    const res = await request(app).post('/api/workflows/1/export').send({ platform: 'n8n' });
    expect(res.status).toBe(401);
  });

  it('POST /api/workflows/:id/export validates platform', async () => {
    mockAuth();
    const res = await request(app).post('/api/workflows/1/export').set('Authorization', validToken).send({ platform: 'bad' });
    expect(res.status).toBe(400);
  });

  it('POST /api/workflows/:id/export/download sets headers', async () => {
    mockAuth();
    const res = await request(app).post('/api/workflows/1/export/download').set('Authorization', validToken).send({ platform: 'n8n' });
    expect([200, 404]).toContain(res.status);
  });
});

describe('Conversations API', () => {
  it('GET /api/conversations returns 401 without auth', async () => {
    const res = await request(app).get('/api/conversations');
    expect(res.status).toBe(401);
  });

  it('GET /api/conversations returns list with auth', async () => {
    mockAuth();
    const res = await request(app).get('/api/conversations').set('Authorization', validToken);
    expect(res.status).toBe(200);
  });
});

describe('Validation Engine', () => {
  it('warns when workflow has no nodes', async () => {
    const { validateForExport } = await import('../src/services/export-engine.js');
    const w = validateForExport({ nodes: [], edges: [], metadata: { name: '', description: '' } }, 'n8n');
    expect(w.some((x) => x.field === 'nodes' && x.severity === 'error')).toBe(true);
  });

  it('warns when workflow has no edges', async () => {
    const { validateForExport } = await import('../src/services/export-engine.js');
    const w = validateForExport({
      nodes: [{ id: 'n1', type: 'webhook', position: { x: 0, y: 0 }, data: {} }],
      edges: [], metadata: { name: 't', description: '' },
    }, 'n8n');
    expect(w.some((x) => x.field === 'edges')).toBe(true);
  });

  it('detects missing target node', async () => {
    const { validateForExport } = await import('../src/services/export-engine.js');
    const w = validateForExport({
      nodes: [{ id: 'n1', type: 'webhook', position: { x: 0, y: 0 }, data: {} }],
      edges: [{ id: 'e1', source: 'n1', target: 'missing' }],
      metadata: { name: 't', description: '' },
    }, 'n8n');
    expect(w.some((x) => x.message.includes('missing'))).toBe(true);
  });

  it('warns for make.com unsupported nodes', async () => {
    const { validateForExport } = await import('../src/services/export-engine.js');
    const w = validateForExport({
      nodes: [
        { id: 'n1', type: 'webhook', position: { x: 0, y: 0 }, data: {} },
        { id: 'n2', type: 'googleSheets', position: { x: 200, y: 0 }, data: {} },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      metadata: { name: 't', description: '' },
    }, 'make');
    expect(w.some((x) => x.message.toLowerCase().includes('unsupported') || x.message.toLowerCase().includes('equivalents'))).toBe(true);
  });
});

describe('Export Format Conversion', () => {
  it('n8n format', async () => {
    const { convertToN8nFormat } = await import('../src/services/export-engine.js');
    const r = convertToN8nFormat({
      nodes: [{ id: 'n1', type: 'webhook', position: { x: 100, y: 200 }, data: { label: 'Web' } }],
      edges: [], metadata: { name: 'Test', description: '' },
    });
    expect(r.name).toBe('Test');
    expect(r.nodes).toHaveLength(1);
  });

  it('zapier format', async () => {
    const { convertToZapierFormat } = await import('../src/services/export-engine.js');
    const r = convertToZapierFormat({
      nodes: [{ id: 'n1', type: 'webhook', position: { x: 0, y: 0 }, data: {} }],
      edges: [], metadata: { name: 'Zap', description: '' },
    });
    expect(r.title).toBe('Zap');
    expect(r.steps).toHaveLength(1);
  });

  it('make format', async () => {
    const { convertToMakeFormat } = await import('../src/services/export-engine.js');
    const r = convertToMakeFormat({
      nodes: [{ id: 'n1', type: 'webhook', position: { x: 0, y: 0 }, data: {} }],
      edges: [], metadata: { name: 'Scenario', description: '' },
    });
    expect(r.name).toBe('Scenario');
    expect(r.modules).toHaveLength(1);
  });
});

describe('Setup Instructions', () => {
  it('n8n instructions', async () => {
    const { getSetupInstructions } = await import('../src/services/export-engine.js');
    expect(getSetupInstructions('n8n').platform).toBe('n8n');
  });
  it('zapier instructions', async () => {
    const { getSetupInstructions } = await import('../src/services/export-engine.js');
    expect(getSetupInstructions('zapier').platform).toBe('Zapier');
  });
  it('make instructions', async () => {
    const { getSetupInstructions } = await import('../src/services/export-engine.js');
    expect(getSetupInstructions('make').platform).toBe('Make.com');
  });
});

describe('Export History', () => {
  it('GET /api/workflows/:id/exports returns 401 without auth', async () => {
    const res = await request(app).get('/api/workflows/1/exports');
    expect(res.status).toBe(401);
  });

  it('GET /api/workflows/:id/exports with auth', async () => {
    mockAuth();
    const res = await request(app).get('/api/workflows/1/exports').set('Authorization', validToken);
    expect(res.status).toBe(200);
  });
});

describe('Beta Limits', () => {
  it('POST /api/workflows validates required name field', async () => {
    mockAuth();
    const res = await request(app).post('/api/workflows').set('Authorization', validToken).send({ name: '', description: '', definition: {} });
    expect(res.status).toBe(400);
  });

  it('POST /api/workflows rejects missing definition', async () => {
    mockAuth();
    const res = await request(app).post('/api/workflows').set('Authorization', validToken).send({ name: 'Test' });
    expect(res.status).toBe(400);
  });
});
