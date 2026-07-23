/**
 * Qonace Mock Data Engine
 * Generates realistic, believable, and deterministic mock payloads for workflow nodes
 * without making any external network or API calls.
 */

export type MockSimulatorHandler = (
  params: Record<string, unknown>,
  inputData: Record<string, unknown>
) => Record<string, unknown>;

export class MockDataEngine {
  private handlers = new Map<string, MockSimulatorHandler>();

  constructor() {
    this.registerDefaults();
  }

  public register(nodeType: string, handler: MockSimulatorHandler): void {
    const key = this.normalizeType(nodeType);
    this.handlers.set(key, handler);
  }

  public generateOutput(
    nodeType: string,
    params: Record<string, unknown> = {},
    inputData: Record<string, unknown> = {}
  ): Record<string, unknown> {
    const key = this.normalizeType(nodeType);
    const handler = this.handlers.get(key);

    if (handler) {
      return handler(params, inputData);
    }

    // Fallback search by substring matching
    for (const [registeredKey, fn] of this.handlers.entries()) {
      if (key.includes(registeredKey) || registeredKey.includes(key)) {
        return fn(params, inputData);
      }
    }

    // Generic fallback for unregistered nodes
    return {
      success: true,
      nodeType,
      processedAt: new Date().toISOString(),
      mockData: { message: `Simulated execution payload for ${nodeType}` },
    };
  }

  private normalizeType(type: string): string {
    return type
      .toLowerCase()
      .replace(/^n8n-nodes-base\./, '')
      .replace(/_/g, '')
      .replace(/-/g, '');
  }

  private registerDefaults(): void {
    // 1. Webhook
    this.register('webhook', (_params, inputData) => {
      const incomingText = String((inputData.body as any)?.text || inputData.text || 'OpenAI released GPT-5 today.');
      return {
        text: incomingText,
        body: {
          id: 'usr_mock_1001',
          text: incomingText,
          email: 'alex.smith@example.com',
          name: 'Alex Smith',
          status: 'active',
          event: 'user.signup',
        },
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Qonace-Webhook-Simulator/1.0',
        },
        query: { source: 'landing_page' },
      };
    });

    // 1b. Stripe Trigger
    this.register('stripetrigger', () => {
      return {
        customer: 'John Doe',
        amount: 150,
        currency: 'usd',
        event: 'payment_intent.succeeded',
        id: 'pi_3MtwBwLkdIwHu7ix0rW0K010',
      };
    });

    // 1c. Email Received Trigger
    this.register('emailreceived', () => {
      return {
        subject: 'Invoice',
        attachment: 'invoice.pdf',
        from: 'billing@vendor.com',
        text: 'Please find attached invoice PDF.',
      };
    });

    // 1d. RSS Feed Read Trigger
    this.register('rssfeedread', () => {
      return {
        title: 'Latest AI News',
        link: 'https://news.ycombinator.com',
        pubDate: new Date().toUTCString(),
        contentSnippet: 'OpenAI announces new AI capability milestones.',
      };
    });

    // 2. HTTP Request
    this.register('httprequest', (params) => {
      return {
        statusCode: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json', 'cache-control': 'no-cache' },
        data: {
          success: true,
          url: String(params.url || 'https://api.example.com/data'),
          result: { id: 101, status: 'processed', count: 42 },
        },
      };
    });

    // 3. OpenAI
    this.register('openai', (params, inputData) => {
      const inputText = String(inputData.text || (inputData.body as any)?.text || JSON.stringify(inputData));
      const summaryText = inputText || 'OpenAI released GPT-5 today.';

      return {
        summary: summaryText,
        text: `• Key Takeaway 1: ${summaryText}\n• Key Takeaway 2: Analysis completed with 99.4% confidence.\n• Key Takeaway 3: Ready for downstream publishing.`,
        message: {
          role: 'assistant',
          content: `🤖 AI Executive Summary: ${summaryText}`,
        },
        usage: { prompt_tokens: 45, completion_tokens: 32, total_tokens: 77 },
        model: String(params.model || 'gpt-4o-mini'),
      };
    });

    // 4. Telegram
    this.register('telegram', (params, inputData) => {
      const textToSend = String(params.text || (inputData.message as any)?.content || inputData.summary || inputData.text || 'Simulated Telegram Alert');
      return {
        messageSent: true,
        messageId: Math.floor(Math.random() * 89999 + 10000),
        chatId: String(params.chatId || '@mychannel'),
        status: 'DELIVERED',
        text: textToSend,
        sentAt: new Date().toISOString(),
      };
    });

    // 5. Slack
    this.register('slack', (params, inputData) => {
      const textToSend = String(params.message || inputData.text || inputData.summary || 'Simulated Slack message');
      return {
        ok: true,
        ts: `${(Date.now() / 1000).toFixed(6)}`,
        channel: String(params.channel || '#general'),
        message: {
          text: textToSend,
          user: 'U_QONACE_BOT',
          bot_id: 'B_123456',
        },
      };
    });

    // 6. Discord
    this.register('discord', (params, inputData) => {
      const textToSend = String(params.content || inputData.text || inputData.summary || 'Simulated Discord Notification');
      return {
        id: `disc_msg_${Date.now()}`,
        channel_id: '987654321012345678',
        content: textToSend,
        author: { id: 'bot_qonace', username: 'QonaceBot', discriminator: '0001' },
        timestamp: new Date().toISOString(),
      };
    });

    // 7. Google Sheets
    this.register('googlesheets', (params) => {
      return {
        success: true,
        spreadsheetId: String(params.documentId || 'sheet_mock_9988'),
        updatedRange: 'Sheet1!A2:E2',
        updatedRows: 1,
        updatedColumns: 5,
        row: {
          'Row ID': '2',
          Status: 'APPENDED',
          Timestamp: new Date().toISOString(),
        },
      };
    });

    // 8. Google Drive
    this.register('googledrive', (params) => {
      return {
        id: `file_drive_${Math.floor(Math.random() * 8999 + 1000)}`,
        name: String(params.fileName || 'Qonace_Export_Report.pdf'),
        mimeType: 'application/pdf',
        size: 1048576,
        parents: [String(params.folderId || 'root')],
        webViewLink: 'https://drive.google.com/file/d/mock_file_id/view',
        webContentLink: 'https://drive.google.com/uc?id=mock_file_id',
        createdTime: new Date().toISOString(),
      };
    });

    // 9. Notion
    this.register('notion', (params, inputData) => {
      const titleText = String(params.title || inputData.text || inputData.summary || 'New Automation Entry');
      return {
        object: 'page',
        id: `notion_page_${Date.now()}`,
        created_time: new Date().toISOString(),
        url: `https://notion.so/workspace/notion_page_${Date.now()}`,
        properties: {
          Title: { title: [{ text: { content: titleText } }] },
          Status: { select: { name: 'Completed' } },
        },
      };
    });

    // 10. Supabase
    this.register('supabase', (params) => {
      return {
        status: 201,
        statusText: 'Created',
        table: String(params.table || 'records'),
        data: [{ id: 'rec_supa_5544', created_at: new Date().toISOString(), status: 'active' }],
      };
    });

    // 11. PostgreSQL
    this.register('postgres', (params) => {
      return {
        command: 'SELECT',
        rowCount: 2,
        rows: [
          { id: 1, name: 'System Database Health Check', status: 'HEALTHY', latency_ms: 12 },
          { id: 2, name: 'API Gateway Service', status: 'HEALTHY', latency_ms: 8 },
        ],
        query: String(params.query || 'SELECT * FROM health_check;'),
      };
    });
  }
}

export const mockDataEngine = new MockDataEngine();
