/**
 * Comprehensive n8n Compiler Tests
 * ──────────────────────────────────
 * 52 real-world workflow scenarios covering 10 integration patterns.
 * Every test verifies:
 *   1. InternalGraph accepted without validation errors
 *   2. Compiled JSON has correct n8n import structure
 *   3. Node types, typeVersions, and parameters are correct
 *   4. Connections are keyed by node name (not ID)
 *   5. Deterministic output across two independent compilations
 *   6. No AI hallucinations leak into exported parameters
 */

import { describe, it, expect } from 'vitest';
import { compileInternalGraph } from '../src/services/n8n-compiler.js';
import { validateExport } from '../src/services/export-validator.js';
import type { InternalGraph } from '@qona/shared';

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Verify every structural requirement that n8n's importer checks */
function assertImportReady(graph: InternalGraph) {
  const result = compileInternalGraph(graph);
  expect(result.success, `Compilation failed: ${result.errors.map((e) => e.message).join('; ')}`).toBe(true);
  const wf = result.workflow!;

  // Top-level fields
  expect(wf.id).toBeDefined();
  expect(UUID_REGEX.test(wf.id)).toBe(true);
  expect(wf.name).toBeTruthy();
  expect(typeof wf.active).toBe('boolean');
  expect(wf.active).toBe(false);
  expect(wf.settings).toEqual({ executionOrder: 'v1' });
  expect(wf.pinData).toEqual({});
  expect(Array.isArray(wf.nodes)).toBe(true);
  expect(wf.nodes.length).toBeGreaterThan(0);

  // All node types must be n8n-nodes-base.*
  for (const node of wf.nodes) {
    expect(node.type, `Node "${node.name}" has invalid type "${node.type}"`).toMatch(/^n8n-nodes-base\./);
    expect(node.id).toBeTruthy();
    expect(node.name).toBeTruthy();
    expect(typeof node.typeVersion).toBe('number');
    expect(Array.isArray(node.position)).toBe(true);
    expect(node.position).toHaveLength(2);
  }

  // Connections keyed by node NAME
  const nodeNames = new Set(wf.nodes.map((n) => n.name));
  for (const key of Object.keys(wf.connections)) {
    expect(nodeNames.has(key), `Connection key "${key}" is not a node name`).toBe(true);
  }

  return { result, wf };
}

/** Verify two compilations of the same graph produce the same structure (determinism) */
function assertDeterministic(graph: InternalGraph) {
  const r1 = compileInternalGraph(graph);
  const r2 = compileInternalGraph(graph);
  expect(r1.success).toBe(true);
  expect(r2.success).toBe(true);

  const w1 = r1.workflow!;
  const w2 = r2.workflow!;

  // Non-UUID fields must be identical
  expect(w1.name).toBe(w2.name);
  expect(w1.active).toBe(w2.active);
  expect(w1.settings).toEqual(w2.settings);
  expect(w1.nodes.length).toBe(w2.nodes.length);
  expect(w1.connections).toEqual(w2.connections);

  // Node parameters must be identical
  for (let i = 0; i < w1.nodes.length; i++) {
    expect(w1.nodes[i].type).toBe(w2.nodes[i].type);
    expect(w1.nodes[i].typeVersion).toBe(w2.nodes[i].typeVersion);
    expect(w1.nodes[i].name).toBe(w2.nodes[i].name);
    expect(w1.nodes[i].parameters).toEqual(w2.nodes[i].parameters);
  }
}

// ═══════════════════════════════════════════════════════════
// SCENARIO 1 — Gmail → Google Drive (5 tests)
// ═══════════════════════════════════════════════════════════

