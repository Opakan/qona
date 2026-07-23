import { describe, it, expect } from 'vitest';
import { templateService } from '../src/services/template.service';

describe('TemplateService', () => {
  it('loads ready-made templates correctly', () => {
    const templates = templateService.getAllTemplates();
    expect(templates.length).toBeGreaterThan(0);
  });

  it('retrieves featured templates', () => {
    const featured = templateService.getFeaturedTemplates();
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.every((t) => t.featured)).toBe(true);
  });

  it('searches templates by keyword or tag', () => {
    const results = templateService.searchTemplates('telegram');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((t) => t.name.toLowerCase().includes('telegram') || t.tags.includes('Telegram'))).toBe(true);
  });

  it('clones a template into internal graph format with custom inputs', () => {
    const cloned = templateService.cloneTemplate('tpl_sheets_gmail', {
      node_trigger_documentId: '1BxiMVs0XRA5nFMdKbB_test',
      node_action_to: 'test@example.com',
    });

    expect(cloned).toBeDefined();
    expect(cloned?.graph.nodes.length).toBe(2);
    const triggerNode = cloned?.graph.nodes.find((n) => n.id === 'node_trigger');
    expect(triggerNode?.params.documentId).toBe('1BxiMVs0XRA5nFMdKbB_test');
  });
});
