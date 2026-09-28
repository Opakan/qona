import React from 'react';
import { Newspaper, Download, Mail, ExternalLink, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Press() {
  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#090d16] py-16 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100 antialiased">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-150 dark:border-indigo-800/60 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 tracking-wide uppercase">
            <Newspaper className="h-3.5 w-3.5 text-indigo-600" />
            <span>Media &amp; Press Kit</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-display text-slate-950 tracking-tight">
            Newsroom &amp; Brand Resources
          </h1>

          <p className="text-base sm:text-lg font-medium text-slate-600 leading-relaxed">
            Everything you need to write about Qonace, including official company background, key metrics, brand logos, and media contacts.
          </p>
        </div>

        {/* Quick Facts Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { stat: '200+', label: 'Supported Service Nodes', sub: 'Stripe, Slack, CRM, DB' },
            { stat: '~95%', label: 'Workflow Compilation Accuracy', sub: 'Claude 3.5 Sonnet Brain' },
            { stat: 'v1.0+', label: 'Native n8n Schema Support', sub: 'Vendor-Neutral Format' },
            { stat: '100%', label: 'Zero-Secret Security', sub: 'Credentials stay private' },
          ].map(({ stat, label, sub }) => (
            <div key={stat} className="p-6 bg-white dark:bg-[#0f1624] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl shadow-sm text-center">
              <span className="text-3xl sm:text-4xl font-black font-display text-indigo-600 dark:text-indigo-400 block">{stat}</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">{label}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{sub}</span>
            </div>
          ))}
        </div>

        {/* Company Overview & Boilerplate */}
        <div className="bg-white dark:bg-[#0f1624] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <h2 className="text-2xl font-black font-display text-slate-950 dark:text-white">
            About Qonace (Boilerplate)
          </h2>
          <p>
            <strong>Qonace</strong> is an AI-powered conversational workflow automation platform developed by <strong>Alive Technologies Ltd</strong>. Designed to democratize technical operations, Qonace translates plain-English prompts into production-grade, downloadable <strong>n8n workflows</strong> in seconds.
          </p>
          <p>
            By combining Anthropic's Claude 3.5 Sonnet with a dedicated n8n node compiler and an interactive 3-pane visual canvas, Qonace allows anyone—from non-technical business operators to senior developers—to build, preview, and export enterprise automations without complex manual configuration.
          </p>

          <div className="p-4 bg-slate-50 dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-1 text-slate-700 dark:text-slate-300">
            <p><strong>Founded:</strong> 2026</p>
            <p><strong>Parent Company:</strong> Alive Technologies Ltd</p>
            <p><strong>Headquarters:</strong> London, United Kingdom (Global Distributed Team)</p>
            <p><strong>Category:</strong> Artificial Intelligence, Workflow Automation, Developer Tools, SaaS</p>
            <p><strong>Website:</strong> <a href="https://qonace.com" className="text-indigo-600 font-bold hover:underline">https://qonace.com</a></p>
          </div>
        </div>

        {/* Brand Assets & Logo Kit */}
        <div className="bg-white dark:bg-[#0f1624] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-2xl font-black font-display text-slate-950 dark:text-white">
            Official Brand Assets
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Please use official Qonace brand marks when covering our platform. Do not alter colors, angles, or proportions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            {/* Logo Card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f1e] flex flex-col items-center justify-between space-y-4">
              <div className="h-20 flex items-center justify-center">
                <img src="/logo.png" alt="Qonace Logo" className="h-14 w-14 object-contain" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-slate-900 dark:text-white">Qonace Spiral Icon</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">PNG format (High Resolution)</p>
              </div>
              <a href="/logo.png" download="qonace-logo.png"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs">
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </a>
            </div>

            {/* Colors Card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f1e] flex flex-col justify-between space-y-3">
              <span className="text-xs font-black text-slate-900 dark:text-white block">Primary Brand Palette</span>
              <div className="space-y-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans font-bold"><span className="h-3.5 w-3.5 rounded-md bg-[#090d16] border border-slate-700" />Obsidian Ink</span>
                  <span>#090d16</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans font-bold"><span className="h-3.5 w-3.5 rounded-md bg-[#4f46e5]" />Electric Indigo</span>
                  <span>#4f46e5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans font-bold"><span className="h-3.5 w-3.5 rounded-md bg-[#64748b]" />Slate Neutral</span>
                  <span>#64748b</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">Used across web, product, and media kit</p>
            </div>

            {/* Typography Card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f1e] flex flex-col justify-between space-y-3">
              <span className="text-xs font-black text-slate-900 dark:text-white block">Brand Typography</span>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-wider">Display Headings</p>
                  <p className="text-sm font-black font-display text-slate-900 dark:text-white">Sora Bold (700-900)</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-wider">Interface &amp; Body</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">Inter (400-600)</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Available free via Google Fonts</p>
            </div>
          </div>
        </div>

        {/* Media Contact Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-black font-display">
              Media Inquiries &amp; Interview Requests
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
              Are you a journalist, tech reviewer, or podcast host? Contact our communications team for founder interviews, product demos, and press statements.
            </p>
          </div>

          <a
            href="mailto:press@qonace.com"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-100 transition-all shadow-md shrink-0"
          >
            <Mail className="h-4 w-4" />
            <span>Contact Press Team</span>
          </a>
        </div>
      </div>
    </div>
  );
}
