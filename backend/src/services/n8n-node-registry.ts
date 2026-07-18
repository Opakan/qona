export interface N8nRegistryEntry {
  n8nType: string;
  category: 'trigger' | 'action';
  displayName: string;
  typeVersion: number;
  requiredParams: string[];
  optionalParams: string[];
  defaults: Record<string, unknown>;
  credentialRequired?: {
    name: string;
    type: string;
  };
  mapConfig?: (config: Record<string, unknown>) => Record<string, unknown>;
}

export const n8nRegistry: Record<string, N8nRegistryEntry> = {
  'n8n-nodes-base.webhook': {
    n8nType: 'n8n-nodes-base.webhook',
    category: 'trigger',
    displayName: 'Webhook Trigger',
    typeVersion: 1,
    requiredParams: [],
    optionalParams: ['httpMethod', 'path', 'responseMode', 'authentication', 'options'],
    defaults: {
      httpMethod: 'POST',
      path: 'webhook',
      responseMode: 'lastNode',
      responseData: 'allEntries',
      authentication: 'none',
      options: {},
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.method) mapped.httpMethod = config.method;
      if (config.path) mapped.path = config.path;
      if (config.responseMode) mapped.responseMode = config.responseMode;
      if (config.authentication) mapped.authentication = config.authentication;
      return mapped;
    },
  },
  'n8n-nodes-base.cron': {
    n8nType: 'n8n-nodes-base.cron',
    category: 'trigger',
    displayName: 'Cron Trigger',
    typeVersion: 1,
    requiredParams: ['triggerTimes'],
    optionalParams: [],
    defaults: {
      triggerTimes: {
        item: [{ mode: 'everyMinute', hour: 9, minute: 0 }],
      },
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.cronExpression) {
        // Basic parser/default if cron expression is provided
        mapped.triggerTimes = {
          item: [{ mode: 'custom', cronExpression: config.cronExpression }],
        };
      }
      return mapped;
    },
  },
  'n8n-nodes-base.manualTrigger': {
    n8nType: 'n8n-nodes-base.manualTrigger',
    category: 'trigger',
    displayName: 'Manual Trigger',
    typeVersion: 1,
    requiredParams: [],
    optionalParams: [],
    defaults: {},
  },
  'n8n-nodes-base.scheduleTrigger': {
    n8nType: 'n8n-nodes-base.scheduleTrigger',
    category: 'trigger',
    displayName: 'Schedule Trigger',
    typeVersion: 1,
    requiredParams: ['rule'],
    optionalParams: [],
    defaults: {
      rule: {
        interval: [{ field: 'hours', value: 1 }],
      },
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.cronExpression) {
        mapped.rule = {
          interval: [],
          expression: config.cronExpression,
        };
      }
      return mapped;
    },
  },
  'n8n-nodes-base.httpRequest': {
    n8nType: 'n8n-nodes-base.httpRequest',
    category: 'action',
    displayName: 'HTTP Request',
    typeVersion: 4.1,
    requiredParams: ['url'],
    optionalParams: ['method', 'authentication', 'headers', 'body', 'queryParameters', 'responseFormat', 'options'],
    defaults: {
      method: 'GET',
      options: {},
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.url) mapped.url = config.url;
      if (config.method) mapped.method = config.method;
      if (config.authentication) {
        mapped.authentication = config.authentication === 'none' ? 'none' : 'genericCredentialType';
      }
      if (config.headers) mapped.headers = config.headers;
      if (config.body) mapped.body = config.body;
      if (config.queryParameters) mapped.queryParameters = config.queryParameters;
      if (config.responseFormat) mapped.responseFormat = config.responseFormat;
      return mapped;
    },
  },
  'n8n-nodes-base.googleSheets': {
    n8nType: 'n8n-nodes-base.googleSheets',
    category: 'action',
    displayName: 'Google Sheets',
    typeVersion: 4,
    requiredParams: ['documentId', 'sheetName'],
    optionalParams: ['operation', 'columns', 'options', 'dataMode'],
    defaults: {
      operation: 'appendRow',
      options: {},
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.spreadsheetId) mapped.documentId = config.spreadsheetId;
      if (config.sheetName) mapped.sheetName = config.sheetName;
      if (config.operation) {
        const op = String(config.operation).toLowerCase();
        if (op === 'append') mapped.operation = 'appendRow';
        else if (op === 'read') mapped.operation = 'readRows';
        else if (op === 'update') mapped.operation = 'updateRow';
        else if (op === 'clear') mapped.operation = 'clear';
        else mapped.operation = config.operation;
      }
      if (config.dataMode) mapped.dataMode = config.dataMode;
      return mapped;
    },
  },
  'n8n-nodes-base.slack': {
    n8nType: 'n8n-nodes-base.slack',
    category: 'action',
    displayName: 'Slack',
    typeVersion: 2,
    requiredParams: ['channel'],
    optionalParams: ['message', 'blocks', 'username', 'threadTs', 'select', 'options', 'binaryData', 'binaryPropertyName', 'resource', 'operation'],
    defaults: {
      select: 'channel',
      options: {},
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.channelId) mapped.channel = config.channelId;
      if (config.channel) mapped.channel = config.channel;
      if (config.text) mapped.message = config.text;
      if (config.message) mapped.message = config.message;
      if (config.blocks) mapped.blocks = config.blocks;
      if (config.username) mapped.username = config.username;
      if (config.threadTs) mapped.threadTs = config.threadTs;
      if (config.resource) mapped.resource = config.resource;
      if (config.operation) mapped.operation = config.operation;
      return mapped;
    },
  },
  'n8n-nodes-base.gmail': {
    n8nType: 'n8n-nodes-base.gmail',
    category: 'action',
    displayName: 'Gmail',
    typeVersion: 2,
    requiredParams: ['toEmail'],
    optionalParams: ['subject', 'html', 'cc', 'bcc', 'fromName', 'attachments'],
    defaults: {
      resource: 'message',
      operation: 'send',
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.to) mapped.toEmail = config.to;
      if (config.toEmail) mapped.toEmail = config.toEmail;
      if (config.subject) mapped.subject = config.subject;
      if (config.body) mapped.html = config.body;
      if (config.html) mapped.html = config.html;
      if (config.cc) mapped.cc = config.cc;
      if (config.bcc) mapped.bcc = config.bcc;
      if (config.fromName) mapped.fromName = config.fromName;
      if (config.attachments) mapped.attachments = config.attachments;
      return mapped;
    },
  },
  'n8n-nodes-base.emailSend': {
    n8nType: 'n8n-nodes-base.emailSend',
    category: 'action',
    displayName: 'Send Email (SMTP)',
    typeVersion: 1,
    requiredParams: ['toEmail'],
    optionalParams: ['subject', 'html', 'cc', 'bcc', 'fromEmail', 'attachments'],
    defaults: {
      fromEmail: 'qona@notifications.ai',
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.to) mapped.toEmail = config.to;
      if (config.toEmail) mapped.toEmail = config.toEmail;
      if (config.subject) mapped.subject = config.subject;
      if (config.body) mapped.html = config.body;
      if (config.html) mapped.html = config.html;
      if (config.cc) mapped.cc = config.cc;
      if (config.bcc) mapped.bcc = config.bcc;
      if (config.fromEmail) mapped.fromEmail = config.fromEmail;
      if (config.attachments) mapped.attachments = config.attachments;
      return mapped;
    },
  },
  'n8n-nodes-base.supabase': {
    n8nType: 'n8n-nodes-base.supabase',
    category: 'action',
    displayName: 'Supabase',
    typeVersion: 1,
    requiredParams: ['table'],
    optionalParams: ['operation', 'filters', 'columns', 'limit', 'orderBy'],
    defaults: {
      operation: 'rowCreate',
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.tableName) mapped.table = config.tableName;
      if (config.table) mapped.table = config.table;
      if (config.operation) {
        const op = String(config.operation).toLowerCase();
        if (op === 'select') mapped.operation = 'rowGet';
        else if (op === 'insert') mapped.operation = 'rowCreate';
        else if (op === 'update') mapped.operation = 'rowUpdate';
        else if (op === 'delete') mapped.operation = 'rowDelete';
        else mapped.operation = config.operation;
      }
      if (config.filters) mapped.filters = config.filters;
      if (config.columns) mapped.columns = config.columns;
      if (config.limit) mapped.limit = config.limit;
      if (config.orderBy) mapped.orderBy = config.orderBy;
      return mapped;
    },
  },
  'n8n-nodes-base.telegram': {
    n8nType: 'n8n-nodes-base.telegram',
    category: 'action',
    displayName: 'Telegram',
    typeVersion: 1,
    requiredParams: ['chatId'],
    optionalParams: ['text', 'photo', 'parseMode', 'disableNotification', 'operation', 'resource'],
    defaults: {
      resource: 'message',
      operation: 'sendMessage',
      parseMode: 'Markdown',
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.chatId) mapped.chatId = config.chatId;
      if (config.text) mapped.text = config.text;
      if (config.photo) {
        mapped.photo = config.photo;
        mapped.operation = 'sendPhoto';
      }
      if (config.parseMode) mapped.parseMode = config.parseMode;
      if (config.disableNotification) mapped.disableNotification = config.disableNotification;
      return mapped;
    },
  },
  'n8n-nodes-base.wait': {
    n8nType: 'n8n-nodes-base.wait',
    category: 'action',
    displayName: 'Wait/Delay',
    typeVersion: 1,
    requiredParams: ['amount', 'unit'],
    optionalParams: [],
    defaults: {
      amount: 1,
      unit: 'minutes',
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.amount) mapped.amount = config.amount;
      if (config.unit) mapped.unit = config.unit;
      if (config.durationMs) {
        const ms = Number(config.durationMs);
        if (ms >= 60000) {
          mapped.amount = Math.round(ms / 60000);
          mapped.unit = 'minutes';
        } else {
          mapped.amount = Math.round(ms / 1000);
          mapped.unit = 'seconds';
        }
      }
      return mapped;
    },
  },
  'n8n-nodes-base.if': {
    n8nType: 'n8n-nodes-base.if',
    category: 'action',
    displayName: 'If Condition',
    typeVersion: 1,
    requiredParams: ['conditions'],
    optionalParams: [],
    defaults: {
      conditions: {
        number: [],
        string: [],
      },
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.conditions) mapped.conditions = config.conditions;
      if (config.expression) {
        // Fallback simple string mapping for filter expressions
        mapped.conditions = {
          string: [
            {
              value1: config.expression,
              operation: 'notEmpty',
            },
          ],
        };
      }
      return mapped;
    },
  },
  'n8n-nodes-base.code': {
    n8nType: 'n8n-nodes-base.code',
    category: 'action',
    displayName: 'Code Execution',
    typeVersion: 1,
    requiredParams: ['jsCode'],
    optionalParams: [],
    defaults: {
      mode: 'runOnceForAllItems',
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.code) mapped.jsCode = config.code;
      if (config.jsCode) mapped.jsCode = config.jsCode;
      return mapped;
    },
  },
  'n8n-nodes-base.googleDrive': {
    n8nType: 'n8n-nodes-base.googleDrive',
    category: 'action',
    displayName: 'Google Drive',
    typeVersion: 2,
    requiredParams: ['operation', 'resource'],
    optionalParams: ['fileContent', 'name', 'parents', 'binaryData', 'binaryPropertyName'],
    defaults: {
      resource: 'file',
      operation: 'upload',
      binaryData: true,
      binaryPropertyName: 'attachment_0',
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.operation) mapped.operation = config.operation;
      if (config.resource) mapped.resource = config.resource;
      if (config.name) mapped.name = config.name;
      if (config.parents) mapped.parents = config.parents;
      return mapped;
    },
  },
  'n8n-nodes-base.noOp': {
    n8nType: 'n8n-nodes-base.noOp',
    category: 'action',
    displayName: 'No Operation',
    typeVersion: 1,
    requiredParams: [],
    optionalParams: [],
    defaults: {},
  },
  'n8n-nodes-base.dropbox': {
    n8nType: 'n8n-nodes-base.dropbox',
    category: 'action',
    displayName: 'Dropbox',
    typeVersion: 1,
    requiredParams: ['path'],
    optionalParams: ['operation', 'resource', 'binaryData', 'binaryPropertyName', 'fileContent'],
    defaults: {
      resource: 'file',
      operation: 'upload',
      binaryData: true,
      binaryPropertyName: 'data',
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.path) mapped.path = config.path;
      if (config.operation) mapped.operation = config.operation;
      if (config.resource) mapped.resource = config.resource;
      return mapped;
    },
  },
  'n8n-nodes-base.oneDrive': {
    n8nType: 'n8n-nodes-base.oneDrive',
    category: 'action',
    displayName: 'Microsoft OneDrive',
    typeVersion: 1,
    requiredParams: [],
    optionalParams: ['operation', 'resource', 'binaryData', 'binaryPropertyName', 'fileContent', 'path', 'fileId'],
    defaults: {
      resource: 'file',
      operation: 'upload',
      binaryData: true,
      binaryPropertyName: 'data',
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.path) mapped.path = config.path;
      if (config.fileId) mapped.fileId = config.fileId;
      if (config.operation) mapped.operation = config.operation;
      if (config.resource) mapped.resource = config.resource;
      return mapped;
    },
  },
  'n8n-nodes-base.s3': {
    n8nType: 'n8n-nodes-base.s3',
    category: 'action',
    displayName: 'AWS S3',
    typeVersion: 1,
    requiredParams: ['bucketName', 'key'],
    optionalParams: ['operation', 'binaryData', 'binaryPropertyName', 'fileContent'],
    defaults: {
      operation: 'upload',
      binaryData: true,
      binaryPropertyName: 'data',
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.bucketName) mapped.bucketName = config.bucketName;
      if (config.key) mapped.key = config.key;
      if (config.operation) mapped.operation = config.operation;
      return mapped;
    },
  },
  'n8n-nodes-base.ftp': {
    n8nType: 'n8n-nodes-base.ftp',
    category: 'action',
    displayName: 'FTP',
    typeVersion: 1,
    requiredParams: ['path'],
    optionalParams: ['operation', 'binaryData', 'binaryPropertyName', 'fileContent'],
    defaults: {
      operation: 'upload',
      binaryData: true,
      binaryPropertyName: 'data',
    },
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.path) mapped.path = config.path;
      if (config.operation) mapped.operation = config.operation;
      return mapped;
    },
  },
};

