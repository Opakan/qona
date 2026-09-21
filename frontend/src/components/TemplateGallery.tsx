import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Search, Zap, CheckCircle, ShieldCheck, Download, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { Template } from '@qona/shared';
import { TemplateDetailsModal, downloadTemplateJson } from './TemplateDetailsModal';

interface TemplateGalleryProps {
  onSelectTemplate?: (template: Template) => void;
  featuredOnly?: boolean;
}

const fallbackTemplates: Template[] = [
  {
    id: 'ai-lead-qualification',
    slug: 'ai-lead-qualification',
    name: 'AI Lead Qualification & CRM Routing',
    description: 'Enriches inbound webhook submissions using Claude 3.5 Sonnet, scores intent, and notifies sales in Slack.',
    category: 'AI & Automation',
    icon: 'zap',
    difficulty: 'Beginner',
    plainEnglishSummary: ['Listens for new lead webhooks', 'Scores and qualifies lead with Claude AI', 'Routes qualified prospects to CRM and Slack'],
    tags: ['ai', 'webhook', 'slack', 'crm', 'sales', 'Anthropic Claude', 'HubSpot'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'AI Lead Qualification', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  },
  {
    id: 'gmail-to-slack-summarizer',
    slug: 'gmail-to-slack-summarizer',
    name: 'Gmail VIP Email AI Summarizer',
    description: 'Scans inbox for high-priority executive emails, generates 2-bullet executive summaries, and sends to Slack.',
    category: 'Communication',
    icon: 'mail',
    difficulty: 'Beginner',
    plainEnglishSummary: ['Triggers on new Gmail threads', 'Extracts key action points with AI', 'Posts instant digest to dedicated channel'],
    tags: ['gmail', 'slack', 'ai', 'email', 'Claude Haiku'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'Gmail Summarizer', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  },
  {
    id: 'stripe-invoice-sync',
    slug: 'stripe-invoice-sync',
    name: 'Stripe Payment to Google Sheets Sync',
    description: 'Automatically records completed Stripe checkout sessions and charges into financial tracking spreadsheets.',
    category: 'Finance',
    icon: 'credit-card',
    difficulty: 'Beginner',
    plainEnglishSummary: ['Receives Stripe charge webhooks', 'Formats currency and tax fields', 'Appends structured rows to Google Sheets'],
    tags: ['stripe', 'finance', 'sheets', 'webhook', 'Google Sheets'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'Stripe Invoice Sync', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  },
  {
    id: 'database-backup-notifier',
    slug: 'database-backup-notifier',
    name: 'Automated DB Health & Backup Watchdog',
    description: 'Cron trigger runs hourly database health checks and alerts on query anomalies or failed snapshot backups.',
    category: 'DevOps',
    icon: 'database',
    difficulty: 'Intermediate',
    plainEnglishSummary: ['Runs on scheduled cron timer', 'Pings PostgreSQL replica health', 'Dispatches alerts on discord / pagerduty'],
    tags: ['cron', 'devops', 'postgres', 'discord', 'PostgreSQL', 'Schedule Trigger'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'DB Backup Watchdog', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  },
  {
    id: 'social-media-scheduler',
    slug: 'social-media-scheduler',
    name: 'Notion to Multi-Platform Social Publisher',
    description: 'Watches Notion Content Calendar status changes and automatically drafts/publishes to Twitter and LinkedIn.',
    category: 'Marketing',
    icon: 'share-2',
    difficulty: 'Intermediate',
    plainEnglishSummary: ['Detects status=Ready in Notion', 'Formats social copy per platform', 'Publishes posts at optimal scheduled times'],
    tags: ['notion', 'twitter', 'linkedin', 'marketing', 'Twitter/X'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'Social Publisher', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  },
  {
    id: 'customer-support-triage',
    slug: 'customer-support-triage',
    name: 'Zendesk Ticket Triage & Auto-Reply Agent',
    description: 'Analyzes incoming customer support inquiries, classifies urgency and sentiment, and drafts context-aware replies.',
    category: 'CRM',
    icon: 'life-buoy',
    difficulty: 'Advanced',
    plainEnglishSummary: ['Listens for new Zendesk tickets', 'Classifies intent and customer sentiment', 'Drafts personalized suggested responses'],
    tags: ['zendesk', 'support', 'ai', 'crm', 'Claude 3.5 Sonnet', 'Webhook'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'Customer Support Triage', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  },
  {
    id: 'discord-telegram-ai-moderator',
    slug: 'discord-telegram-ai-moderator',
    name: 'Discord & Telegram Autonomous AI Moderator',
    description: 'Watches community chat webhooks, evaluates toxic or phishing messages with AI, removes violations, and alerts human moderators.',
    category: 'AI & Automation',
    icon: 'shield',
    difficulty: 'Intermediate',
    plainEnglishSummary: ['Listens for community messages via webhook', 'Analyzes spam, toxic, or phishing content', 'Deletes violations and dispatches moderator audit log'],
    tags: ['discord', 'telegram', 'moderation', 'ai', 'community', 'Webhook', 'Claude Haiku'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'Discord & Telegram AI Moderator', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  },
  {
    id: 'shopify-whatsapp-fulfillment',
    slug: 'shopify-whatsapp-fulfillment',
    name: 'Shopify Order Fulfillment & WhatsApp Tracker',
    description: 'Triggers on newly fulfilled Shopify orders, generates live carrier tracking deep links, and dispatches automated WhatsApp updates to the customer.',
    category: 'Communication',
    icon: 'shopping-bag',
    difficulty: 'Beginner',
    plainEnglishSummary: ['Catches Shopify fulfillment order events', 'Generates estimated delivery tracking details', 'Sends automated WhatsApp confirmation via Twilio'],
    tags: ['shopify', 'whatsapp', 'twilio', 'ecommerce', 'orders', 'Customer Notification'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'Shopify WhatsApp Fulfillment', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  },
  {
    id: 'hubspot-deals-forecasting',
    slug: 'hubspot-deals-forecasting',
    name: 'HubSpot Deals & Revenue Forecasting Agent',
    description: 'Pulls weekly pipeline updates from HubSpot CRM, calculates deal win probability velocity, and posts an executive briefing to Slack.',
    category: 'Finance',
    icon: 'trending-up',
    difficulty: 'Advanced',
    plainEnglishSummary: ['Runs on Monday morning cron schedule', 'Aggregates deals across pipeline stages in HubSpot', 'Calculates weighted revenue velocity and alerts Slack'],
    tags: ['hubspot', 'crm', 'slack', 'sales', 'finance', 'revenue', 'Cron Trigger'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'HubSpot Revenue Forecast', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  },
  {
    id: 'github-issue-auto-triage',
    slug: 'github-issue-auto-triage',
    name: 'GitHub Issue AI Auto-Triage & Labeler',
    description: 'Listens for newly opened GitHub issues, parses reproduction steps, tags component labels (bug/frontend/backend), and posts initial helpful troubleshooting steps.',
    category: 'DevOps',
    icon: 'github',
    difficulty: 'Intermediate',
    plainEnglishSummary: ['Listens for GitHub issue webhook events', 'Classifies issue category and severity with AI', 'Applies GitHub labels and responds with preliminary debugging tips'],
    tags: ['github', 'issues', 'devops', 'ai', 'automation', 'Claude Sonnet', 'Webhook'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'GitHub Issue AI Triage', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  },
  {
    id: 'airtable-supabase-sync',
    slug: 'airtable-supabase-sync',
    name: 'Airtable to Supabase PostgreSQL Bi-Directional Sync',
    description: 'Monitors modified rows in Airtable operational bases and executes idempotency-safe upserts into your production Supabase database.',
    category: 'AI & Automation',
    icon: 'database',
    difficulty: 'Intermediate',
    plainEnglishSummary: ['Polls Airtable records for recent modifications', 'Transforms row fields and schema types', 'Upserts directly into Supabase PostgreSQL tables'],
    tags: ['airtable', 'supabase', 'postgres', 'database', 'sync', 'Scheduled Sync'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'Airtable Supabase Sync', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  },
  {
    id: 'media-to-blog-ai-generator',
    slug: 'media-to-blog-ai-generator',
    name: 'Podcast & Media Audio to Multi-Format Blog Engine',
    description: 'Fetches newly published podcast episodes or YouTube videos, transcribes dialogue, and formats SEO blog posts, Twitter/X threads, and LinkedIn summaries.',
    category: 'Marketing',
    icon: 'mic',
    difficulty: 'Advanced',
    plainEnglishSummary: ['Triggers on new media RSS item or upload', 'Transcribes audio into structured chapters', 'Generates SEO blog post, social threads, and key takeaways'],
    tags: ['podcast', 'youtube', 'ai', 'content', 'seo', 'marketing', 'Claude 3.5 Sonnet'],
    requiredUserInputs: [],
    n8nVersion: '1.0',
    featured: true,
    graph: { metadata: { name: 'Media to Blog Engine', description: '', version: 1, tags: [] }, nodes: [], edges: [] },
  }
];

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelectTemplate, featuredOnly = false }) => {
  const [templates, setTemplates] = useState<Template[]>(fallbackTemplates);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('AI & Automation');
  const [displayCount, setDisplayCount] = useState<number>(12);
  const [selectedTemplateForDetails, setSelectedTemplateForDetails] = useState<Template | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const fetchTemplates = async () => {
      // 1. Load instant static CDN catalog (2,903 templates available immediately)
      try {
        const staticRes = await fetch('/templates-catalog.json');
        if (staticRes.ok) {
          const staticData = await staticRes.json();
          if (!cancelled && Array.isArray(staticData) && staticData.length > 0) {
            const finalTemplates = featuredOnly ? staticData.filter((t: Template) => t.featured) : staticData;
            setTemplates(finalTemplates);
            return;
          }
        }
      } catch {
        /* fallback to backend API */
      }

      // 2. Fallback to API if available
      try {
        const url = featuredOnly ? '/templates?featured=true' : '/templates';
        const res = await apiClient.get(url);
        if (!cancelled && res.data?.templates && res.data.templates.length > 0) {
          setTemplates(res.data.templates);
        }
      } catch (err) {
        console.warn('[TemplateGallery] Could not fetch remote templates, showing catalog defaults:', err);
      }
    };
    fetchTemplates();
    return () => { cancelled = true; };
  }, [featuredOnly]);

  // Reset pagination when category or search changes
  useEffect(() => {
    setDisplayCount(12);
  }, [selectedCategory, searchQuery]);

  const extractedCategories = Array.from(
    new Set(
      templates.flatMap((t) => {
        const catList: string[] = [];
        if (t.category) catList.push(t.category);
        if (Array.isArray((t as any).categories)) catList.push(...(t as any).categories);
        return catList;
      })
    )
  ).filter(Boolean);

  const knownCategories = ['AI', 'Automation', 'Communication', 'Data', 'Marketing', 'Sales', 'DevOps', 'Finance', 'CRM', 'Social Media'];
  const categories = Array.from(new Set(['AI & Automation', 'All', ...knownCategories, ...extractedCategories]));

  const filteredTemplates = templates.filter((t) => {
    const mainCategory = (t.category || 'Automation').trim();
    const categoriesList: string[] = (t as any).categories || [mainCategory];
    const tags: string[] = t.tags || [];

    const allItemCategories = Array.from(new Set([mainCategory, ...categoriesList, ...tags])).map((c) => String(c).toLowerCase());

    let matchesCategory = false;
    if (selectedCategory === 'All') {
      matchesCategory = true;
    } else if (selectedCategory === 'AI & Automation') {
      matchesCategory =
        allItemCategories.some((c) =>
          ['ai', 'automation', 'openai', 'gpt', 'llm', 'webhook', 'email', 'slack', 'telegram', 'data', 'cron', 'sheet', 'http'].some((kw) => c.includes(kw))
        ) || true;
    } else {
      matchesCategory = allItemCategories.some((c) => c === selectedCategory.toLowerCase() || c.includes(selectedCategory.toLowerCase()));
    }

    const name = t.name || (t as any).title || '';
    const description = t.description || '';
    const matchesSearch =
      !searchQuery.trim() ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some((tag) => tag && String(tag).toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const displayedTemplates = filteredTemplates.slice(0, displayCount);

  const handleUseTemplate = (template: Template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      navigate('/chat', { state: { selectedTemplate: template } });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!featuredOnly && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ready-made automations..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 shadow-2xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="text-xs font-medium text-slate-500">
              Showing <span className="font-bold text-slate-800">{displayedTemplates.length}</span> of{' '}
              <span className="font-bold text-slate-800">{filteredTemplates.length}</span> templates
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Search className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No templates found</h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Try adjusting your search query or category filter to discover available automations.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="mt-4 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplateForDetails(template)}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500 hover:shadow-lg cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-[11px] font-extrabold text-indigo-700">
                      <Zap className="h-3 w-3 text-indigo-600" />
                      {template.category || 'Automation'}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      template.difficulty === 'Advanced'
                        ? 'bg-amber-50 text-amber-800'
                        : template.difficulty === 'Intermediate'
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-emerald-50 text-emerald-800'
                    }`}>
                      {template.difficulty || 'Intermediate'}
                    </span>
                  </div>

                  <h4 className="text-base font-extrabold font-display text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {template.name || 'Untitled Automation'}
                  </h4>
                  <p className="mt-2 text-xs font-medium text-slate-600 leading-relaxed line-clamp-2">
                    {template.description || 'Ready-made n8n automation template.'}
                  </p>

                  {/* Plain English Bullet Highlights */}
                  {Array.isArray(template.plainEnglishSummary) && template.plainEnglishSummary.length > 0 && (
                    <ul className="mt-3.5 space-y-1.5 text-xs text-slate-700 border-t border-slate-100 pt-3">
                      {template.plainEnglishSummary.slice(0, 2).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                          <span className="font-semibold text-[11px] text-slate-800">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadTemplateJson(template);
                      }}
                      title="Download n8n Workflow JSON"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-250 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplateForDetails(template);
                      }}
                      title="View Full Workflow Details"
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      <span>Details</span>
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(template);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-indigo-700 hover:shadow-md cursor-pointer"
                  >
                    <span>Use</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {displayedTemplates.length < filteredTemplates.length && (
            <div className="flex justify-center pt-6">
              <button
                onClick={() => setDisplayCount((prev) => prev + 12)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-xs font-extrabold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer"
              >
                <span>Load More Templates ({filteredTemplates.length - displayedTemplates.length} remaining)</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Details and Download Modal */}
      <TemplateDetailsModal
        template={selectedTemplateForDetails}
        isOpen={Boolean(selectedTemplateForDetails)}
        onClose={() => setSelectedTemplateForDetails(null)}
        onUseTemplate={handleUseTemplate}
      />
    </div>
  );
};
