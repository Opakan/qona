import { describe, it, expect } from 'vitest';
import { mockDataEngine } from '../src/services/execution-simulator/mock-engine';

describe('MockDataEngine', () => {
  it('generates realistic Webhook payload', () => {
    const output = mockDataEngine.generateOutput('webhook');
    expect(output.text).toBe('OpenAI released GPT-5 today.');
    expect(output.body).toBeDefined();
    expect(output.headers).toBeDefined();
  });

  it('generates realistic HTTP Request response', () => {
    const output = mockDataEngine.generateOutput('httpRequest', { url: 'https://api.example.com' });
    expect(output.statusCode).toBe(200);
    expect(output.data).toBeDefined();
  });

  it('generates realistic OpenAI response', () => {
    const output = mockDataEngine.generateOutput('openAi', {}, { text: 'OpenAI released GPT-5.' });
    expect(output.summary).toBe('OpenAI released GPT-5.');
    expect(output.message).toBeDefined();
    expect(output.usage).toBeDefined();
  });

  it('generates realistic Telegram sent message metadata', () => {
    const output = mockDataEngine.generateOutput('telegram', { chatId: '@mychannel' }, { summary: 'Alert!' });
    expect(output.messageSent).toBe(true);
    expect(output.status).toBe('DELIVERED');
    expect(output.messageId).toBeDefined();
  });

  it('generates realistic Slack sent message metadata', () => {
    const output = mockDataEngine.generateOutput('slack', { channel: '#general' });
    expect(output.ok).toBe(true);
    expect(output.ts).toBeDefined();
    expect(output.message).toBeDefined();
  });

  it('generates realistic Google Sheets updated metadata', () => {
    const output = mockDataEngine.generateOutput('googleSheets', { documentId: 'sheet_123' });
    expect(output.success).toBe(true);
    expect(output.updatedRange).toBeDefined();
  });

  it('generates realistic Google Drive uploaded file metadata', () => {
    const output = mockDataEngine.generateOutput('googleDrive', { fileName: 'Report.pdf' });
    expect(output.id).toBeDefined();
    expect(output.mimeType).toBe('application/pdf');
    expect(output.webViewLink).toContain('drive.google.com');
  });

  it('generates realistic Discord webhook metadata', () => {
    const output = mockDataEngine.generateOutput('discord', { content: 'Alert!' });
    expect(output.id).toBeDefined();
    expect(output.author).toBeDefined();
  });

  it('generates realistic Notion page metadata', () => {
    const output = mockDataEngine.generateOutput('notion', { title: 'Project Roadmap' });
    expect(output.object).toBe('page');
    expect(output.url).toContain('notion.so');
  });
});
