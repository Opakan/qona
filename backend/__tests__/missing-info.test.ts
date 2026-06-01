import { describe, it, expect } from 'vitest';
import { detectMissingInfo } from '../src/services/missing-info-detector.js';

describe('detectMissingInfo', () => {
  it('marks complete when all required fields are present', () => {
    const result = detectMissingInfo({
      trigger: { type: 'webhook', label: 'Webhook', config: { method: 'POST', path: '/hooks' } },
      actions: [{ type: 'send_email', label: 'Email', order: 1, config: { to: 'x@y.com', subject: 'Hello' } }],
      integrations: [{ name: 'Gmail', type: 'email', purpose: 'Sending emails' }],
      confidence: 0.9,
      missingDetails: [],
    });
    expect(result.complete).toBe(true);
    expect(result.totalMissing).toBe(0);
  });

  it('detects missing webhook method and path', () => {
    const result = detectMissingInfo({
      trigger: { type: 'webhook', label: 'Webhook' },
      actions: [{ type: 'send_email', label: 'Email', order: 1, config: { to: 'x@y.com', subject: 'Hi' } }],
      integrations: [],
      confidence: 0.8,
      missingDetails: [],
    });
    const triggerQs = result.questions.filter((q) => q.affects === 'trigger');
    expect(triggerQs.length).toBeGreaterThanOrEqual(1);
    expect(triggerQs.some((q) => q.field.includes('method'))).toBe(true);
  });

  it('detects missing cron expression', () => {
    const result = detectMissingInfo({
      trigger: { type: 'cron', label: 'Scheduler' },
      actions: [{ type: 'http_request', label: 'API', order: 1, config: { url: 'https://api.example.com', method: 'GET' } }],
      integrations: [],
      confidence: 0.8,
      missingDetails: [],
    });
    expect(result.questions.some((q) => q.field.includes('cronExpression'))).toBe(true);
  });

  it('detects missing email fields', () => {
    const result = detectMissingInfo({
      trigger: { type: 'webhook', label: 'W', config: { method: 'POST', path: '/hooks' } },
      actions: [{ type: 'send_email', label: 'E', order: 1 }],
      integrations: [],
      confidence: 0.7,
      missingDetails: [],
    });
    expect(result.questions.some((q) => q.field.includes('to'))).toBe(true);
    expect(result.questions.some((q) => q.field.includes('subject'))).toBe(true);
  });

  it('detects missing http_request url and method', () => {
    const result = detectMissingInfo({
      trigger: { type: 'webhook', label: 'W', config: { method: 'POST', path: '/h' } },
      actions: [{ type: 'http_request', label: 'API', order: 1 }],
      integrations: [],
      confidence: 0.8,
      missingDetails: [],
    });
    expect(result.questions.some((q) => q.field.includes('url'))).toBe(true);
    expect(result.questions.some((q) => q.field.includes('method'))).toBe(true);
  });

  it('detects missing integration when actions require one', () => {
    const result = detectMissingInfo({
      trigger: { type: 'webhook', label: 'W', config: { method: 'POST', path: '/h' } },
      actions: [
        { type: 'send_email', label: 'E', order: 1, config: { to: 'x@y.com', subject: 'Hi' } },
        { type: 'google_sheets', label: 'Sheet', order: 2 },
      ],
      integrations: [],
      confidence: 0.9,
      missingDetails: [],
    });
    expect(result.questions.some((q) => q.affects === 'integration')).toBe(true);
  });

  it('skips integration check when already present', () => {
    const result = detectMissingInfo({
      trigger: { type: 'webhook', label: 'W', config: { method: 'POST', path: '/h' } },
      actions: [
        { type: 'send_email', label: 'E', order: 1, config: { to: 'x@y.com', subject: 'Hi' } },
      ],
      integrations: [{ name: 'Gmail', type: 'email', purpose: 'Sending emails' }],
      confidence: 0.9,
      missingDetails: [],
    });
    expect(result.questions.filter((q) => q.affects === 'integration').length).toBe(0);
  });

  it('returns options in questions where available', () => {
    const result = detectMissingInfo({
      trigger: { type: 'webhook', label: 'W' },
      actions: [{ type: 'send_email', label: 'E', order: 1, config: { to: 'x@y.com', subject: 'Hi' } }],
      integrations: [],
      confidence: 0.9,
      missingDetails: [],
    });
    const methodQ = result.questions.find((q) => q.field.includes('method'));
    expect(methodQ?.options).toBeDefined();
    expect(methodQ?.options).toContain('POST');
  });

  it('tracks analysis counts', () => {
    const result = detectMissingInfo({
      trigger: { type: 'webhook', label: 'W', config: { method: 'POST', path: '/h' } },
      actions: [
        { type: 'send_email', label: 'E', order: 1, config: { to: 'x@y.com', subject: 'Hi' } },
        { type: 'http_request', label: 'API', order: 2, config: { url: 'https://a.com', method: 'GET' } },
      ],
      integrations: [{ name: 'Gmail', type: 'email', purpose: 'Email' }],
      confidence: 0.95,
      missingDetails: [],
    });
    expect(result.analysedTrigger).toBe(true);
    expect(result.analysedActions).toBe(2);
    expect(result.analysedIntegrations).toBe(1);
    expect(result.complete).toBe(true);
  });
});
