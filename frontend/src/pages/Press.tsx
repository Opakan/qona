import React from 'react';
import { Newspaper, Download, Mail, ExternalLink, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Press() {
  return (
    <div className="min-h-screen bg-slate-50/60 py-16 px-4 sm:px-6 lg:px-8 text-slate-900 antialiased">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-150 text-xs font-extrabold text-indigo-700 tracking-wide uppercase">
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
          <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-sm text-center">
            <span className="text-3xl sm:text-4xl font-black font-display text-indigo-600 block">200+</span>
            <span className="text-xs font-bold text-slate-700 mt-1 block">Supported Service Nodes</span>
            <span className="text-[10px] text-slate-400 font-medium">Stripe, Slack, CRM, DB</span>
          </div>

          <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-sm text-center">
            <span className="text-3xl sm:text-4xl font-black font-display text-indigo-600 block">~95%</span>
            <span className="text-xs font-bold text-slate-700 mt-1 block">Workflow Compilation Accuracy</span>
            <span className="text-[10px] text-slate-400 font-medium">Claude 3.5 Sonnet Brain</span>
          </div>

          <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-sm text-center">
            <span className="text-3xl sm:text-4xl font-black font-display text-indigo-600 block">v1.0+</span>
            <span className="text-xs font-bold text-slate-700 mt-1 block">Native n8n Schema Support</span>
            <span className="text-[10px] text-slate-400 font-medium">Vendor-Neutral Format</span>
          </div>

          <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-sm text-center">
            <span className="text-3xl sm:text-4xl font-black font-display text-indigo-600 block">100%</span>
            <span className="text-xs font-bold text-slate-700 mt-1 block">Zero-Secret Security</span>
            <span className="text-[10px] text-slate-400 font-medium">Credentials stay private</span>
          </div>
        </div>

        {/* Company Overview & Boilerplate */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6 text-sm leading-relaxed text-slate-700">
          <h2 className="text-2xl font-black font-display text-slate-950">
            About Qonace (Boilerplate)
          </h2>
          <p>
            <strong>Qonace</strong> is an AI-powered conversational workflow automation platform developed by <strong>Alive Technologies Ltd</strong>. Designed to democratize technical operations, Qonace translates plain-English prompts into production-grade, downloadable <strong>n8n workflows</strong> in seconds.
          </p>
          <p>
            By combining Anthropic's Claude 3.5 Sonnet with a dedicated n8n node compiler and an interactive 3-pane visual canvas, Qonace allows anyone—from non-technical business operators to senior developers—to build, preview, and export enterprise automations without complex manual configuration.
          </p>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
            <p><strong>Founded:</strong> 2026</p>
            <p><strong>Parent Company:</strong> Alive Technologies Ltd</p>
            <p><strong>Headquarters:</strong> London, United Kingdom (Global Distributed Team)</p>
            <p><strong>Category:</strong> Artificial Intelligence, Workflow Automation, Developer Tools, SaaS</p>
            <p><strong>Website:</strong> <a href="https://qonace.com" className="text-indigo-600 font-bold hover:underline">https://qonace.com</a></p>
          </div>
        </div>

        {/* Brand Assets & Logo Kit */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          <h2 className="text-2xl font-black font-display text-slate-950">
            Official Brand Assets
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Please use official Qonace brand marks when covering our platform. Do not alter colors, angles, or proportions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            {/* Logo Card 1: Official Logo */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-between space-y-4">
              <div className="h-20 flex items-center justify-center">
                <img src="/logo.png" alt="Qonace Logo" className="h-14 w-14 object-contain" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-slate-900">Qonace Spiral Icon</p>
                <p className="text-[10px] text-slate-400">PNG format (High Resolution)</p>
              </div>
              <a
                href="/logo.png"
                download="qonace-logo.png"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </a>
            </div>

            {/* Colors Card */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <span className="text-xs font-black text-slate-900 block">Primary Brand Palette</span>
              <div className="space-y-2 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans font-bold">
                    <span className="h-3.5 w-3.5 rounded-md bg-[#090d16] border border-slate-700" />
                    Obsidian Ink
                  </span>
                  <span>#090d16</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans font-bold">
                    <span className="h-3.5 w-3.5 rounded-md bg-[#4f46e5]" />
                    Electric Indigo
                  </span>
                  <span>#4f46e5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans font-bold">
                    <span className="h-3.5 w-3.5 rounded-md bg-[#64748b]" />
                    Slate Neutral
                  </span>
                  <span>#64748b</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">Used across web, product, and media kit</p>
            </div>

            {/* Typography Card */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <span className="text-xs font-black text-slate-900 block">Brand Typography</span>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Display Headings</p>
                  <p className="text-sm font-black font-display text-slate-900">Outfit Bold (700-900)</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Interface &amp; Body</p>
                  <p className="text-sm font-semibold text-slate-900">Plus Jakarta Sans (500-600)</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Available free via Google Fonts</p>
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
