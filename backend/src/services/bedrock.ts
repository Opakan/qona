import {
  BedrockRuntimeClient,
  ConverseCommand,
  Message as BedrockMessage,
  SystemContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config.js';

let client: BedrockRuntimeClient | null = null;

export function getBedrockClient(): BedrockRuntimeClient {
  if (!client) {
    const clientConfig: { region: string; credentials?: { accessKeyId: string; secretAccessKey: string } } = {
      region: config.AWS_REGION || 'us-east-1',
    };

    if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      };
    }

    client = new BedrockRuntimeClient(clientConfig);
  }
  return client;
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
 * Invoke Anthropic Claude via AWS Bedrock Converse API
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
  const maxRetries = options?.retries ?? 2;
  const modelTier = options?.modelTier ?? 'sonnet';
  const modelId =
    options?.modelId ??
    (modelTier === 'haiku' ? config.BEDROCK_HAIKU_MODEL_ID : config.BEDROCK_SONNET_MODEL_ID);

  // Extract system messages
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

  // Ensure Bedrock receives valid conversation turns (at least one user message)
  if (conversationMessages.length === 0) {
    conversationMessages.push({
      role: 'user',
      content: [{ text: 'Generate the response in JSON format.' }],
    });
  }

  const bedrock = getBedrockClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
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
    } catch (err: unknown) {
      lastError = err as Error;
      console.error(`[Bedrock LLM] Error on attempt ${attempt + 1}/${maxRetries + 1}:`, (err as Error).message);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('AWS Bedrock request failed');
}
