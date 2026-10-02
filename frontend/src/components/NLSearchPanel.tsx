import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, Search, X, ArrowRight, Loader2, Zap,
  Lightbulb, Tag, ChevronRight, CornerDownLeft,
} from 'lucide-react';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

interface NLResult {
  id: string | number;
  title: string;
  description: string;
  categories: string[];
  toolsUsed: string[];
  nodeCount?: number;
  relevanceExplanation: string;
}

interface NLSearchResponse {
  intent: string;
  query: string;
  extractedTools: string[];
  extractedKeywords: string[];
  results: NLResult[];
  totalFound: number;
  message?: string;
}

interface Props {
  onSelectResult?: (result: NLResult) => void;
  className?: string;
}

const EXAMPLE_QUERIES = [
  'send Slack message when Google Form is submitted…',
  'sync Notion to Google Sheets every day…',
  'email customer when Stripe payment fails…',
  'summarize new emails and post to Slack…',
  'auto-label GitHub issues with AI…',
  'backup Airtable to Supabase weekly…',
];

export function NLSearchPanel({ onSelectResult, className = '' }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<NLSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Cycle placeholder text
  useEffect(() => {
    if (focused || query) return;
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % EXAMPLE_QUERIES.length), 3200);
    return () => clearInterval(t);
  }, [focused, query]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 3) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await apiClient.post('/search/nl', { query: q.trim(), limit: 8 });
      setResponse(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runSearch(query);
    if (e.key === 'Escape') { setQuery(''); setResponse(null); setError(null); }
  };

  const handleUseTemplate = (result: NLResult) => {
    if (onSelectResult) {
      onSelectResult(result);
    } else {
      navigate('/chat', { state: { initialPrompt: `Build me: ${result.title}` } });
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Search input bar */}
      <div className={`relative flex items-center rounded-2xl border-2 transition-all duration-200 ${
        focused
          ? 'border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-500/10'
          : 'border-slate-200 dark:border-slate-700 shadow-sm'
      } bg-white dark:bg-slate-900`}>

        {/* AI icon */}
        <div className="pl-4 pr-2 shrink-0">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
            focused || loading ? 'bg-indigo-600' : 'bg-indigo-50 dark:bg-indigo-950/60'
          }`}>
            {loading
              ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
              : <Sparkles className={`h-3.5 w-3.5 ${focused ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
            }
          </div>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={EXAMPLE_QUERIES[placeholderIdx]}
          className="flex-1 py-3.5 pr-2 text-sm font-medium bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
        />

        <div className="flex items-center gap-1.5 pr-3 shrink-0">
          {query && (
            <button
              onClick={() => { setQuery(''); setResponse(null); setError(null); inputRef.current?.focus(); }}
              className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => runSearch(query)}
            disabled={loading || !query.trim()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
              query.trim()
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI Search</span>
            <CornerDownLeft className="h-3 w-3 opacity-70" />
          </button>
        </div>
      </div>

      {/* Hint text */}
      {!response && !loading && !error && (
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium pl-1">
          Describe what you want to automate in plain English — AI will find the best matching templates.
        </p>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              AI is understanding your request and finding matching templates...
            </span>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg w-full" />
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="mt-4 rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center gap-3">
          <X className="h-4 w-4 text-rose-500 shrink-0" />
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {response && !loading && (
        <div className="mt-5 space-y-4">
          {/* Intent header */}
          <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
            <Lightbulb className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1">AI understood your request as</p>
              <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 leading-relaxed">{response.intent}</p>

              {/* Extracted tools chips */}
              {response.extractedTools?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <Tag className="h-3 w-3 text-indigo-400" />
                  {response.extractedTools.map((tool) => (
                    <span key={tool} className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/60 rounded-md px-2 py-0.5">
                      {tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {response.totalFound} {response.totalFound === 1 ? 'template' : 'templates'} found
            </span>
            {response.totalFound > 0 && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Sorted by relevance</span>
            )}
          </div>

          {/* No results */}
          {response.totalFound === 0 && (
            <div className="text-center py-10">
              <Search className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No templates found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                {response.message || 'Try different keywords or browse templates by category below.'}
              </p>
            </div>
          )}

          {/* Result cards */}
          <div className="space-y-3">
            {response.results.map((result, idx) => (
              <div
                key={result.id}
                className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  {/* Rank badge */}
                  <div className={`shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black border ${
                    idx === 0
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {idx === 0 ? <Zap className="h-4 w-4" /> : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                        {result.title}
                      </h4>
                      {idx === 0 && (
                        <span className="shrink-0 text-[9px] font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-md px-1.5 py-0.5 uppercase tracking-wide">
                          Best Match
                        </span>
                      )}
                    </div>

                    {/* AI relevance explanation */}
                    <div className="flex items-start gap-1.5 mt-1.5">
                      <Sparkles className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 leading-relaxed italic">
                        {result.relevanceExplanation}
                      </p>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {result.description}
                    </p>

                    {/* Tool chips */}
                    {result.toolsUsed?.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                        {result.toolsUsed.slice(0, 5).map((tool) => (
                          <span key={tool} className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5">
                            {tool}
                          </span>
                        ))}
                        {result.toolsUsed.length > 5 && (
                          <span className="text-[10px] text-slate-400 font-medium">+{result.toolsUsed.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {result.categories?.slice(0, 2).map((cat) => (
                      <span key={cat} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        {cat}
                      </span>
                    ))}
                    {result.nodeCount && (
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">· {result.nodeCount} nodes</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleUseTemplate(result)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <span>Use Template</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Try another search */}
          {response.totalFound > 0 && (
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => { setQuery(''); setResponse(null); inputRef.current?.focus(); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Try a different search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
