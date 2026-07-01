import axios, { AxiosInstance } from 'axios';
import { config } from '../config.js';

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';

let client: AxiosInstance | null = null;

export function getDeepSeekClient(): AxiosInstance {
  if (!client) {
    client = axios.create({
      baseURL: DEEPSEEK_BASE,
      timeout: 60_000,
      headers: {
        'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    client.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err.response?.status === 429) {
          throw new Error('DeepSeek rate limit exceeded');
        }
        if (err.response?.status && err.response.status >= 500) {
          throw new Error(`DeepSeek server error: ${err.response.status}`);
        }
        throw err;
      },
    );
  }
  return client;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; max_tokens?: number; retries?: number },
): Promise<string> {
  const maxRetries = options?.retries ?? 2;
  let lastError: Error | null = null;

  // DeepSeek requires the word 'json' to be present when response_format is 'json_object'
  const hasJson = messages.some((m) => m.content.toLowerCase().includes('json'));
  const finalMessages = [...messages];
  if (!hasJson) {
    finalMessages.push({ role: 'system', content: 'Format the response as JSON.' });
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await getDeepSeekClient().post('/chat/completions', {
        model: 'deepseek-chat',
        messages: finalMessages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.max_tokens ?? 4000,
        response_format: { type: 'json_object' },
      });

      const content = res.data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from DeepSeek');
      return content;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('DeepSeek request failed');
}
