import {
  BedrockRuntimeClient,
  ConverseCommand,
  Message as BedrockMessage,
  SystemContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import axios from 'axios';
import { config } from '../config.js';

let bedrockClient: BedrockRuntimeClient | null = null;

export function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    const clientConfig: { region: string; credentials?: { accessKeyId: string; secretAccessKey: string } } = {
      region: config.AWS_REGION || 'us-east-1',
    };

    if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      };
    }

    bedrockClient = new BedrockRuntimeClient(clientConfig);
  }
  return bedrockClient;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  max_tokens?: number;
  retries?: number;
  modelTier?: 'sonnet' | 'haiku';
  modelId?: string;
}

/**
 * Clean markdown JSON wrappers if the model outputs ```json ... ```
 */
function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');
    cleaned = cleaned.trim();
  }
  return cleaned;
}

/**
 * Call Anthropic Claude Messages API directly using ANTHROPIC_API_KEY
 */
async function callAnthropicDirect(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
  const systemMessage = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');

  const conversationMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

  if (conversationMessages.length === 0) {
    conversationMessages.push({ role: 'user', content: 'Generate the response in JSON format.' });
  }

  const model = options?.modelTier === 'haiku'
    ? 'claude-3-5-haiku-20241022'
    : (config.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022');

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model,
      max_tokens: options?.max_tokens ?? 4096,
      temperature: options?.temperature ?? 0.2,
      system: systemMessage || undefined,
      messages: conversationMessages,
    },
    {
      headers: {
        'x-api-key': config.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      timeout: 60000,
    },
  );

  const text = response.data?.content?.[0]?.text;
  if (!text) {
    throw new Error('Empty response received from Anthropic API');
  }

  return cleanJsonOutput(text);
}

/**
 * Call Anthropic Claude via AWS Bedrock Converse API
 */
async function callBedrock(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
  const modelTier = options?.modelTier ?? 'sonnet';
  const modelId =
    options?.modelId ??
    (modelTier === 'haiku' ? config.BEDROCK_HAIKU_MODEL_ID : config.BEDROCK_SONNET_MODEL_ID);

  const systemMessages: SystemContentBlock[] = [];
  const conversationMessages: BedrockMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemMessages.push({ text: msg.content });
    } else {
      conversationMessages.push({
        role: msg.role,
        content: [{ text: msg.content }],
      });
    }
  }

  if (conversationMessages.length === 0) {
    conversationMessages.push({
      role: 'user',
      content: [{ text: 'Generate the response in JSON format.' }],
    });
  }

  const bedrock = getBedrockClient();
  const command = new ConverseCommand({
    modelId,
    system: systemMessages.length > 0 ? systemMessages : undefined,
    messages: conversationMessages,
    inferenceConfig: {
      temperature: options?.temperature ?? 0.2,
      maxTokens: options?.max_tokens ?? 4096,
    },
  });

  const response = await bedrock.send(command);
  const text = response.output?.message?.content?.[0]?.text;

  if (!text) {
    throw new Error('Empty response received from AWS Bedrock');
  }

  return cleanJsonOutput(text);
}

/**
 * Call DeepSeek API as high-availability fallback
 */
async function callDeepSeek(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
  const systemMessage = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');

  const conversationMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

  if (conversationMessages.length === 0) {
    conversationMessages.push({ role: 'user', content: 'Generate the response in JSON format.' });
  }

  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
        ...conversationMessages,
      ],
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.max_tokens ?? 4096,
    },
    {
      headers: {
        Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    },
  );

  const text = response.data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response received from DeepSeek API');
  }

  return cleanJsonOutput(text);
}

/**
 * Invoke Anthropic Claude with multiple retries and provider fallback
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
  const maxRetries = options?.retries ?? 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (config.ANTHROPIC_API_KEY) {
        return await callAnthropicDirect(messages, options);
      }

      if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
        return await callBedrock(messages, options);
      }

      // If neither key is configured, check if AWS default credential chain works
      return await callBedrock(messages, options);
    } catch (err: unknown) {
      lastError = err as Error;
      console.error(`[Claude AI] Error on attempt ${attempt + 1}/${maxRetries + 1}:`, (err as Error).message);

      // Attempt DeepSeek fallback if Bedrock/Claude encounters network/auth/model errors
      if (config.DEEPSEEK_API_KEY) {
        try {
          console.log('[Claude AI] Attempting fallback to DeepSeek API...');
          return await callDeepSeek(messages, options);
        } catch (deepseekErr: unknown) {
          console.warn('[Claude AI] DeepSeek fallback error:', (deepseekErr as Error).message);
        }
      }

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  const errorMessage = lastError?.message || 'AI request failed';
  throw new Error(
    `AI service is currently unavailable (${errorMessage}). Please check your AI API credentials.`,
  );
}

