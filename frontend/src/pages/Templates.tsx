import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Search,
  Zap,
  CheckCircle,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  ArrowUpDown,
  BookOpen,
  Cpu,
  Compass,
  SlidersHorizontal,
  X,
  Loader2,
} from 'lucide-react';
import type { Template } from '@qona/shared';
import apiClient from '../api/client';
import { TemplateDetailsModal, downloadTemplateJson } from '../components/TemplateDetailsModal';
import ThemeToggle from '../components/shared/ThemeToggle';

const ITEMS_PER_PAGE = 24;

const CATEGORIES = [
  { id: 'All', label: 'All Templates' },
  { id: 'AI', label: 'AI & Agents' },
  { id: 'Marketing', label: 'Marketing' },
  { id: 'Sales', label: 'Sales & CRM' },
  { id: 'DevOps', label: 'DevOps & Cloud' },
  { id: 'Finance', label: 'Finance & Payments' },
  { id: 'Customer Support', label: 'Customer Support' },
  { id: 'Data Management', label: 'Data & Databases' },
  { id: 'Communication', label: 'Communication' },
  { id: 'Ecommerce', label: 'E-Commerce' },
];

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'popular' | 'name' | 'difficulty'>('popular');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTemplateForDetails, setSelectedTemplateForDetails] = useState<Template | null>(null);

  // Load catalog on mount
  useEffect(() => {
    let cancelled = false;
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const staticRes = await fetch('/templates-catalog.json');
        if (staticRes.ok) {
          const staticData = await staticRes.json();
          if (!cancelled && Array.isArray(staticData) && staticData.length > 0) {
            setTemplates(staticData);
            setLoading(false);
            return;
          }
        }
      } catch {
        /* Fallback to API */
      }

      try {
        const res = await apiClient.get('/templates');
        if (!cancelled && res.data?.templates && res.data.templates.length > 0) {
          setTemplates(res.data.templates);
        }
      } catch (err) {
        console.warn('[Templates] Could not fetch catalog:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTemplates();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, sortBy]);

  // Filter & sort templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const mainCat = (t.category || '').toLowerCase();
        const catList = ((t as any).categories || []).map((c: string) => String(c).toLowerCase());
        const tags = (t.tags || []).map((tg) => String(tg).toLowerCase());
        const target = selectedCategory.toLowerCase();

        const matches =
          mainCat.includes(target) ||
          catList.some((c: string) => c.includes(target)) ||
          tags.some((tg: string) => tg.includes(target));

        if (!matches) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (t.name || (t as any).title || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const tags = (t.tags || []).join(' ').toLowerCase();
        const tools = ((t as any).toolsUsed || []).join(' ').toLowerCase();

        if (!name.includes(q) && !desc.includes(q) && !tags.includes(q) && !tools.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Sort templates
  const sortedTemplates = useMemo(() => {
    const list = [...filteredTemplates];
    if (sortBy === 'popular') {
      list.sort((a, b) => ((b as any).totalViews || 0) - ((a as any).totalViews || 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'difficulty') {
      const rank: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };
      list.sort((a, b) => (rank[a.difficulty || 'Intermediate'] || 2) - (rank[b.difficulty || 'Intermediate'] || 2));
    }
    return list;
  }, [filteredTemplates, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedTemplates.length / ITEMS_PER_PAGE) || 1;
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTemplates.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedTemplates, currentPage]);

  const handleUseTemplate = (template: Template) => {
    const prompt = `I want to build an n8n automation workflow based on the "${template.name}" template. Description: ${template.description}`;
    navigate('/chat', { state: { initialPrompt: prompt, templateId: template.id } });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate pagination page numbers
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 dark:bg-[#070a12] text-slate-900 dark:text-slate-100 antialiased transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-slate-800/80 bg-white/80 dark:bg-[#090d16]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white hover:opacity-85 transition-opacity"
            >
              <img src="/logo.png" alt="Qonace" className="h-5 w-5 object-contain" />
              <span className="text-[17px] font-extrabold font-display tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 dark:from-white dark:via-indigo-200 dark:to-indigo-300 bg-clip-text text-transparent">
                Qonace
              </span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
              Automation Templates
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 py-8 sm:py-10 space-y-8">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-10 backdrop-blur-xl shadow-xs">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/15 dark:to-purple-500/15 blur-3xl" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <span>14,000+ Pre-Configured n8n Workflows</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-slate-950 dark:text-white">
                  Automation Blueprint Library
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
                  Browse, filter, and inspect verified ready-to-run automation templates. Select any blueprint to load directly into the Qonace AI Builder with full parameter customization.
                </p>
              </div>

              <button
                onClick={() => navigate('/chat')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all cursor-pointer shrink-0"
              >
                <Zap className="h-4 w-4" />
                <span>Build Custom from Scratch</span>
              </button>
            </div>
          </div>

          {/* Search & Sort Controls Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keywords, apps, webhooks (e.g. Stripe, Slack, OpenAI, CSV)..."
                className="w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/80 py-2.5 pl-10 pr-9 text-xs font-semibold text-slate-900 dark:text-white shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort & Result Counter */}
            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {sortedTemplates.length.toLocaleString()}
                </span>{' '}
                templates
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label="Sort templates"
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                >
                  <option value="popular">Most Popular</option>
                  <option value="name">Alphabetical (A-Z)</option>
                  <option value="difficulty">Difficulty Level</option>
                </select>
              </div>
            </div>
          </div>

          {/* Use Case / Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                    active
                      ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                      : 'border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="my-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs font-bold">Indexing template library...</p>
            </div>
          ) : paginatedTemplates.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-12 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No matching blueprints found</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                No templates matched your current filter criteria. Try adjusting your search term or select "All Templates".
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {paginatedTemplates.map((template) => {
                const tools = (template as any).toolsUsed || [];
                const difficultyColor =
                  template.difficulty === 'Beginner'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                    : template.difficulty === 'Intermediate'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                    : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800/60';

                return (
                  <div
                    key={template.id}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                          {template.category || 'Automation'}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${difficultyColor}`}
                        >
                          {template.difficulty || 'Intermediate'}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {template.name}
                      </h3>

                      {/* Description */}
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed font-normal">
                        {template.description}
                      </p>

                      {/* Tools Used Pills */}
                      {tools.length > 0 && (
                        <div className="mt-3.5 flex flex-wrap gap-1.5">
                          {tools.slice(0, 3).map((tool: string) => (
                            <span
                              key={tool}
                              className="rounded-md bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                            >
                              {tool}
                            </span>
                          ))}
                          {tools.length > 3 && (
                            <span className="rounded-md bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                              +{tools.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedTemplateForDetails(template)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => downloadTemplateJson(template)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Download n8n JSON file"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleUseTemplate(template)}
                          className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer"
                        >
                          <span>Use</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center sm:text-left">
                Showing{' '}
                <span className="font-bold text-slate-900 dark:text-white">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-slate-900 dark:text-white">
                  {Math.min(currentPage * ITEMS_PER_PAGE, sortedTemplates.length)}
                </span>{' '}
                of <span className="font-bold text-slate-900 dark:text-white">{sortedTemplates.length}</span> templates
              </div>

              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {pageNumbers.map((p, idx) => {
                  if (typeof p === 'string') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-400">
                        ...
                      </span>
                    );
                  }
                  const active = p === currentPage;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`flex h-8.5 min-w-[34px] px-2 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Template Details & Inspect Modal */}
      {selectedTemplateForDetails && (
        <TemplateDetailsModal
          template={selectedTemplateForDetails}
          isOpen={!!selectedTemplateForDetails}
          onClose={() => setSelectedTemplateForDetails(null)}
          onUseTemplate={handleUseTemplate}
        />
      )}
    </div>
  );
}
