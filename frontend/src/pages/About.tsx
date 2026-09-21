import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Bot, Layers, ShieldCheck, Zap, ArrowRight, Heart, Cpu, Globe } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-slate-50/60 py-16 px-4 sm:px-6 lg:px-8 text-slate-900 antialiased">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-150 text-xs font-extrabold text-indigo-700 tracking-wide uppercase">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Our Mission &amp; Story</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-display text-slate-950 tracking-tight leading-tight">
            Democratizing workflow automation with conversational AI.
          </h1>

          <p className="text-base sm:text-lg font-medium text-slate-600 leading-relaxed">
            We believe you shouldn't need a computer science degree or spend weeks reading complex API manuals just to connect your business tools.
          </p>
        </div>

        {/* Narrative Section */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6 text-sm leading-relaxed text-slate-700">
          <h2 className="text-2xl font-black font-display text-slate-950">
            The Problem We Set Out to Solve
          </h2>
          <p>
            Modern workflow automation tools like <strong>n8n</strong> are exceptionally powerful, giving developers complete sovereignty over their infrastructure. But for non-technical operators, founders, and growing businesses, the learning curve is steep: writing complex JSON schemas, mapping nested data expressions, handling authentication flows, and linking dozens of intricate nodes.
          </p>
          <p>
            <strong>Qonace</strong> was engineered by <strong>Alive Technologies Ltd</strong> to bridge that gap permanently. We built an intelligent conversational compiler that translates simple human language into precise, production-ready n8n workflows in seconds.
          </p>
          <p>
            Instead of manually dragging nodes on a blank screen, you simply chat with Qonace: <em>“Whenever a high-value Stripe charge succeeds, verify the customer in HubSpot and send an executive celebration alert to Slack.”</em> Qonace plans the architecture, assigns parameters, wires the logic, and delivers a downloadable, runnable n8n workflow file.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-white border border-slate-200/90 rounded-3xl shadow-sm space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black font-display text-slate-950">Zero Vendor Lock-In</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Your workflows belong to you. We export standard, vendor-neutral n8n JSON files that you can run on your own self-hosted servers, Docker containers, or n8n cloud instances.
            </p>
          </div>

          <div className="p-8 bg-white border border-slate-200/90 rounded-3xl shadow-sm space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black font-display text-slate-950">Zero-Secret Security</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              We never ask for or store your third-party API keys or private database passwords. All secret credentials remain securely in your private execution environment.
            </p>
          </div>

          <div className="p-8 bg-white border border-slate-200/90 rounded-3xl shadow-sm space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
              <Cpu className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black font-display text-slate-950">200+ Node Precision</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Backed by our comprehensive schema registry and the cognitive power of Claude 3.5 Sonnet, Qonace generates compliant topologies with ~95% compilation accuracy.
            </p>
          </div>
        </div>

        {/* The Technology Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-indigo-300">
            <Bot className="h-4 w-4" />
            <span>Built on Frontier AI Architecture</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight">
            Engineered for reliability, velocity, and enterprise trust.
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl font-medium">
            Qonace pairs frontier reasoning models (Anthropic Claude 3.5 Sonnet via AWS Bedrock) with a dedicated TypeScript compiler, real-time node schemas, and multi-cloud edge infrastructure.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              to="/sign-in"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-100 transition-all shadow-md"
            >
              <span>Try Qonace Free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all border border-white/10"
            >
              <span>Contact Team</span>
            </Link>
          </div>
        </div>

        {/* Corporate Note */}
        <div className="text-center text-xs text-slate-500 font-medium">
          <p>© 2026 Alive Technologies Ltd. All rights reserved. • Registered in United Kingdom &amp; Global Operations</p>
        </div>
      </div>
    </div>
  );
}
