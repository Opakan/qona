import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { chatCompletion } from '../services/bedrock.js';
import { templateSearchService } from '../services/template-search.service.js';

export const searchRouter = Router();

const NLSearchSchema = z.object({
  query: z.string().min(2).max(500),
  limit: z.number().int().min(1).max(20).optional().default(8),
});

/**
 * POST /api/search/nl
 * Natural language search over the 2,900+ template catalog.
 * Claude extracts intent, tools, and keywords → scored search → returns
 * ranked results with a 1-sentence AI explanation for each match.
 */
searchRouter.post('/search/nl', optionalAuth, validate(NLSearchSchema), async (req: Request, res: Response) => {
  const { query, limit } = req.body as { query: string; limit: number };

  try {
    // Step 1: Use Claude Haiku to extract structured intent from the NL query
    const intentPrompt = `You are a workflow automation expert. A user wants to find automation templates.

User query: "${query}"

Extract a JSON object with these fields:
- "keywords": string[] — 3-8 specific technical keywords (tools, services, verbs like "send", "notify", "sync", "when", "trigger")
- "tools": string[] — specific tools or services mentioned or implied (e.g. "Slack", "Gmail", "Stripe", "Notion", "Webhook")  
- "intent": string — 1 sentence summarizing what the user wants to automate
- "refined_query": string — a cleaned-up version of the query optimized for keyword matching

Respond with ONLY the JSON object, no markdown.`;

    let intent: { keywords: string[]; tools: string[]; intent: string; refined_query: string };

    try {
      const raw = await chatCompletion(
        [{ role: 'user', content: intentPrompt }],
        { modelTier: 'haiku', max_tokens: 400, temperature: 0.1 },
      );
      intent = JSON.parse(raw);
    } catch {
      // Fallback: use query directly
      intent = {
        keywords: query.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
        tools: [],
        intent: query,
        refined_query: query,
      };
    }

    // Step 2: Multi-pass scored search using extracted keywords + tools
    const allTerms = [...(intent.keywords || []), ...(intent.tools || []), intent.refined_query].filter(Boolean);

    const catalog = templateSearchService.findRelevantTemplatesForAI(allTerms.join(' '), limit * 2);

    // Also do a direct keyword search to catch exact matches
    const keywordResults = templateSearchService.search({
      query: intent.refined_query,
      limit: limit * 2,
    }).templates;

    // Merge and deduplicate by id, boosting relevance score
    const seen = new Set<string | number>();
    const merged: typeof catalog = [];
    for (const t of [...catalog, ...keywordResults]) {
      const id = String(t.id);
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(t);
      }
    }

    const topResults = merged.slice(0, limit);

    if (topResults.length === 0) {
      res.json({
        intent: intent.intent,
        query,
        results: [],
        totalFound: 0,
        message: 'No templates found matching your description. Try different keywords or browse all templates.',
      });
      return;
    }

    // Step 3: Ask Claude to write a brief relevance explanation for each result
    const summaryPrompt = `A user searched for: "${query}"

Their intent: ${intent.intent}

Here are ${topResults.length} automation templates that were found. For each, write a single sentence (max 15 words) explaining why it matches the user's request. Be specific about what connects the template to their query.

Templates:
${topResults.map((t, i) => `${i + 1}. "${t.title}" — ${t.description?.slice(0, 120)}`).join('\n')}

Respond with ONLY a JSON array of strings, one per template, in the same order. Example: ["Reason 1", "Reason 2"]`;

    let explanations: string[] = topResults.map(() => 'Matches your workflow requirements.');
    try {
      const rawExp = await chatCompletion(
        [{ role: 'user', content: summaryPrompt }],
        { modelTier: 'haiku', max_tokens: 600, temperature: 0.3 },
      );
      const parsed = JSON.parse(rawExp);
      if (Array.isArray(parsed) && parsed.length === topResults.length) {
        explanations = parsed;
      }
    } catch {
      // Keep default explanations on parse failure
    }

    const results = topResults.map((t, i) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      categories: t.categories,
      toolsUsed: t.toolsUsed,
      nodeCount: (t as any).nodeCount ?? (t.nodeTypes ? t.nodeTypes.length : 0),
      relevanceExplanation: explanations[i] ?? 'Matches your workflow requirements.',
    }));

    res.json({
      intent: intent.intent,
      query,
      extractedTools: intent.tools,
      extractedKeywords: intent.keywords,
      results,
      totalFound: results.length,
    });
  } catch (err: any) {
    console.error('[NL Search] Error:', err?.message);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

/**
 * GET /api/search/nl/suggestions
 * Returns example NL search queries to show in the UI placeholder.
 */
searchRouter.get('/search/nl/suggestions', (_req: Request, res: Response) => {
  res.json({
    suggestions: [
      'send a Slack message when a Google Form is submitted',
      'sync Notion database to Google Sheets every day',
      'when a Stripe payment fails, email the customer and notify me on Telegram',
      'summarize new emails and post to Slack every morning',
      'automatically label and reply to GitHub issues with AI',
      'backup my Airtable records to Supabase weekly',
      'send WhatsApp order confirmation when Shopify order is fulfilled',
    ],
  });
});