export function lookupRegistry(internalType: string): N8nRegistryEntry | undefined {
  // First check direct n8nType match
  if (n8nRegistry[internalType]) return n8nRegistry[internalType];

  // Map internal types to n8nTypes
  const typeMap: Record<string, string> = {
    webhook: 'n8n-nodes-base.webhook',
    schedule: 'n8n-nodes-base.scheduleTrigger',
    cron: 'n8n-nodes-base.cron',
    manual: 'n8n-nodes-base.manualTrigger',
    form_submission: 'n8n-nodes-base.webhook',
    email_received: 'n8n-nodes-base.emailSend', // fallback or IMAP
    payment_received: 'n8n-nodes-base.webhook',
    send_email: 'n8n-nodes-base.emailSend',
    gmail: 'n8n-nodes-base.gmail',
    http_request: 'n8n-nodes-base.httpRequest',
    transform_data: 'n8n-nodes-base.noOp', // fallback NoOp or Set
    filter: 'n8n-nodes-base.if',
    delay: 'n8n-nodes-base.wait',
    create_record: 'n8n-nodes-base.googleSheets',
    update_record: 'n8n-nodes-base.googleSheets',
    send_notification: 'n8n-nodes-base.slack',
    run_code: 'n8n-nodes-base.code',
    google_sheets: 'n8n-nodes-base.googleSheets',
    slack: 'n8n-nodes-base.slack',
    telegram: 'n8n-nodes-base.telegram',
    supabase: 'n8n-nodes-base.supabase',
    google_drive: 'n8n-nodes-base.googleDrive',
    dropbox: 'n8n-nodes-base.dropbox',
    one_drive: 'n8n-nodes-base.oneDrive',
    s3: 'n8n-nodes-base.s3',
    ftp: 'n8n-nodes-base.ftp',
  };

  const n8nType = typeMap[internalType];
  if (n8nType) return n8nRegistry[n8nType];

  return undefined;
}