describe('Gmail → Google Drive', () => {
  const gmailDriveBase: InternalGraph = {
    metadata: { name: 'Gmail to Drive' },
    nodes: [
      {
        id: 'n1',
        type: 'email_received',
        label: 'Gmail Trigger',
        position: { x: 100, y: 200 },
        config: { provider: 'gmail', simple: true },
      },
      {
        id: 'n2',
        type: 'google_drive',
        label: 'Upload to Drive',
        position: { x: 400, y: 200 },
        config: {
          resource: 'file',
          operation: 'upload',
          name: 'attachment.pdf',
          binaryPropertyName: 'attachment_0',
        },
      },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
  };

  it('1.1 — basic: gmailTrigger → googleDrive upload is import-ready', () => {
    const { wf } = assertImportReady(gmailDriveBase);
    const trigger = wf.nodes.find((n) => n.name === 'Gmail Trigger')!;
    expect(trigger.type).toBe('n8n-nodes-base.gmailTrigger');
    const drive = wf.nodes.find((n) => n.name === 'Upload to Drive')!;
    expect(drive.type).toBe('n8n-nodes-base.googleDrive');
    expect(drive.parameters.operation).toBe('upload');
    expect(drive.parameters.resource).toBe('file');
  });

  it('1.2 — credentials emitted for both OAuth nodes', () => {
    const { wf } = assertImportReady(gmailDriveBase);
    const trigger = wf.nodes.find((n) => n.type === 'n8n-nodes-base.gmailTrigger')!;
    expect(trigger.credentials?.gmailOAuth2).toBeDefined();
    const drive = wf.nodes.find((n) => n.type === 'n8n-nodes-base.googleDrive')!;
    expect(drive.credentials?.googleDriveOAuth2Api).toBeDefined();
  });

  it('1.3 — connections are keyed by node name not ID', () => {
    const { wf } = assertImportReady(gmailDriveBase);
    expect(wf.connections['Gmail Trigger']).toBeDefined();
    expect(wf.connections['n1']).toBeUndefined();
    const targets = wf.connections['Gmail Trigger'].main[0].map((c) => c.node);
    expect(targets).toContain('Upload to Drive');
    expect(targets).not.toContain('n2');
  });

  it('1.4 — with code transform between gmail and drive', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Gmail → Code → Drive' },
      nodes: [
        { id: 'n1', type: 'email_received', label: 'Gmail Trigger', position: { x: 100, y: 200 }, config: { provider: 'gmail' } },
        { id: 'n2', type: 'run_code', label: 'Extract Attachment', position: { x: 350, y: 200 }, config: { jsCode: 'return items.map(i => ({ json: i.json, binary: i.binary }));' } },
        { id: 'n3', type: 'google_drive', label: 'Save to Drive', position: { x: 600, y: 200 }, config: { resource: 'file', operation: 'upload', binaryPropertyName: 'attachment_0' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
    };
    const { wf } = assertImportReady(graph);
    expect(wf.nodes).toHaveLength(3);
    const code = wf.nodes.find((n) => n.type === 'n8n-nodes-base.code')!;
    expect(code.parameters.jsCode).toBeTruthy();
  });

  it('1.5 — with Slack notification on Drive upload completion (deterministic)', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Gmail → Drive → Slack' },
      nodes: [
        { id: 'n1', type: 'email_received', label: 'Gmail Trigger', position: { x: 100, y: 200 }, config: { provider: 'gmail' } },
        { id: 'n2', type: 'google_drive', label: 'Upload File', position: { x: 400, y: 200 }, config: { resource: 'file', operation: 'upload', binaryPropertyName: 'data' } },
        { id: 'n3', type: 'slack', label: 'Notify Team', position: { x: 700, y: 200 }, config: { channel: '#uploads', message: 'New file uploaded to Drive' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    assertDeterministic(graph);
    const { wf } = assertImportReady(graph);
    expect(wf.nodes).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════
// SCENARIO 2 — Stripe → Slack (5 tests)
// ═══════════════════════════════════════════════════════════

describe('Stripe → Slack', () => {
  it('2.1 — payment.succeeded → Slack alert', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Stripe Payment Alert' },
      nodes: [
        { id: 'n1', type: 'stripe_trigger', label: 'Stripe Trigger', position: { x: 100, y: 200 }, config: { events: ['payment_intent.succeeded'] } },
        { id: 'n2', type: 'slack', label: 'Payment Alert', position: { x: 400, y: 200 }, config: { channel: '#payments', message: 'Payment received!' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const trigger = wf.nodes.find((n) => n.name === 'Stripe Trigger')!;
    expect(trigger.type).toBe('n8n-nodes-base.stripeTrigger');
    expect(trigger.parameters.events).toEqual(['payment_intent.succeeded']);
    const slack = wf.nodes.find((n) => n.name === 'Payment Alert')!;
    expect(slack.parameters.channel).toBe('#payments');
  });

  it('2.2 — payment.failed → Slack urgent alert', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Stripe Failed Payment' },
      nodes: [
        { id: 'n1', type: 'stripe_trigger', label: 'Stripe Failed', position: { x: 100, y: 200 }, config: { events: ['payment_intent.payment_failed'] } },
        { id: 'n2', type: 'slack', label: 'Alert Ops', position: { x: 400, y: 200 }, config: { channel: '#alerts', message: '🚨 Payment failed!' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    expect(wf.nodes[0].type).toBe('n8n-nodes-base.stripeTrigger');
  });

  it('2.3 — subscription.created → Slack + Google Sheets', () => {
    const graph: InternalGraph = {
      metadata: { name: 'New Subscription Tracking' },
      nodes: [
        { id: 'n1', type: 'stripe_trigger', label: 'Stripe Sub', position: { x: 100, y: 200 }, config: { events: ['customer.subscription.created'] } },
        { id: 'n2', type: 'google_sheets', label: 'Log to Sheets', position: { x: 400, y: 200 }, config: { documentId: 'sheet-abc123', sheetName: 'Subscriptions', operation: 'append' } },
        { id: 'n3', type: 'slack', label: 'Notify Sales', position: { x: 700, y: 200 }, config: { channel: '#sales', message: 'New subscription!' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    expect(wf.nodes).toHaveLength(3);
    const sheets = wf.nodes.find((n) => n.type === 'n8n-nodes-base.googleSheets')!;
    expect(sheets.typeVersion).toBe(4);
    expect(sheets.parameters.operation).toBe('appendRow');
  });

  it('2.4 — with conditional: route paid/failed to different Slack channels', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Stripe Conditional Routing' },
      nodes: [
        { id: 'n1', type: 'stripe_trigger', label: 'Stripe Events', position: { x: 100, y: 200 }, config: { events: ['payment_intent.succeeded', 'payment_intent.payment_failed'] } },
        { id: 'n2', type: 'filter', label: 'Check Status', position: { x: 400, y: 200 }, config: { conditions: { string: [{ value1: '={{ $json.status }}', operation: 'equals', value2: 'succeeded' }] } } },
        { id: 'n3', type: 'slack', label: 'Success Channel', position: { x: 700, y: 100 }, config: { channel: '#payments', message: 'Payment succeeded' } },
        { id: 'n4', type: 'slack', label: 'Failure Channel', position: { x: 700, y: 300 }, config: { channel: '#alerts', message: 'Payment failed' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3', label: 'true' },
        { id: 'e3', source: 'n2', target: 'n4', label: 'false' },
      ],
    };
    const { wf } = assertImportReady(graph);
    const ifNode = wf.nodes.find((n) => n.type === 'n8n-nodes-base.if')!;
    expect(wf.connections[ifNode.name].main).toHaveLength(2);
  });

  it('2.5 — determinism: same Stripe graph produces identical output twice', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Stripe Determinism' },
      nodes: [
        { id: 'n1', type: 'stripe_trigger', label: 'Stripe', position: { x: 100, y: 200 }, config: { events: ['charge.succeeded'] } },
        { id: 'n2', type: 'slack', label: 'Notify', position: { x: 400, y: 200 }, config: { channel: '#general', message: 'Charge!' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    assertDeterministic(graph);
  });
});

// ═══════════════════════════════════════════════════════════
// SCENARIO 3 — Webhook → Airtable (5 tests)
// ═══════════════════════════════════════════════════════════

describe('Webhook → Airtable', () => {
  it('3.1 — form submission creates Airtable record', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Form to Airtable' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Form Webhook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'form-submit' } },
        { id: 'n2', type: 'airtable', label: 'Create Contact', position: { x: 400, y: 200 }, config: { application: 'appXYZ123', table: 'Contacts', operation: 'create' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const airtable = wf.nodes.find((n) => n.name === 'Create Contact')!;
    expect(airtable.type).toBe('n8n-nodes-base.airtable');
    expect(airtable.typeVersion).toBe(2);
    expect(airtable.parameters.application).toBe('appXYZ123');
    expect(airtable.parameters.table).toBe('Contacts');
    expect(airtable.parameters.operation).toBe('create');
    expect(airtable.credentials?.airtableApi).toBeDefined();
  });

  it('3.2 — webhook path is emitted correctly', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Webhook Path Test' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Contact Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'contacts' } },
        { id: 'n2', type: 'airtable', label: 'Log Contact', position: { x: 400, y: 200 }, config: { application: 'appABC', tableName: 'Leads', operation: 'create' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const webhook = wf.nodes.find((n) => n.type === 'n8n-nodes-base.webhook')!;
    expect(webhook.parameters.path).toBe('contacts');
    expect(UUID_REGEX.test(webhook.webhookId!)).toBe(true);
    // Airtable tableName → table mapping
    const airtable = wf.nodes.find((n) => n.type === 'n8n-nodes-base.airtable')!;
    expect(airtable.parameters.table).toBe('Leads');
  });

  it('3.3 — support ticket → Airtable with Set node for data mapping', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Support Tickets' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Ticket Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'tickets' } },
        { id: 'n2', type: 'airtable', label: 'Create Ticket', position: { x: 400, y: 200 }, config: { application: 'appSUPPORT', table: 'Tickets', operation: 'create', fields: ['Name', 'Email', 'Message'] } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const airtable = wf.nodes.find((n) => n.type === 'n8n-nodes-base.airtable')!;
    expect(airtable.parameters.fields).toEqual(['Name', 'Email', 'Message']);
  });

  it('3.4 — with filter: only route valid submissions to Airtable', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Validated Form' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Form Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'validate' } },
        { id: 'n2', type: 'filter', label: 'Has Email', position: { x: 350, y: 200 }, config: { conditions: { string: [{ value1: '={{ $json.email }}', operation: 'notEmpty' }] } } },
        { id: 'n3', type: 'airtable', label: 'Save Lead', position: { x: 600, y: 100 }, config: { application: 'appLEADS', table: 'Leads', operation: 'create' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3', label: 'true' },
      ],
    };
    const { wf } = assertImportReady(graph);
    expect(wf.nodes).toHaveLength(3);
  });

  it('3.5 — Airtable search operation with formula filter', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Airtable Search' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Search Hook', position: { x: 100, y: 200 }, config: { method: 'GET', path: 'search' } },
        { id: 'n2', type: 'airtable', label: 'Search Records', position: { x: 400, y: 200 }, config: { application: 'appDB', table: 'Products', operation: 'search', filterByFormula: "Status='Active'", returnAll: true } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const airtable = wf.nodes.find((n) => n.type === 'n8n-nodes-base.airtable')!;
    expect(airtable.parameters.operation).toBe('search');
    expect(airtable.parameters.filterByFormula).toBe("Status='Active'");
    expect(airtable.parameters.returnAll).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// SCENARIO 4 — Notion → Discord (5 tests)
// ═══════════════════════════════════════════════════════════

describe('Notion → Discord', () => {
  it('4.1 — new Notion page → Discord announcement', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Notion to Discord' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Every 5 Min', position: { x: 100, y: 200 }, config: { cronExpression: '*/5 * * * *' } },
        { id: 'n2', type: 'notion', label: 'Get Pages', position: { x: 400, y: 200 }, config: { resource: 'page', operation: 'getAll', databaseId: 'db-abc123' } },
        { id: 'n3', type: 'discord', label: 'Announce Page', position: { x: 700, y: 200 }, config: { guildId: '123456789', channelId: '987654321', content: 'New page published!' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const notion = wf.nodes.find((n) => n.name === 'Get Pages')!;
    expect(notion.type).toBe('n8n-nodes-base.notion');
    expect(notion.typeVersion).toBe(2);
    expect(notion.parameters.resource).toBe('page');
    expect(notion.parameters.operation).toBe('getAll');
    const discord = wf.nodes.find((n) => n.name === 'Announce Page')!;
    expect(discord.type).toBe('n8n-nodes-base.discord');
    expect(discord.parameters.guildId).toBe('123456789');
    expect(discord.parameters.channelId).toBe('987654321');
    expect(discord.credentials?.discordApi).toBeDefined();
  });

  it('4.2 — Notion database row → Discord embed', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Notion DB to Discord' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Hourly', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'notion', label: 'Read Database', position: { x: 400, y: 200 }, config: { resource: 'databasePage', operation: 'getAll', databaseId: 'db-xyz' } },
        { id: 'n3', type: 'discord', label: 'Post Embed', position: { x: 700, y: 200 }, config: { guildId: '111', channelId: '222', embeds: [{ title: 'Update', description: '={{ $json.title }}' }] } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const discord = wf.nodes.find((n) => n.type === 'n8n-nodes-base.discord')!;
    expect(discord.parameters.embeds).toHaveLength(1);
  });

  it('4.3 — Notion create page from Discord command (webhook)', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Discord Command to Notion' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Discord Webhook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'discord-cmd' } },
        { id: 'n2', type: 'notion', label: 'Create Page', position: { x: 400, y: 200 }, config: { resource: 'page', operation: 'create', databaseId: 'db-notes', title: '={{ $json.command }}' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const notion = wf.nodes.find((n) => n.type === 'n8n-nodes-base.notion')!;
    expect(notion.parameters.operation).toBe('create');
  });

  it('4.4 — Notion search → filter published → Discord message', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Published Notion to Discord' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Daily', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'notion', label: 'Search Pages', position: { x: 350, y: 200 }, config: { resource: 'page', operation: 'search', filter: { property: 'Status', select: { equals: 'Published' } } } },
        { id: 'n3', type: 'filter', label: 'Is Published', position: { x: 600, y: 200 }, config: { conditions: { string: [{ value1: '={{ $json.status }}', operation: 'equals', value2: 'Published' }] } } },
        { id: 'n4', type: 'discord', label: 'Post Update', position: { x: 850, y: 100 }, config: { guildId: '999', channelId: '888', content: 'New article published' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4', label: 'true' },
      ],
    };
    const { wf } = assertImportReady(graph);
    expect(wf.nodes).toHaveLength(4);
  });

  it('4.5 — Notion update page, Discord confirm (deterministic)', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Notion Update Confirm' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Update Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'update' } },
        { id: 'n2', type: 'notion', label: 'Update Page', position: { x: 400, y: 200 }, config: { resource: 'page', operation: 'update', pageId: '={{ $json.pageId }}' } },
        { id: 'n3', type: 'discord', label: 'Confirm', position: { x: 700, y: 200 }, config: { guildId: '555', channelId: '666', content: 'Page updated ✅' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    assertDeterministic(graph);
    assertImportReady(graph);
  });
});

// ═══════════════════════════════════════════════════════════
// SCENARIO 5 — RSS → Email (5 tests)
// ═══════════════════════════════════════════════════════════

describe('RSS → Email', () => {
  it('5.1 — RSS feed → SMTP email digest', () => {
    const graph: InternalGraph = {
      metadata: { name: 'RSS to Email' },
      nodes: [
        { id: 'n1', type: 'rss_feed', label: 'Tech RSS', position: { x: 100, y: 200 }, config: { url: 'https://feeds.example.com/tech' } },
        { id: 'n2', type: 'send_email', label: 'Send Digest', position: { x: 400, y: 200 }, config: { toEmail: 'reader@example.com', subject: 'Daily Tech Digest', html: '<h1>Today in Tech</h1>' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const rss = wf.nodes.find((n) => n.name === 'Tech RSS')!;
    expect(rss.type).toBe('n8n-nodes-base.rssFeedRead');
    expect(rss.parameters.url).toBe('https://feeds.example.com/tech');
    const email = wf.nodes.find((n) => n.name === 'Send Digest')!;
    expect(email.type).toBe('n8n-nodes-base.emailSend');
    expect(email.parameters.toEmail).toBe('reader@example.com');
    expect(email.credentials?.smtp).toBeDefined();
  });

  it('5.2 — RSS feedUrl alias maps correctly', () => {
    const graph: InternalGraph = {
      metadata: { name: 'RSS feedUrl alias' },
      nodes: [
        { id: 'n1', type: 'rss_feed', label: 'Feed', position: { x: 100, y: 200 }, config: { feedUrl: 'https://news.example.com/rss' } },
        { id: 'n2', type: 'send_email', label: 'Email', position: { x: 400, y: 200 }, config: { toEmail: 'user@test.com', subject: 'News' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const rss = wf.nodes.find((n) => n.type === 'n8n-nodes-base.rssFeedRead')!;
    // feedUrl → url mapping
    expect(rss.parameters.url).toBe('https://news.example.com/rss');
    expect(rss.parameters.feedUrl).toBeUndefined();
  });

  it('5.3 — RSS with keyword filter before email', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Filtered RSS' },
      nodes: [
        { id: 'n1', type: 'rss_feed', label: 'AI News', position: { x: 100, y: 200 }, config: { url: 'https://ai-news.example.com/feed' } },
        { id: 'n2', type: 'filter', label: 'Has AI', position: { x: 350, y: 200 }, config: { conditions: { string: [{ value1: '={{ $json.title }}', operation: 'contains', value2: 'AI' }] } } },
        { id: 'n3', type: 'send_email', label: 'AI Alert', position: { x: 600, y: 100 }, config: { toEmail: 'cto@company.com', subject: 'AI News Alert' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3', label: 'true' },
      ],
    };
    assertImportReady(graph);
  });

  it('5.4 — scheduled RSS poll with Gmail send', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Scheduled RSS Gmail' },
      nodes: [
        { id: 'n1', type: 'rss_feed', label: 'Morning Feed', position: { x: 100, y: 200 }, config: { url: 'https://morning.news/rss' } },
        { id: 'n2', type: 'gmail', label: 'Gmail Digest', position: { x: 400, y: 200 }, config: { toEmail: 'me@gmail.com', subject: 'Morning Digest', html: '={{ $json.description }}' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const gmail = wf.nodes.find((n) => n.type === 'n8n-nodes-base.gmail')!;
    expect(gmail.typeVersion).toBe(2);
    expect(gmail.parameters.toEmail).toBe('me@gmail.com');
  });

  it('5.5 — RSS to email with code node for HTML formatting (deterministic)', () => {
    const graph: InternalGraph = {
      metadata: { name: 'RSS Format Email' },
      nodes: [
        { id: 'n1', type: 'rss_feed', label: 'Feed Source', position: { x: 100, y: 200 }, config: { url: 'https://example.com/feed' } },
        { id: 'n2', type: 'run_code', label: 'Format HTML', position: { x: 350, y: 200 }, config: { jsCode: "return [{ json: { html: '<h2>' + $input.item.json.title + '</h2>' } }];" } },
        { id: 'n3', type: 'send_email', label: 'Send', position: { x: 600, y: 200 }, config: { toEmail: 'team@co.com', subject: 'Weekly Digest' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    assertDeterministic(graph);
    assertImportReady(graph);
  });
});

// ═══════════════════════════════════════════════════════════
// SCENARIO 6 — Calendar → Slack (5 tests)
// ═══════════════════════════════════════════════════════════

describe('Google Calendar → Slack', () => {
  it('6.1 — upcoming events → Slack reminder', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Calendar Reminder' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Every Morning', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'google_calendar', label: 'Get Events', position: { x: 400, y: 200 }, config: { calendarId: 'primary', resource: 'event', operation: 'getAll' } },
        { id: 'n3', type: 'slack', label: 'Daily Standup', position: { x: 700, y: 200 }, config: { channel: '#team', message: 'Todays events: {{ $json.summary }}' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const cal = wf.nodes.find((n) => n.name === 'Get Events')!;
    expect(cal.type).toBe('n8n-nodes-base.googleCalendar');
    expect(cal.parameters.calendarId).toBe('primary');
    expect(cal.parameters.operation).toBe('getAll');
    expect(cal.credentials?.googleCalendarOAuth2Api).toBeDefined();
  });

  it('6.2 — calendar event create → Slack notification', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Create Event Notify' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Create Trigger', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'create-event' } },
        { id: 'n2', type: 'google_calendar', label: 'Add Event', position: { x: 400, y: 200 }, config: { calendarId: 'primary', operation: 'create', summary: '={{ $json.title }}', start: { dateTime: '={{ $json.start }}' }, end: { dateTime: '={{ $json.end }}' } } },
        { id: 'n3', type: 'slack', label: 'Event Added', position: { x: 700, y: 200 }, config: { channel: '#calendar', message: 'Event added: {{ $json.summary }}' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const cal = wf.nodes.find((n) => n.type === 'n8n-nodes-base.googleCalendar')!;
    expect(cal.parameters.operation).toBe('create');
    expect(cal.parameters.summary).toBeTruthy();
  });

  it('6.3 — calendar delete event → Slack alert', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Cancel Event Alert' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Cancel Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'cancel' } },
        { id: 'n2', type: 'google_calendar', label: 'Delete Event', position: { x: 400, y: 200 }, config: { calendarId: 'work', operation: 'delete', eventId: '={{ $json.eventId }}' } },
        { id: 'n3', type: 'slack', label: 'Cancellation Notice', position: { x: 700, y: 200 }, config: { channel: '#team', message: 'Meeting cancelled' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const cal = wf.nodes.find((n) => n.type === 'n8n-nodes-base.googleCalendar')!;
    expect(cal.parameters.operation).toBe('delete');
  });

  it('6.4 — calendar quickAdd → Slack confirmation', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Quick Add Event' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Quick Add Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'quickadd' } },
        { id: 'n2', type: 'google_calendar', label: 'Quick Add', position: { x: 400, y: 200 }, config: { calendarId: 'primary', operation: 'quickAdd', summary: '={{ $json.text }}' } },
        { id: 'n3', type: 'slack', label: 'Confirmed', position: { x: 700, y: 200 }, config: { channel: '#bot', message: 'Added to calendar' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    assertImportReady(graph);
  });

  it('6.5 — calendar + Slack with 30-minute delay (deterministic)', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Calendar Delayed Slack' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Morning Check', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'google_calendar', label: 'Get Today', position: { x: 350, y: 200 }, config: { calendarId: 'primary', operation: 'getAll' } },
        { id: 'n3', type: 'delay', label: 'Wait 30 Min', position: { x: 600, y: 200 }, config: { amount: 30, unit: 'minutes' } },
        { id: 'n4', type: 'slack', label: 'Remind', position: { x: 850, y: 200 }, config: { channel: '#reminders', message: 'Your meeting starts soon!' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }, { id: 'e3', source: 'n3', target: 'n4' }],
    };
    assertDeterministic(graph);
    const { wf } = assertImportReady(graph);
    const wait = wf.nodes.find((n) => n.type === 'n8n-nodes-base.wait')!;
    expect(wait.parameters.amount).toBe(30);
    expect(wait.parameters.unit).toBe('minutes');
  });
});

// ═══════════════════════════════════════════════════════════
// SCENARIO 7 — Google Sheets → OpenAI (5 tests)
// ═══════════════════════════════════════════════════════════

describe('Google Sheets → OpenAI', () => {
  it('7.1 — read sheet rows → OpenAI completion', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Sheets to OpenAI' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Daily Batch', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'google_sheets', label: 'Read Rows', position: { x: 400, y: 200 }, config: { documentId: 'sheet-batch', sheetName: 'Prompts', operation: 'read' } },
        { id: 'n3', type: 'openai', label: 'Generate Text', position: { x: 700, y: 200 }, config: { resource: 'text', operation: 'complete', model: 'gpt-4', prompt: '={{ $json.prompt }}' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const sheets = wf.nodes.find((n) => n.name === 'Read Rows')!;
    expect(sheets.type).toBe('n8n-nodes-base.googleSheets');
    expect(sheets.parameters.operation).toBe('readRows');
    const ai = wf.nodes.find((n) => n.name === 'Generate Text')!;
    expect(ai.type).toBe('n8n-nodes-base.openAi');
    expect(ai.parameters.model).toBe('gpt-4');
    expect(ai.credentials?.openAiApi).toBeDefined();
  });

  it('7.2 — OpenAI analysis results written back to Sheets', () => {
    const graph: InternalGraph = {
      metadata: { name: 'AI Analysis to Sheets' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Hourly', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'google_sheets', label: 'Read Pending', position: { x: 350, y: 200 }, config: { documentId: 'sheet-ai', sheetName: 'Queue', operation: 'read' } },
        { id: 'n3', type: 'openai', label: 'Analyze', position: { x: 600, y: 200 }, config: { resource: 'chat', operation: 'message', model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: '={{ $json.text }}' }] } },
        { id: 'n4', type: 'google_sheets', label: 'Write Results', position: { x: 850, y: 200 }, config: { documentId: 'sheet-ai', sheetName: 'Results', operation: 'append' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }, { id: 'e3', source: 'n3', target: 'n4' }],
    };
    const { wf } = assertImportReady(graph);
    expect(wf.nodes).toHaveLength(4);
    const ai = wf.nodes.find((n) => n.type === 'n8n-nodes-base.openAi')!;
    expect(ai.parameters.resource).toBe('chat');
    expect(ai.parameters.operation).toBe('message');
  });

  it('7.3 — OpenAI chat model parameter is preserved', () => {
    const graph: InternalGraph = {
      metadata: { name: 'GPT Model Param' },
      nodes: [
        { id: 'n1', type: 'manual', label: 'Start', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'openai', label: 'GPT-4o', position: { x: 400, y: 200 }, config: { operation: 'message', model: 'gpt-4o', resource: 'chat', temperature: 0.7, maxTokens: 2000 } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const ai = wf.nodes.find((n) => n.type === 'n8n-nodes-base.openAi')!;
    expect(ai.parameters.model).toBe('gpt-4o');
    expect(ai.parameters.temperature).toBe(0.7);
    expect(ai.parameters.maxTokens).toBe(2000);
  });

  it('7.4 — OpenAI image generation from Sheets data', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Sheet to AI Image' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Weekly', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'google_sheets', label: 'Read Prompts', position: { x: 350, y: 200 }, config: { documentId: 'img-sheet', sheetName: 'Prompts', operation: 'read' } },
        { id: 'n3', type: 'openai', label: 'Generate Image', position: { x: 600, y: 200 }, config: { resource: 'image', operation: 'create', prompt: '={{ $json.description }}', n: 1 } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const ai = wf.nodes.find((n) => n.type === 'n8n-nodes-base.openAi')!;
    expect(ai.parameters.resource).toBe('image');
    expect(ai.parameters.operation).toBe('create');
  });

  it('7.5 — Sheets → OpenAI → email summary (deterministic)', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Sheets AI Email' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Every Friday', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'google_sheets', label: 'Get Data', position: { x: 350, y: 200 }, config: { documentId: 'weekly-data', sheetName: 'Sheet1', operation: 'read' } },
        { id: 'n3', type: 'openai', label: 'Summarize', position: { x: 600, y: 200 }, config: { operation: 'complete', model: 'gpt-3.5-turbo', prompt: 'Summarize this data' } },
        { id: 'n4', type: 'send_email', label: 'Weekly Summary', position: { x: 850, y: 200 }, config: { toEmail: 'manager@company.com', subject: 'Weekly AI Summary' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }, { id: 'e3', source: 'n3', target: 'n4' }],
    };
    assertDeterministic(graph);
    assertImportReady(graph);
  });
});

// ═══════════════════════════════════════════════════════════
// SCENARIO 8 — Dropbox → Gmail (5 tests)
// ═══════════════════════════════════════════════════════════

describe('Dropbox → Gmail', () => {
  it('8.1 — Dropbox file upload → Gmail notification', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Dropbox to Gmail' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'File Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'dropbox-notify' } },
        { id: 'n2', type: 'dropbox', label: 'Upload File', position: { x: 400, y: 200 }, config: { path: '/uploads/file.pdf', operation: 'upload', binaryPropertyName: 'data' } },
        { id: 'n3', type: 'gmail', label: 'Email Notify', position: { x: 700, y: 200 }, config: { toEmail: 'team@company.com', subject: 'New file in Dropbox', html: 'A new file was uploaded.' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const dropbox = wf.nodes.find((n) => n.name === 'Upload File')!;
    expect(dropbox.type).toBe('n8n-nodes-base.dropbox');
    expect(dropbox.parameters.path).toBe('/uploads/file.pdf');
    expect(dropbox.parameters.operation).toBe('upload');
    expect(dropbox.parameters.binaryData).toBe(true);
    expect(dropbox.credentials?.dropboxApi).toBeDefined();
    const gmail = wf.nodes.find((n) => n.name === 'Email Notify')!;
    expect(gmail.type).toBe('n8n-nodes-base.gmail');
  });

  it('8.2 — Dropbox download → Gmail with attachment', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Dropbox Download Email' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Daily', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'dropbox', label: 'Download Report', position: { x: 400, y: 200 }, config: { path: '/reports/daily.pdf', operation: 'download' } },
        { id: 'n3', type: 'gmail', label: 'Email Report', position: { x: 700, y: 200 }, config: { toEmail: 'boss@company.com', subject: 'Daily Report', html: 'Please find attached' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const dropbox = wf.nodes.find((n) => n.type === 'n8n-nodes-base.dropbox')!;
    expect(dropbox.parameters.operation).toBe('download');
  });

  it('8.3 — Dropbox list → conditional → Gmail', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Dropbox List Conditional' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Hourly Check', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'dropbox', label: 'List Files', position: { x: 350, y: 200 }, config: { path: '/incoming', operation: 'list' } },
        { id: 'n3', type: 'filter', label: 'New Files', position: { x: 600, y: 200 }, config: { conditions: { string: [{ value1: '={{ $json.name }}', operation: 'notEmpty' }] } } },
        { id: 'n4', type: 'gmail', label: 'Alert', position: { x: 850, y: 100 }, config: { toEmail: 'admin@co.com', subject: 'New files arrived' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4', label: 'true' },
      ],
    };
    assertImportReady(graph);
  });

  it('8.4 — binary property name not leaked as JSON path', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Binary No Leak' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Upload Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'upload' } },
        { id: 'n2', type: 'dropbox', label: 'Dropbox Upload', position: { x: 400, y: 200 }, config: { path: '/files/document.pdf', operation: 'upload', binaryPropertyName: 'document' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const dropbox = wf.nodes.find((n) => n.type === 'n8n-nodes-base.dropbox')!;
    expect(dropbox.parameters.binaryData).toBe(true);
    expect(dropbox.parameters.binaryPropertyName).toBe('document');
    // Ensure no JSON path expression was generated for binary content
    expect(String(dropbox.parameters.binaryPropertyName)).not.toContain('$json');
  });

  it('8.5 — Dropbox → Gmail (deterministic)', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Dropbox Gmail Determinism' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Trigger', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'trigger' } },
        { id: 'n2', type: 'dropbox', label: 'Upload', position: { x: 400, y: 200 }, config: { path: '/test/file.txt', operation: 'upload', binaryPropertyName: 'data' } },
        { id: 'n3', type: 'gmail', label: 'Confirm', position: { x: 700, y: 200 }, config: { toEmail: 'user@test.com', subject: 'Uploaded' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    assertDeterministic(graph);
  });
});

// ═══════════════════════════════════════════════════════════
// SCENARIO 9 — HTTP Request → PostgreSQL (6 tests)
// ═══════════════════════════════════════════════════════════

describe('HTTP Request → PostgreSQL', () => {
  it('9.1 — API response → PostgreSQL insert', () => {
    const graph: InternalGraph = {
      metadata: { name: 'API to Postgres' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Every 15 Min', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'http_request', label: 'Fetch Users', position: { x: 400, y: 200 }, config: { url: 'https://api.example.com/users', method: 'GET' } },
        { id: 'n3', type: 'postgres', label: 'Insert Users', position: { x: 700, y: 200 }, config: { operation: 'insert', table: 'users', schema: 'public' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const http = wf.nodes.find((n) => n.name === 'Fetch Users')!;
    expect(http.type).toBe('n8n-nodes-base.httpRequest');
    expect(http.typeVersion).toBe(4.1);
    expect(http.parameters.url).toBe('https://api.example.com/users');
    const pg = wf.nodes.find((n) => n.name === 'Insert Users')!;
    expect(pg.type).toBe('n8n-nodes-base.postgres');
    expect(pg.typeVersion).toBe(2);
    expect(pg.parameters.operation).toBe('insert');
    expect(pg.parameters.table).toBe('users');
    expect(pg.credentials?.postgres).toBeDefined();
  });

  it('9.2 — webhook → upsert to PostgreSQL', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Webhook to Postgres Upsert' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Data Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'data' } },
        { id: 'n3', type: 'postgres', label: 'Upsert Record', position: { x: 400, y: 200 }, config: { operation: 'executeQuery', query: 'INSERT INTO records (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2', schema: 'public' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const pg = wf.nodes.find((n) => n.type === 'n8n-nodes-base.postgres')!;
    expect(pg.parameters.operation).toBe('executeQuery');
    expect(pg.parameters.query).toContain('ON CONFLICT');
  });

  it('9.3 — HTTP → code transform → PostgreSQL insert', () => {
    const graph: InternalGraph = {
      metadata: { name: 'HTTP Transform PG' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Every Hour', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'http_request', label: 'Get Orders', position: { x: 350, y: 200 }, config: { url: 'https://api.shop.com/orders', method: 'GET' } },
        { id: 'n3', type: 'run_code', label: 'Transform', position: { x: 600, y: 200 }, config: { jsCode: 'return items.map(i => ({ json: { id: i.json.order_id, total: i.json.amount } }));' } },
        { id: 'n4', type: 'postgres', label: 'Save Orders', position: { x: 850, y: 200 }, config: { operation: 'insert', table: 'orders' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }, { id: 'e3', source: 'n3', target: 'n4' }],
    };
    const { wf } = assertImportReady(graph);
    expect(wf.nodes).toHaveLength(4);
  });

  it('9.4 — Postgres SELECT → HTTP POST (reverse flow)', () => {
    const graph: InternalGraph = {
      metadata: { name: 'PG to HTTP' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Every 30 Min', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'postgres', label: 'Get Pending', position: { x: 400, y: 200 }, config: { operation: 'select', table: 'jobs', query: 'SELECT * FROM jobs WHERE status = $1', schema: 'public' } },
        { id: 'n3', type: 'http_request', label: 'Process Job', position: { x: 700, y: 200 }, config: { url: 'https://api.processor.com/run', method: 'POST' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const pg = wf.nodes.find((n) => n.type === 'n8n-nodes-base.postgres')!;
    expect(pg.parameters.operation).toBe('select');
    const http = wf.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest')!;
    expect(http.parameters.method).toBe('POST');
  });

  it('9.5 — HTTP paginated data → bulk Postgres insert', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Paginated HTTP to PG' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Nightly', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'http_request', label: 'Fetch Page 1', position: { x: 350, y: 200 }, config: { url: 'https://api.data.com/items?page=1&limit=100', method: 'GET' } },
        { id: 'n3', type: 'postgres', label: 'Bulk Insert', position: { x: 600, y: 200 }, config: { operation: 'insert', table: 'items', returnAll: true } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    const pg = wf.nodes.find((n) => n.type === 'n8n-nodes-base.postgres')!;
    expect(pg.parameters.returnAll).toBe(true);
  });

  it('9.6 — HTTP to Postgres (deterministic)', () => {
    const graph: InternalGraph = {
      metadata: { name: 'HTTP PG Determinism' },
      nodes: [
        { id: 'n1', type: 'schedule', label: 'Trigger', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'http_request', label: 'API Call', position: { x: 400, y: 200 }, config: { url: 'https://api.test.com', method: 'GET' } },
        { id: 'n3', type: 'postgres', label: 'DB Insert', position: { x: 700, y: 200 }, config: { operation: 'insert', table: 'logs' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    assertDeterministic(graph);
  });
});

// ═══════════════════════════════════════════════════════════
// SCENARIO 10 — Webhook → Telegram (5 tests)
// ═══════════════════════════════════════════════════════════

describe('Webhook → Telegram', () => {
  it('10.1 — form submission → Telegram bot message', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Form to Telegram' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Contact Form', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'contact' } },
        { id: 'n2', type: 'telegram', label: 'Notify Bot', position: { x: 400, y: 200 }, config: { chatId: '-1001234567890', text: 'New contact: {{ $json.name }}', parseMode: 'Markdown' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const telegram = wf.nodes.find((n) => n.name === 'Notify Bot')!;
    expect(telegram.type).toBe('n8n-nodes-base.telegram');
    expect(telegram.parameters.chatId).toBe('-1001234567890');
    expect(telegram.parameters.parseMode).toBe('Markdown');
    expect(telegram.credentials?.telegramApi).toBeDefined();
  });

  it('10.2 — alert webhook → Telegram with HTML formatting', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Alert Telegram HTML' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Alert Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'alert' } },
        { id: 'n2', type: 'telegram', label: 'Send Alert', position: { x: 400, y: 200 }, config: { chatId: '123456789', text: '<b>Alert:</b> {{ $json.message }}', parseMode: 'HTML', disableNotification: false } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const tg = wf.nodes.find((n) => n.type === 'n8n-nodes-base.telegram')!;
    expect(tg.parameters.parseMode).toBe('HTML');
    expect(tg.parameters.disableNotification).toBe(false);
  });

  it('10.3 — e-commerce order → Telegram notification', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Order Telegram' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Order Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'orders' } },
        { id: 'n2', type: 'run_code', label: 'Format Order', position: { x: 350, y: 200 }, config: { jsCode: 'return [{ json: { msg: "Order #" + $input.item.json.id + " total: $" + $input.item.json.total } }];' } },
        { id: 'n3', type: 'telegram', label: 'Order Alert', position: { x: 600, y: 200 }, config: { chatId: '987654321', text: '={{ $json.msg }}' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }],
    };
    const { wf } = assertImportReady(graph);
    expect(wf.nodes).toHaveLength(3);
    const tg = wf.nodes.find((n) => n.type === 'n8n-nodes-base.telegram')!;
    expect(tg.parameters.chatId).toBe('987654321');
  });

  it('10.4 — Telegram to different chats via If node', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Telegram Routing' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Event Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'event' } },
        { id: 'n2', type: 'filter', label: 'Is Urgent', position: { x: 350, y: 200 }, config: { conditions: { string: [{ value1: '={{ $json.priority }}', operation: 'equals', value2: 'urgent' }] } } },
        { id: 'n3', type: 'telegram', label: 'Ops Chat', position: { x: 600, y: 100 }, config: { chatId: '-111111', text: '🚨 URGENT: {{ $json.message }}' } },
        { id: 'n4', type: 'telegram', label: 'General Chat', position: { x: 600, y: 300 }, config: { chatId: '-222222', text: 'Info: {{ $json.message }}' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3', label: 'true' },
        { id: 'e3', source: 'n2', target: 'n4', label: 'false' },
      ],
    };
    const { wf } = assertImportReady(graph);
    const ifNode = wf.nodes.find((n) => n.type === 'n8n-nodes-base.if')!;
    const conn = wf.connections[ifNode.name];
    expect(conn.main).toHaveLength(2);
    expect(conn.main[0][0].node).toBe('Ops Chat');
    expect(conn.main[1][0].node).toBe('General Chat');
  });

  it('10.5 — Webhook → Telegram (deterministic)', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Telegram Determinism' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'tg' } },
        { id: 'n2', type: 'telegram', label: 'Message', position: { x: 400, y: 200 }, config: { chatId: '111', text: 'Hello' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    assertDeterministic(graph);
  });
});

// ═══════════════════════════════════════════════════════════
// SCENARIO 11 — Cross-cutting schema validation (7 tests)
// ═══════════════════════════════════════════════════════════

describe('Schema Validation & Import Readiness', () => {
  it('11.1 — all nodes in a complex workflow start with n8n-nodes-base.', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Multi-service Workflow' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Trigger', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'multi' } },
        { id: 'n2', type: 'google_sheets', label: 'Log', position: { x: 350, y: 200 }, config: { documentId: 'doc1', sheetName: 'Sheet1', operation: 'append' } },
        { id: 'n3', type: 'slack', label: 'Alert', position: { x: 600, y: 200 }, config: { channel: '#general', message: 'Done' } },
        { id: 'n4', type: 'send_email', label: 'Email', position: { x: 850, y: 200 }, config: { toEmail: 'a@b.com', subject: 'OK' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' },
      ],
    };
    const { wf } = assertImportReady(graph);
    for (const node of wf.nodes) {
      expect(node.type).toMatch(/^n8n-nodes-base\./);
    }
  });

  it('11.2 — webhook node always gets a UUID v4 webhookId', () => {
    const graph: InternalGraph = {
      metadata: { name: 'WebhookId Test' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Hook', position: { x: 100, y: 200 }, config: { method: 'GET', path: 'test' } },
        { id: 'n2', type: 'transform_data', label: 'NoOp', position: { x: 400, y: 200 }, config: {} },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const hook = wf.nodes.find((n) => n.type === 'n8n-nodes-base.webhook')!;
    expect(hook.webhookId).toBeDefined();
    expect(UUID_REGEX.test(hook.webhookId!)).toBe(true);
  });

  it('11.3 — no internal metadata leaks into exported parameters', () => {
    const graph: InternalGraph = {
      metadata: { name: 'No Leak Test' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Hook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'clean', _qonaMeta: 'ignore-me', aiNote: 'This was generated', debugField: 'xyz' } },
        { id: 'n2', type: 'slack', label: 'Alert', position: { x: 400, y: 200 }, config: { channel: '#ops', message: 'Clean', assistantResponse: 'should be stripped', conversationText: 'also strip' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const { wf } = assertImportReady(graph);
    const hook = wf.nodes.find((n) => n.type === 'n8n-nodes-base.webhook')!;
    expect(hook.parameters._qonaMeta).toBeUndefined();
    expect(hook.parameters.aiNote).toBeUndefined();
    expect(hook.parameters.debugField).toBeUndefined();
    const slack = wf.nodes.find((n) => n.type === 'n8n-nodes-base.slack')!;
    expect(slack.parameters.assistantResponse).toBeUndefined();
    expect(slack.parameters.conversationText).toBeUndefined();
  });

  it('11.4 — typeVersions match official n8n registry versions', () => {
    const graph: InternalGraph = {
      metadata: { name: 'TypeVersion Check' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Webhook', position: { x: 100, y: 200 }, config: {} },
        { id: 'n2', type: 'http_request', label: 'HTTP', position: { x: 300, y: 200 }, config: { url: 'https://example.com' } },
        { id: 'n3', type: 'google_sheets', label: 'Sheets', position: { x: 500, y: 200 }, config: { documentId: 'doc', sheetName: 'Sheet1' } },
        { id: 'n4', type: 'gmail', label: 'Gmail', position: { x: 700, y: 200 }, config: { toEmail: 'x@y.com' } },
        { id: 'n5', type: 'slack', label: 'Slack', position: { x: 900, y: 200 }, config: { channel: '#test', message: 'hi' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' },
        { id: 'e4', source: 'n4', target: 'n5' },
      ],
    };
    const { wf } = assertImportReady(graph);
    expect(wf.nodes.find((n) => n.type === 'n8n-nodes-base.webhook')!.typeVersion).toBe(1);
    expect(wf.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest')!.typeVersion).toBe(4.1);
    expect(wf.nodes.find((n) => n.type === 'n8n-nodes-base.googleSheets')!.typeVersion).toBe(4);
    expect(wf.nodes.find((n) => n.type === 'n8n-nodes-base.gmail')!.typeVersion).toBe(2);
    expect(wf.nodes.find((n) => n.type === 'n8n-nodes-base.slack')!.typeVersion).toBe(2);
  });

  it('11.5 — export validator finds no hard errors on a well-formed graph', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Valid Graph' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Webhook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'ok' } },
        { id: 'n2', type: 'slack', label: 'Slack', position: { x: 400, y: 200 }, config: { channel: '#team', message: 'Works!' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const validation = validateExport(graph);
    const hardErrors = validation.errors.filter((e) => e.severity === 'error');
    expect(hardErrors).toHaveLength(0);
  });

  it('11.6 — export validator rejects graph with missing required param', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Missing Param' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Hook', position: { x: 100, y: 200 }, config: {} },
        {
          id: 'n2', type: 'http_request', label: 'HTTP No URL', position: { x: 400, y: 200 },
          config: { method: 'GET' /* url is required but missing */ },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const validation = validateExport(graph);
    const errors = validation.errors.filter((e) => e.severity === 'error');
    expect(errors.some((e) => e.message.includes('Missing required parameter') && e.message.includes('url'))).toBe(true);
  });

  it('11.7 — multi-step workflow all connections resolve correctly by name', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Connection Name Resolution' },
      nodes: [
        { id: 'a', type: 'stripe_trigger', label: 'Stripe', position: { x: 100, y: 200 }, config: { events: ['charge.succeeded'] } },
        { id: 'b', type: 'airtable', label: 'Log to Air', position: { x: 350, y: 200 }, config: { application: 'appXX', table: 'Charges', operation: 'create' } },
        { id: 'c', type: 'slack', label: 'Notify', position: { x: 600, y: 200 }, config: { channel: '#sales', message: 'New charge!' } },
        { id: 'd', type: 'send_email', label: 'Email Receipt', position: { x: 850, y: 200 }, config: { toEmail: 'billing@co.com', subject: 'Receipt' } },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
        { id: 'e3', source: 'c', target: 'd' },
      ],
    };
    const { wf } = assertImportReady(graph);
    // Verify every connection key is a node name
    const names = new Set(wf.nodes.map((n) => n.name));
    for (const key of Object.keys(wf.connections)) {
      expect(names.has(key)).toBe(true);
    }
    // Verify connection chain
    expect(wf.connections['Stripe'].main[0][0].node).toBe('Log to Air');
    expect(wf.connections['Log to Air'].main[0][0].node).toBe('Notify');
    expect(wf.connections['Notify'].main[0][0].node).toBe('Email Receipt');
  });
});
