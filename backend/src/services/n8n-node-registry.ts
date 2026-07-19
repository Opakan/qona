// ═══════════════════════════════════════════════════════════
// Parameter schema for deep validation
// ═══════════════════════════════════════════════════════════

export interface N8nParamSchema {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'options';
  required: boolean;
  allowedValues?: string[]; // only for type === 'options'
  defaultValue?: unknown;
  description?: string;
}

export interface N8nCredentialSchema {
  name: string;   // key used in the node's credentials object
  type: string;   // official n8n credential type string
  required: boolean;
}

export interface N8nRegistryEntry {
  n8nType: string;
  category: 'trigger' | 'action';
  displayName: string;
  typeVersion: number;
  /** Derived from paramSchema for backward compat */
  requiredParams: string[];
  /** Derived from paramSchema for backward compat */
  optionalParams: string[];
  defaults: Record<string, unknown>;
  paramSchema: N8nParamSchema[];
  credentials?: N8nCredentialSchema[];
  mapConfig?: (config: Record<string, unknown>) => Record<string, unknown>;
}

export const n8nRegistry: Record<string, N8nRegistryEntry> = {
  // ─────────────────────────────────────────
  // TRIGGERS
  // ─────────────────────────────────────────
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
    paramSchema: [
      {
        field: 'httpMethod',
        type: 'options',
        required: false,
        allowedValues: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
        defaultValue: 'POST',
      },
      { field: 'path', type: 'string', required: false, defaultValue: 'webhook' },
      {
        field: 'responseMode',
        type: 'options',
        required: false,
        allowedValues: ['lastNode', 'responseNode', 'onReceived'],
        defaultValue: 'lastNode',
      },
      {
        field: 'authentication',
        type: 'options',
        required: false,
        allowedValues: ['none', 'basicAuth', 'headerAuth'],
        defaultValue: 'none',
      },
      { field: 'options', type: 'object', required: false },
    ],
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
    paramSchema: [
      { field: 'triggerTimes', type: 'object', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.cronExpression) {
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
    paramSchema: [],
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
    paramSchema: [
      { field: 'rule', type: 'object', required: true, description: 'Scheduling rule object' },
    ],
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

  'n8n-nodes-base.gmailTrigger': {
    n8nType: 'n8n-nodes-base.gmailTrigger',
    category: 'trigger',
    displayName: 'Gmail Trigger',
    typeVersion: 1,
    requiredParams: [],
    optionalParams: ['pollTimes', 'simple', 'filters'],
    defaults: {},
    paramSchema: [
      { field: 'simple', type: 'boolean', required: false, defaultValue: true },
      { field: 'pollTimes', type: 'object', required: false },
      { field: 'filters', type: 'object', required: false },
    ],
    credentials: [
      { name: 'gmailOAuth2', type: 'gmailOAuth2', required: true },
    ],
  },

  'n8n-nodes-base.microsoftOutlookTrigger': {
    n8nType: 'n8n-nodes-base.microsoftOutlookTrigger',
    category: 'trigger',
    displayName: 'Microsoft Outlook Trigger',
    typeVersion: 1,
    requiredParams: [],
    optionalParams: ['pollTimes', 'simple', 'events'],
    defaults: {},
    paramSchema: [
      { field: 'simple', type: 'boolean', required: false, defaultValue: true },
      { field: 'pollTimes', type: 'object', required: false },
      { field: 'events', type: 'array', required: false },
    ],
    credentials: [
      { name: 'microsoftOutlookOAuth2Api', type: 'microsoftOutlookOAuth2Api', required: true },
    ],
  },

  'n8n-nodes-base.emailReadImap': {
    n8nType: 'n8n-nodes-base.emailReadImap',
    category: 'trigger',
    displayName: 'Email Read IMAP',
    typeVersion: 1,
    requiredParams: [],
    optionalParams: ['pollTimes', 'simple', 'format', 'onEmailReceived'],
    defaults: {},
    paramSchema: [
      { field: 'simple', type: 'boolean', required: false, defaultValue: true },
      { field: 'pollTimes', type: 'object', required: false },
      {
        field: 'format',
        type: 'options',
        required: false,
        allowedValues: ['resolved', 'simple', 'raw'],
        defaultValue: 'simple',
      },
    ],
    credentials: [
      { name: 'imap', type: 'imap', required: true },
    ],
  },

  'n8n-nodes-base.microsoftExchangeTrigger': {
    n8nType: 'n8n-nodes-base.microsoftExchangeTrigger',
    category: 'trigger',
    displayName: 'Microsoft Exchange Trigger',
    typeVersion: 1,
    requiredParams: [],
    optionalParams: [],
    defaults: {},
    paramSchema: [],
    credentials: [
      { name: 'microsoftExchangeOAuth2Api', type: 'microsoftExchangeOAuth2Api', required: true },
    ],
  },

  // ─────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────
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
    paramSchema: [
      { field: 'url', type: 'string', required: true },
      {
        field: 'method',
        type: 'options',
        required: false,
        allowedValues: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        defaultValue: 'GET',
      },
      {
        field: 'authentication',
        type: 'options',
        required: false,
        allowedValues: ['none', 'genericCredentialType', 'predefinedCredentialType'],
        defaultValue: 'none',
      },
      { field: 'headers', type: 'object', required: false },
      { field: 'body', type: 'object', required: false },
      { field: 'queryParameters', type: 'object', required: false },
      {
        field: 'responseFormat',
        type: 'options',
        required: false,
        allowedValues: ['autodetect', 'json', 'text', 'file'],
        defaultValue: 'autodetect',
      },
      { field: 'options', type: 'object', required: false },
    ],
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
    paramSchema: [
      { field: 'documentId', type: 'string', required: true },
      { field: 'sheetName', type: 'string', required: true },
      {
        field: 'operation',
        type: 'options',
        required: false,
        allowedValues: ['appendRow', 'readRows', 'updateRow', 'deleteRow', 'clear', 'getRows'],
        defaultValue: 'appendRow',
      },
      { field: 'columns', type: 'object', required: false },
      { field: 'dataMode', type: 'options', required: false, allowedValues: ['autoMap', 'defineBelow', 'nothing'] },
      { field: 'options', type: 'object', required: false },
    ],
    credentials: [
      { name: 'googleSheetsOAuth2Api', type: 'googleSheetsOAuth2Api', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.spreadsheetId) mapped.documentId = config.spreadsheetId;
      if (config.documentId) mapped.documentId = config.documentId;
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
    paramSchema: [
      { field: 'resource', type: 'options', required: false, allowedValues: ['message', 'channel', 'file', 'reaction', 'star', 'userGroup', 'user'], defaultValue: 'message' },
      { field: 'operation', type: 'options', required: false, allowedValues: ['post', 'postEphemeral', 'update', 'delete', 'get', 'getAll'], defaultValue: 'post' },
      { field: 'channel', type: 'string', required: true },
      { field: 'message', type: 'string', required: false },
      { field: 'blocks', type: 'array', required: false },
      { field: 'username', type: 'string', required: false },
      { field: 'threadTs', type: 'string', required: false },
      { field: 'select', type: 'options', required: false, allowedValues: ['channel', 'user'] },
      { field: 'options', type: 'object', required: false },
      { field: 'binaryData', type: 'boolean', required: false },
      { field: 'binaryPropertyName', type: 'string', required: false },
    ],
    credentials: [
      { name: 'slackApi', type: 'slackApi', required: true },
    ],
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
    optionalParams: ['subject', 'html', 'cc', 'bcc', 'fromName', 'attachments', 'resource', 'operation'],
    defaults: {
      resource: 'message',
      operation: 'send',
    },
    paramSchema: [
      {
        field: 'resource',
        type: 'options',
        required: false,
        allowedValues: ['message', 'label', 'draft', 'thread'],
        defaultValue: 'message',
      },
      {
        field: 'operation',
        type: 'options',
        required: false,
        allowedValues: ['send', 'get', 'getAll', 'reply', 'delete', 'trash', 'untrash', 'markAsRead', 'markAsUnread', 'addLabels', 'removeLabels'],
        defaultValue: 'send',
      },
      { field: 'toEmail', type: 'string', required: true },
      { field: 'subject', type: 'string', required: false },
      { field: 'html', type: 'string', required: false },
      { field: 'cc', type: 'string', required: false },
      { field: 'bcc', type: 'string', required: false },
      { field: 'fromName', type: 'string', required: false },
      { field: 'attachments', type: 'string', required: false },
    ],
    credentials: [
      { name: 'gmailOAuth2', type: 'gmailOAuth2', required: true },
    ],
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
    paramSchema: [
      { field: 'toEmail', type: 'string', required: true },
      { field: 'subject', type: 'string', required: false },
      { field: 'html', type: 'string', required: false },
      { field: 'cc', type: 'string', required: false },
      { field: 'bcc', type: 'string', required: false },
      { field: 'fromEmail', type: 'string', required: false },
      { field: 'attachments', type: 'string', required: false },
    ],
    credentials: [
      { name: 'smtp', type: 'smtp', required: true },
    ],
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
    paramSchema: [
      {
        field: 'operation',
        type: 'options',
        required: false,
        allowedValues: ['rowCreate', 'rowGet', 'rowUpdate', 'rowDelete', 'rowGetAll'],
        defaultValue: 'rowCreate',
      },
      { field: 'table', type: 'string', required: true },
      { field: 'filters', type: 'object', required: false },
      { field: 'columns', type: 'object', required: false },
      { field: 'limit', type: 'number', required: false },
      { field: 'orderBy', type: 'object', required: false },
    ],
    credentials: [
      { name: 'supabaseApi', type: 'supabaseApi', required: true },
    ],
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
    paramSchema: [
      {
        field: 'resource',
        type: 'options',
        required: false,
        allowedValues: ['message', 'bot', 'file', 'chat', 'callback'],
        defaultValue: 'message',
      },
      {
        field: 'operation',
        type: 'options',
        required: false,
        allowedValues: ['sendMessage', 'sendDocument', 'sendPhoto', 'sendVideo', 'sendAudio', 'sendLocation', 'editMessageText', 'deleteMessage', 'getUpdates', 'setWebhook', 'getMe', 'sendChatAction'],
        defaultValue: 'sendMessage',
      },
      { field: 'chatId', type: 'string', required: true },
      { field: 'text', type: 'string', required: false },
      { field: 'photo', type: 'string', required: false },
      { field: 'parseMode', type: 'options', required: false, allowedValues: ['Markdown', 'HTML', 'None'], defaultValue: 'Markdown' },
      { field: 'disableNotification', type: 'boolean', required: false },
    ],
    credentials: [
      { name: 'telegramApi', type: 'telegramApi', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.chatId) mapped.chatId = config.chatId;
      if (config.text) mapped.text = config.text;
      if (config.photo) {
        mapped.photo = config.photo;
        mapped.operation = 'sendPhoto';
      }
      if (config.parseMode) mapped.parseMode = config.parseMode;
      if (config.disableNotification !== undefined) mapped.disableNotification = config.disableNotification;
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
    paramSchema: [
      { field: 'amount', type: 'number', required: true, defaultValue: 1 },
      {
        field: 'unit',
        type: 'options',
        required: true,
        allowedValues: ['seconds', 'minutes', 'hours', 'days'],
        defaultValue: 'minutes',
      },
    ],
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
    paramSchema: [
      { field: 'conditions', type: 'object', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.conditions) mapped.conditions = config.conditions;
      if (config.expression) {
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
    paramSchema: [
      { field: 'jsCode', type: 'string', required: true },
      {
        field: 'mode',
        type: 'options',
        required: false,
        allowedValues: ['runOnceForAllItems', 'runOnceForEachItem'],
        defaultValue: 'runOnceForAllItems',
      },
    ],
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
    paramSchema: [
      {
        field: 'resource',
        type: 'options',
        required: true,
        allowedValues: ['file', 'folder', 'sharedDrive'],
        defaultValue: 'file',
      },
      {
        field: 'operation',
        type: 'options',
        required: true,
        allowedValues: ['upload', 'download', 'list', 'delete', 'move', 'copy', 'share', 'update'],
        defaultValue: 'upload',
      },
      { field: 'name', type: 'string', required: false },
      { field: 'parents', type: 'array', required: false },
      { field: 'binaryData', type: 'boolean', required: false, defaultValue: true },
      { field: 'binaryPropertyName', type: 'string', required: false, defaultValue: 'attachment_0' },
    ],
    credentials: [
      { name: 'googleDriveOAuth2Api', type: 'googleDriveOAuth2Api', required: true },
    ],
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
    paramSchema: [],
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
    paramSchema: [
      { field: 'path', type: 'string', required: true },
      { field: 'resource', type: 'options', required: false, allowedValues: ['file', 'folder', 'search'], defaultValue: 'file' },
      { field: 'operation', type: 'options', required: false, allowedValues: ['upload', 'download', 'list', 'delete', 'move', 'copy', 'search'], defaultValue: 'upload' },
      { field: 'binaryData', type: 'boolean', required: false, defaultValue: true },
      { field: 'binaryPropertyName', type: 'string', required: false, defaultValue: 'data' },
    ],
    credentials: [
      { name: 'dropboxApi', type: 'dropboxApi', required: true },
    ],
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
    paramSchema: [
      { field: 'resource', type: 'options', required: false, allowedValues: ['file', 'folder'], defaultValue: 'file' },
      { field: 'operation', type: 'options', required: false, allowedValues: ['upload', 'download', 'delete', 'getChildren', 'rename', 'search'], defaultValue: 'upload' },
      { field: 'path', type: 'string', required: false },
      { field: 'fileId', type: 'string', required: false },
      { field: 'binaryData', type: 'boolean', required: false, defaultValue: true },
      { field: 'binaryPropertyName', type: 'string', required: false, defaultValue: 'data' },
    ],
    credentials: [
      { name: 'microsoftOneDriveOAuth2Api', type: 'microsoftOneDriveOAuth2Api', required: true },
    ],
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
    paramSchema: [
      { field: 'bucketName', type: 'string', required: true },
      { field: 'key', type: 'string', required: true },
      { field: 'operation', type: 'options', required: false, allowedValues: ['upload', 'download', 'getAll', 'delete', 'copy'], defaultValue: 'upload' },
      { field: 'binaryData', type: 'boolean', required: false, defaultValue: true },
      { field: 'binaryPropertyName', type: 'string', required: false, defaultValue: 'data' },
    ],
    credentials: [
      { name: 'aws', type: 'aws', required: true },
    ],
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
    paramSchema: [
      { field: 'path', type: 'string', required: true },
      { field: 'operation', type: 'options', required: false, allowedValues: ['upload', 'download', 'list', 'delete', 'rename'], defaultValue: 'upload' },
      { field: 'binaryData', type: 'boolean', required: false, defaultValue: true },
      { field: 'binaryPropertyName', type: 'string', required: false, defaultValue: 'data' },
    ],
    credentials: [
      { name: 'ftp', type: 'ftp', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.path) mapped.path = config.path;
      if (config.operation) mapped.operation = config.operation;
      return mapped;
    },
  },
  // ─────────────────────────────────────────
  // EXTENDED NODES
  // ─────────────────────────────────────────
  'n8n-nodes-base.airtable': {
    n8nType: 'n8n-nodes-base.airtable',
    category: 'action',
    displayName: 'Airtable',
    typeVersion: 2,
    requiredParams: ['application', 'table'],
    optionalParams: ['operation', 'fields', 'filterByFormula', 'returnAll', 'limit'],
    defaults: { operation: 'list' },
    paramSchema: [
      { field: 'application', type: 'string', required: true, description: 'Airtable Base ID' },
      { field: 'table', type: 'string', required: true, description: 'Table name or ID' },
      {
        field: 'operation',
        type: 'options',
        required: false,
        allowedValues: ['list', 'read', 'create', 'update', 'delete', 'search'],
        defaultValue: 'list',
      },
      { field: 'fields', type: 'array', required: false },
      { field: 'filterByFormula', type: 'string', required: false },
      { field: 'returnAll', type: 'boolean', required: false },
      { field: 'limit', type: 'number', required: false },
    ],
    credentials: [
      { name: 'airtableApi', type: 'airtableApi', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.baseId) mapped.application = config.baseId;
      if (config.application) mapped.application = config.application;
      if (config.tableName) mapped.table = config.tableName;
      if (config.table) mapped.table = config.table;
      if (config.operation) mapped.operation = config.operation;
      if (config.fields) mapped.fields = config.fields;
      if (config.filterByFormula) mapped.filterByFormula = config.filterByFormula;
      if (config.returnAll !== undefined) mapped.returnAll = config.returnAll;
      if (config.limit) mapped.limit = config.limit;
      return mapped;
    },
  },

  'n8n-nodes-base.notion': {
    n8nType: 'n8n-nodes-base.notion',
    category: 'action',
    displayName: 'Notion',
    typeVersion: 2,
    requiredParams: ['resource', 'operation'],
    optionalParams: ['databaseId', 'pageId', 'title', 'properties', 'filter', 'sort'],
    defaults: { resource: 'page', operation: 'create' },
    paramSchema: [
      {
        field: 'resource',
        type: 'options',
        required: true,
        allowedValues: ['block', 'database', 'databasePage', 'page', 'user'],
        defaultValue: 'page',
      },
      {
        field: 'operation',
        type: 'options',
        required: true,
        allowedValues: ['create', 'get', 'getAll', 'update', 'archive', 'search'],
        defaultValue: 'create',
      },
      { field: 'databaseId', type: 'string', required: false },
      { field: 'pageId', type: 'string', required: false },
      { field: 'title', type: 'string', required: false },
      { field: 'properties', type: 'object', required: false },
      { field: 'filter', type: 'object', required: false },
      { field: 'sort', type: 'array', required: false },
    ],
    credentials: [
      { name: 'notionApi', type: 'notionApi', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.resource) mapped.resource = config.resource;
      if (config.operation) mapped.operation = config.operation;
      if (config.databaseId) mapped.databaseId = config.databaseId;
      if (config.pageId) mapped.pageId = config.pageId;
      if (config.title) mapped.title = config.title;
      if (config.properties) mapped.properties = config.properties;
      if (config.filter) mapped.filter = config.filter;
      if (config.sort) mapped.sort = config.sort;
      return mapped;
    },
  },

  'n8n-nodes-base.discord': {
    n8nType: 'n8n-nodes-base.discord',
    category: 'action',
    displayName: 'Discord',
    typeVersion: 2,
    requiredParams: ['guildId', 'channelId'],
    optionalParams: ['operation', 'resource', 'content', 'embeds', 'username', 'avatarUrl', 'tts'],
    defaults: { resource: 'message', operation: 'send' },
    paramSchema: [
      { field: 'resource', type: 'options', required: false, allowedValues: ['message', 'channel', 'guild', 'member', 'role', 'webhook'], defaultValue: 'message' },
      { field: 'operation', type: 'options', required: false, allowedValues: ['send', 'get', 'getAll', 'delete', 'update', 'pin', 'unpin', 'react'], defaultValue: 'send' },
      { field: 'guildId', type: 'string', required: true },
      { field: 'channelId', type: 'string', required: true },
      { field: 'content', type: 'string', required: false },
      { field: 'embeds', type: 'array', required: false },
      { field: 'username', type: 'string', required: false },
      { field: 'tts', type: 'boolean', required: false },
    ],
    credentials: [
      { name: 'discordApi', type: 'discordApi', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.guildId) mapped.guildId = config.guildId;
      if (config.channelId) mapped.channelId = config.channelId;
      if (config.content) mapped.content = config.content;
      if (config.message) mapped.content = config.message;
      if (config.embeds) mapped.embeds = config.embeds;
      if (config.username) mapped.username = config.username;
      if (config.resource) mapped.resource = config.resource;
      if (config.operation) mapped.operation = config.operation;
      return mapped;
    },
  },

  'n8n-nodes-base.rssFeedRead': {
    n8nType: 'n8n-nodes-base.rssFeedRead',
    category: 'trigger',
    displayName: 'RSS Feed Read',
    typeVersion: 1,
    requiredParams: ['url'],
    optionalParams: ['pollTimes'],
    defaults: {},
    paramSchema: [
      { field: 'url', type: 'string', required: true, description: 'RSS/Atom feed URL' },
      { field: 'pollTimes', type: 'object', required: false },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.url) mapped.url = config.url;
      if (config.feedUrl) mapped.url = config.feedUrl;
      if (config.pollTimes) mapped.pollTimes = config.pollTimes;
      return mapped;
    },
  },

  'n8n-nodes-base.googleCalendar': {
    n8nType: 'n8n-nodes-base.googleCalendar',
    category: 'action',
    displayName: 'Google Calendar',
    typeVersion: 1,
    requiredParams: ['calendarId'],
    optionalParams: ['operation', 'resource', 'eventId', 'summary', 'start', 'end', 'description', 'attendees'],
    defaults: { resource: 'event', operation: 'getAll' },
    paramSchema: [
      { field: 'resource', type: 'options', required: false, allowedValues: ['calendar', 'event'], defaultValue: 'event' },
      { field: 'operation', type: 'options', required: false, allowedValues: ['create', 'get', 'getAll', 'update', 'delete', 'quickAdd'], defaultValue: 'getAll' },
      { field: 'calendarId', type: 'string', required: true },
      { field: 'eventId', type: 'string', required: false },
      { field: 'summary', type: 'string', required: false },
      { field: 'start', type: 'object', required: false },
      { field: 'end', type: 'object', required: false },
      { field: 'description', type: 'string', required: false },
      { field: 'attendees', type: 'array', required: false },
    ],
    credentials: [
      { name: 'googleCalendarOAuth2Api', type: 'googleCalendarOAuth2Api', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.calendarId) mapped.calendarId = config.calendarId;
      if (config.operation) mapped.operation = config.operation;
      if (config.resource) mapped.resource = config.resource;
      if (config.eventId) mapped.eventId = config.eventId;
      if (config.summary) mapped.summary = config.summary;
      if (config.start) mapped.start = config.start;
      if (config.end) mapped.end = config.end;
      if (config.description) mapped.description = config.description;
      if (config.attendees) mapped.attendees = config.attendees;
      return mapped;
    },
  },

  'n8n-nodes-base.openAi': {
    n8nType: 'n8n-nodes-base.openAi',
    category: 'action',
    displayName: 'OpenAI',
    typeVersion: 1,
    requiredParams: ['operation'],
    optionalParams: ['resource', 'model', 'prompt', 'messages', 'temperature', 'maxTokens', 'n'],
    defaults: { resource: 'text', operation: 'complete', model: 'gpt-3.5-turbo' },
    paramSchema: [
      {
        field: 'resource',
        type: 'options',
        required: false,
        allowedValues: ['text', 'chat', 'image', 'audio', 'file', 'assistant', 'embedding'],
        defaultValue: 'text',
      },
      {
        field: 'operation',
        type: 'options',
        required: true,
        allowedValues: ['complete', 'message', 'generate', 'transcribe', 'translate', 'create', 'upload', 'list', 'get', 'delete', 'classify'],
        defaultValue: 'complete',
      },
      { field: 'model', type: 'string', required: false, defaultValue: 'gpt-3.5-turbo' },
      { field: 'prompt', type: 'string', required: false },
      { field: 'messages', type: 'array', required: false },
      { field: 'temperature', type: 'number', required: false },
      { field: 'maxTokens', type: 'number', required: false },
      { field: 'n', type: 'number', required: false },
    ],
    credentials: [
      { name: 'openAiApi', type: 'openAiApi', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.resource) mapped.resource = config.resource;
      if (config.operation) mapped.operation = config.operation;
      if (config.model) mapped.model = config.model;
      if (config.prompt) mapped.prompt = config.prompt;
      if (config.messages) mapped.messages = config.messages;
      if (config.temperature !== undefined) mapped.temperature = config.temperature;
      if (config.maxTokens) mapped.maxTokens = config.maxTokens;
      return mapped;
    },
  },

  'n8n-nodes-base.postgres': {
    n8nType: 'n8n-nodes-base.postgres',
    category: 'action',
    displayName: 'PostgreSQL',
    typeVersion: 2,
    requiredParams: ['operation'],
    optionalParams: ['query', 'table', 'schema', 'columns', 'additionalFields', 'returnAll', 'limit'],
    defaults: { operation: 'executeQuery', schema: 'public' },
    paramSchema: [
      {
        field: 'operation',
        type: 'options',
        required: true,
        allowedValues: ['executeQuery', 'insert', 'update', 'delete', 'select'],
        defaultValue: 'executeQuery',
      },
      { field: 'query', type: 'string', required: false },
      { field: 'table', type: 'string', required: false },
      { field: 'schema', type: 'string', required: false, defaultValue: 'public' },
      { field: 'columns', type: 'string', required: false },
      { field: 'additionalFields', type: 'object', required: false },
      { field: 'returnAll', type: 'boolean', required: false },
      { field: 'limit', type: 'number', required: false },
    ],
    credentials: [
      { name: 'postgres', type: 'postgres', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.operation) mapped.operation = config.operation;
      if (config.query) mapped.query = config.query;
      if (config.table) mapped.table = config.table;
      if (config.schema) mapped.schema = config.schema;
      if (config.columns) mapped.columns = config.columns;
      if (config.returnAll !== undefined) mapped.returnAll = config.returnAll;
      if (config.limit) mapped.limit = config.limit;
      return mapped;
    },
  },

  'n8n-nodes-base.stripeTrigger': {
    n8nType: 'n8n-nodes-base.stripeTrigger',
    category: 'trigger',
    displayName: 'Stripe Trigger',
    typeVersion: 1,
    requiredParams: ['events'],
    optionalParams: [],
    defaults: {},
    paramSchema: [
      { field: 'events', type: 'array', required: true, description: 'Stripe event types to listen for' },
    ],
    credentials: [
      { name: 'stripeApi', type: 'stripeApi', required: true },
    ],
    mapConfig: (config) => {
      const mapped: Record<string, unknown> = {};
      if (config.events) mapped.events = config.events;
      if (config.event) mapped.events = [config.event];
      return mapped;
    },
  },
};

// ═══════════════════════════════════════════════════════════
// Registry lookup helpers
// ═══════════════════════════════════════════════════════════

export function lookupRegistry(internalType: string, config?: Record<string, unknown>): N8nRegistryEntry | undefined {
  // Direct n8nType match first
  if (n8nRegistry[internalType]) return n8nRegistry[internalType];

  // Email trigger: resolve by provider
  if (internalType === 'email_received') {
    const provider = String(config?.provider || '').toLowerCase();
    if (provider === 'gmail') return n8nRegistry['n8n-nodes-base.gmailTrigger'];
    if (provider === 'outlook') return n8nRegistry['n8n-nodes-base.microsoftOutlookTrigger'];
    if (provider === 'imap') return n8nRegistry['n8n-nodes-base.emailReadImap'];
    if (provider === 'pop3') return n8nRegistry['n8n-nodes-base.emailReadImap'];
    if (provider === 'exchange') return n8nRegistry['n8n-nodes-base.microsoftExchangeTrigger'];
    if (provider === 'yahoo') return n8nRegistry['n8n-nodes-base.emailReadImap'];
    return n8nRegistry['n8n-nodes-base.emailReadImap'];
  }

  // Internal type → n8n type mapping
  const typeMap: Record<string, string> = {
    // Triggers
    webhook: 'n8n-nodes-base.webhook',
    schedule: 'n8n-nodes-base.scheduleTrigger',
    cron: 'n8n-nodes-base.cron',
    manual: 'n8n-nodes-base.manualTrigger',
    form_submission: 'n8n-nodes-base.webhook',
    payment_received: 'n8n-nodes-base.stripeTrigger',
    stripe_trigger: 'n8n-nodes-base.stripeTrigger',
    rss_feed: 'n8n-nodes-base.rssFeedRead',
    // Actions — communication
    send_email: 'n8n-nodes-base.emailSend',
    gmail: 'n8n-nodes-base.gmail',
    slack: 'n8n-nodes-base.slack',
    telegram: 'n8n-nodes-base.telegram',
    discord: 'n8n-nodes-base.discord',
    // Actions — data
    google_sheets: 'n8n-nodes-base.googleSheets',
    create_record: 'n8n-nodes-base.googleSheets',
    update_record: 'n8n-nodes-base.googleSheets',
    supabase: 'n8n-nodes-base.supabase',
    airtable: 'n8n-nodes-base.airtable',
    notion: 'n8n-nodes-base.notion',
    postgres: 'n8n-nodes-base.postgres',
    // Actions — files/storage
    google_drive: 'n8n-nodes-base.googleDrive',
    dropbox: 'n8n-nodes-base.dropbox',
    one_drive: 'n8n-nodes-base.oneDrive',
    s3: 'n8n-nodes-base.s3',
    ftp: 'n8n-nodes-base.ftp',
    // Actions — calendar/scheduling
    google_calendar: 'n8n-nodes-base.googleCalendar',
    // Actions — AI
    openai: 'n8n-nodes-base.openAi',
    // Actions — HTTP / code / flow
    http_request: 'n8n-nodes-base.httpRequest',
    transform_data: 'n8n-nodes-base.noOp',
    filter: 'n8n-nodes-base.if',
    delay: 'n8n-nodes-base.wait',
    run_code: 'n8n-nodes-base.code',
    send_notification: 'n8n-nodes-base.slack',
  };

  const n8nType = typeMap[internalType];
  if (n8nType) return n8nRegistry[n8nType];

  return undefined;
}

/** Return all trigger-type n8n types from the registry */
export function getTriggerTypes(): string[] {
  return Object.values(n8nRegistry)
    .filter((e) => e.category === 'trigger')
    .map((e) => e.n8nType);
}

