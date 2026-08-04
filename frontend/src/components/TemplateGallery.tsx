import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Search, Zap, CheckCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { Template } from '@qona/shared';

interface TemplateGalleryProps {
  onSelectTemplate?: (template: Template) => void;
  featuredOnly?: boolean;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelectTemplate, featuredOnly = false }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('AI & Automation');
  const [displayCount, setDisplayCount] = useState<number>(12);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const url = featuredOnly ? '/templates?featured=true' : '/templates';
        const res = await apiClient.get(url);
        if (res.data?.templates) {
          setTemplates(res.data.templates);
        }
      } catch (err) {
        console.warn('[TemplateGallery] Failed to fetch templates:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [featuredOnly]);

  // Reset pagination when category or search changes
  useEffect(() => {
    setDisplayCount(12);
  }, [selectedCategory, searchQuery]);

  const rawCategories = Array.from(new Set(templates.map((t) => t.category || 'Automation')));
  const categories = ['AI & Automation', 'All', ...rawCategories.filter((c) => c !== 'AI & Automation')];

  const filteredTemplates = templates.filter((t) => {
    const category = t.category || 'Automation';
    const tags = t.tags || [];

    let matchesCategory = false;
    if (selectedCategory === 'All') {
      matchesCategory = true;
    } else if (selectedCategory === 'AI & Automation') {
      matchesCategory =
        category === 'AI' ||
        category === 'Automation' ||
        category === 'AI & Automation' ||
        tags.some((tag) => ['ai', 'automation', 'openai', 'gpt', 'llm'].includes(String(tag).toLowerCase()));
    } else {
      matchesCategory = category === selectedCategory;
    }

    const name = t.name || '';
    const description = t.description || '';
    const matchesSearch =
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
            {categories.slice(0, 8).map((cat) => (
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
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                      <Zap className="h-3 w-3 text-indigo-600" />
                      {template.category || 'Automation'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {template.difficulty || 'Intermediate'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {template.name || 'Untitled Automation'}
                  </h4>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {template.description || 'Ready-made n8n automation template.'}
                  </p>

                  {/* Plain English Bullet Highlights */}
                  {Array.isArray(template.plainEnglishSummary) && template.plainEnglishSummary.length > 0 && (
                    <ul className="mt-3 space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2.5">
                      {template.plainEnglishSummary.slice(0, 2).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle className="h-3 w-3 shrink-0 text-emerald-500 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                  <div className="flex flex-wrap gap-1">
                    {(template.tags || []).slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-700 cursor-pointer"
                  >
                    <span>Use Template</span>
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
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
              >
                <span>Load More Templates ({filteredTemplates.length - displayedTemplates.length} remaining)</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
