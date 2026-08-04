import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Plus, MessageSquare, Trash2, ArrowUp, Sparkles, Workflow, Play,
  LogOut, History, Loader2, LayoutDashboard, Download, Copy, Check,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Lightbulb, Crown, Paperclip, ChevronDown, Bot, User as UserIcon,
  ShieldCheck, RefreshCw, Cpu, Layers
} from 'lucide-react';
import apiClient from '../api/client';
import WorkflowGraph from '../components/chat/WorkflowGraph';
import { SetupGuideCard } from '../components/SetupGuideCard';
import { ExecutionPreviewModal } from '../components/ExecutionPreview/ExecutionPreviewModal';
import { UpgradeProModal } from '../components/chat/UpgradeProModal';
import { useAuth } from '../context/AuthContext';
import type { InternalGraph } from '@qona/shared';

interface ConversationItem {
  id: string;
  title: string;
  status: string;
  createdAt?: string;
  _count?: { messages: number };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}

export default function ChatPage() {
  const { user, dbUser, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<InternalGraph | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // ChatGPT-style UI toggles
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [selectedModel, setSelectedModel] = useState('Qonace 4o-mini (Workflow Compiler)');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationTrace, setSimulationTrace] = useState<any | null>(null);
  const [showSimulationModal, setShowSimulationModal] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSimulateExecution = async (customPayload?: Record<string, unknown>) => {
    setSimulating(true);
    try {
      if (currentWorkflow) {
        const { data } = await apiClient.post('/workflows/simulate', {
          graph: currentWorkflow,
          customTriggerPayload: customPayload,
        });
        if (data.trace) {
          setSimulationTrace(data.trace);
        }
      }
    } catch (err: any) {
      console.warn('Backend simulation call failed, falling back to client simulation:', err);
    } finally {
      setSimulating(false);
      setShowSimulationModal(true);
    }
  };

  const handleCopyForN8n = async () => {
    if (!sessionId || exporting) return;
    try {
      const { data } = await apiClient.post(`/sessions/${sessionId}/compile`);
      if (data.compiled && data.n8n) {
        await navigator.clipboard.writeText(JSON.stringify(data.n8n, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        alert(data.message || 'Cannot copy workflow yet. Please answer the clarification questions first!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Copy failed');
    }
  };

  const handleExportSession = async () => {
    if (!sessionId || exporting) return;
    setExporting(true);
    try {
      const { data } = await apiClient.post(`/sessions/${sessionId}/compile`);
      if (data.compiled && data.n8n) {
        const blob = new Blob([JSON.stringify(data.n8n, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = (currentWorkflow?.metadata as any)?.name || 'workflow';
        a.download = `${name.toLowerCase().replace(/\s+/g, '_')}_n8n.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert(data.message || 'Cannot export workflow. Please complete the clarification questions first!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const promptText = `I uploaded an n8n JSON workflow file ("${file.name}"). Please analyze its nodes and reconstruct it in Qonace: ${JSON.stringify(parsed).slice(0, 500)}...`;
        sendMessage(promptText);
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ conversations: ConversationItem[] }>('/conversations');
      setConversations(data.conversations);
    } catch { /* ignore */ }
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    try {
      const { data } = await apiClient.get(`/conversations/${id}`);
      const conv = data.conversation;
      const msgs: Message[] = conv?.messages ?? [];
      setMessages(msgs);

      for (const msg of msgs) {
        const meta = msg.metadata as Record<string, unknown> | undefined;
        if (meta?.sessionId) setSessionId(meta.sessionId as string);
        if (meta?.graph) { setCurrentWorkflow(meta.graph as InternalGraph); return; }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  useEffect(() => { if (activeId) fetchMessages(activeId); }, [activeId, fetchMessages]);

  useEffect(() => {
    const selectedTemplate = location.state?.selectedTemplate;
    const initialPrompt = location.state?.initialPrompt;
    if (selectedTemplate) {
      const prompt = `I want to use the ready-made template: "${selectedTemplate.name}". ${selectedTemplate.description}`;
      sendMessage(prompt);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (initialPrompt) {
      sendMessage(initialPrompt);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  // Live graph sync polling
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (!sessionId) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await apiClient.get(`/sessions/${sessionId}/draft`);
        if (data.draft) setCurrentWorkflow(data.draft as InternalGraph);
      } catch { /* ignore */ }
    }, 2000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [sessionId]);

  const sendMessage = async (text: string) => {
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTyping(true);

    try {
      let convId = activeId;
      if (!convId) {
        const { data } = await apiClient.post<{ conversation: { id: string } }>('/conversations', { title: text.slice(0, 80) || 'New conversation' });
        convId = data.conversation.id;
        setActiveId(convId);
        fetchConversations();
      }

      const { data } = await apiClient.post(`/conversations/${convId}/messages`, { content: text });

      const meta: Record<string, unknown> = {};
      if (data.sessionId) { meta.sessionId = data.sessionId; setSessionId(data.sessionId as string); }
      if (data.type === 'clarification' && data.questions) meta.questions = data.questions;
      if (data.type === 'workflow' && data.graph) {
        meta.graph = data.graph;
        setCurrentWorkflow(data.graph as InternalGraph);
      }

      setTyping(false);
      const reply: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.explanation ?? data.error ?? data.singleQuestion?.question ?? 'Workflow generated successfully.',
        metadata: Object.keys(meta).length > 0 ? meta : undefined,
      };
      setMessages((prev) => [...prev, reply]);
    } catch (err: unknown) {
      setTyping(false);
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: err instanceof Error ? err.message : 'Something went wrong while compiling.' }]);
    } finally {
      setLoading(false);
      fetchConversations();
    }
  };

  const handleSubmit = () => { const t = input.trim(); if (t && !loading) sendMessage(t); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } };
  const newConversation = () => { setActiveId(null); setMessages([]); setCurrentWorkflow(null); setSessionId(null); };
  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/conversations/${id}`);
      if (activeId === id) { setActiveId(null); setMessages([]); setCurrentWorkflow(null); setSessionId(null); }
      fetchConversations();
    } catch { /* ignore */ }
  };

  const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U';
  const userName = dbUser?.name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User';

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900 antialiased font-sans">
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 1. LEFT SIDEBAR (ChatGPT Style)                                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <aside
        className={`flex flex-col border-r border-slate-200/80 bg-slate-950 text-slate-300 transition-all duration-300 ease-in-out relative z-30 ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0'
        }`}
      >
        {/* Sidebar Top Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-slate-800/80">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-white hover:opacity-90 transition-opacity">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Workflow className="h-4 w-4" />
            </div>
            <span className="text-sm font-extrabold tracking-tight">Qonace AI</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Action Button: + New Chat */}
        <div className="p-3">
          <button
            onClick={newConversation}
            className="flex w-full items-center justify-start gap-2.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-850 hover:border-slate-700 transition-all cursor-pointer group"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-white group-hover:scale-110 transition-transform">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <span>New Workflow Chat</span>
          </button>
        </div>

        {/* Conversation History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
              Recent Conversations
            </div>
            {conversations.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-slate-500 font-medium">
                No recent workflow chats
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => { setActiveId(conv.id); fetchMessages(conv.id); }}
                    className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all cursor-pointer ${
                      activeId === conv.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{conv.title}</span>
                    <Trash2
                      onClick={(e) => deleteConversation(e, conv.id)}
                      className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer: Upgrade to Pro & User Profile */}
        <div className="border-t border-slate-800/90 p-3 space-y-2.5 bg-slate-950">
          {/* Upgrade to Pro Card */}
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-purple-500/15 border border-amber-500/30 p-2.5 text-left transition-all hover:border-amber-400/60 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-slate-950 shadow-xs font-bold">
                <Crown className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white group-hover:text-amber-300 transition-colors">Upgrade to Pro</div>
                <div className="text-[10px] font-medium text-slate-400">Unlimited compilations & n8n export</div>
              </div>
            </div>
          </button>

          {/* User Profile Row */}
          <div className="flex items-center justify-between rounded-xl p-2 hover:bg-slate-900 transition-colors">
            <div className="flex items-center gap-2.5 truncate">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-extrabold text-xs uppercase">
                {userInitial}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-200 truncate">{userName}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>

            <button
              onClick={async () => { await signOut(); navigate('/sign-in'); }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 2. CENTER CHAT WORKSPACE                                        */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col min-w-0 bg-white relative">
        {/* Main Header Bar (ChatGPT style) */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200/80 px-4 sm:px-6 bg-white/90 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Open Sidebar"
              >
                <PanelLeftOpen className="h-4.5 w-4.5" />
              </button>
            )}

            {/* ChatGPT-style Model Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <Bot className="h-4 w-4 text-indigo-600" />
                <span>{selectedModel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {showModelDropdown && (
                <div className="absolute left-0 mt-1.5 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in duration-150">
                  {[
                    { title: 'Qonace 4o-mini (Workflow Compiler)', desc: 'Fast, production-ready n8n node compilation', badge: 'Default' },
                    { title: 'Qonace Pro (n8n Expert Engine)', desc: 'Advanced AI agent & custom HTTP workflow graph', badge: 'Pro' },
                  ].map((m) => (
                    <button
                      key={m.title}
                      onClick={() => { setSelectedModel(m.title); setShowModelDropdown(false); }}
                      className={`flex w-full flex-col text-left p-2.5 rounded-xl transition-all cursor-pointer ${
                        selectedModel === m.title ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{m.title}</span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-600">{m.badge}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Toolbar Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulateExecution()}
              disabled={simulating || !currentWorkflow}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-100 disabled:opacity-40 transition-all cursor-pointer"
            >
              {simulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              <span>Simulate Run</span>
            </button>

            {sessionId && (
              <>
                <button
                  onClick={handleCopyForN8n}
                  className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-100 transition-all cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy n8n'}</span>
                </button>

                <button
                  onClick={handleExportSession}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  <span>Export</span>
                </button>
              </>
            )}

            <button
              onClick={() => setShowVisualizer(!showVisualizer)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                showVisualizer
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title="Toggle Workflow Canvas Split-View"
            >
              {showVisualizer ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              <span className="hidden xs:inline">Canvas</span>
            </button>
          </div>
        </header>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto bg-white">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 sm:px-6 max-w-3xl mx-auto space-y-8 select-none py-12">
              {/* ChatGPT Hero Banner */}
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                  <Workflow className="h-7 w-7" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  What workflow shall we build?
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                  Describe any automation idea in plain English. Qonace will collect parameters and build production-ready n8n nodes.
                </p>
              </div>

              {/* Preset Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                {[
                  {
                    title: '⚡ Stripe Payment to Slack',
                    desc: 'Notify Slack channels when customer subscription succeeds.',
                    prompt: 'Create a customer onboarding workflow that syncs Stripe payments to Slack.'
                  },
                  {
                    title: '🤖 Email Lead Auto-responder',
                    desc: 'Extract contact details from Webhooks and save to Google Sheets.',
                    prompt: 'Create a webhook trigger that appends contact form submissions to Google Sheets.'
                  },
                  {
                    title: '📊 Daily Database Digest',
                    desc: 'Fetch daily active database users and email a executive summary report.',
                    prompt: 'Set up a daily cron schedule to fetch active database users and email a report.'
                  },
                  {
                    title: '💬 Telegram Webhook Bot',
                    desc: 'Process incoming Telegram messages with AI and respond automatically.',
                    prompt: 'Create an automated Telegram AI bot workflow using OpenAI and Webhooks.'
                  }
                ].map((card) => (
                  <button
                    key={card.title}
                    onClick={() => { setInput(card.prompt); inputRef.current?.focus(); }}
                    className="flex flex-col text-left p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-400 hover:shadow-md transition-all duration-200 cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-1.5 transition-colors">
                      <Lightbulb className="h-3.5 w-3.5 text-indigo-500" />
                      {card.title}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                      {card.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 py-8">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-2xs select-none ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {msg.role === 'user' ? userInitial : <Workflow className="h-4 w-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-5 py-3.5 text-xs sm:text-sm leading-relaxed max-w-[85%] shadow-2xs ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white font-medium'
                        : 'bg-slate-50 text-slate-900 border border-slate-200/70 font-normal'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Assistant Graph Summary Card */}
                    {Boolean(msg.metadata?.graph) && (
                      <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-3.5 shadow-2xs text-slate-900">
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                            Workflow Compiled
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Ready on Canvas
                          </span>
                        </div>
                        <div className="text-xs font-extrabold text-slate-800">
                          {String((msg.metadata as any)?.graph?.metadata?.name || 'Compiled Automation')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-2xs">
                    <Workflow className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-5 py-3.5 border border-slate-200/70 shadow-2xs">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600" style={{ animationDelay: '0.15s' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600" style={{ animationDelay: '0.3s' }} />
                    </div>
                    <span className="text-xs font-medium text-slate-500 ml-2">Compiling workflow nodes...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Floating Quick Controls Toolbar */}
        <div className="absolute right-4 top-20 flex flex-col gap-2 z-10">
          <div className="backdrop-blur-md bg-white/80 border border-slate-200/90 rounded-2xl p-1.5 shadow-lg flex flex-col gap-1.5">
            <button
              onClick={newConversation}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
              title="New Chat"
            >
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </button>
            <button
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
              title="Scroll to Bottom"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ChatGPT Bottom Input Box */}
        <div className="border-t border-slate-200/70 px-4 sm:px-6 py-4 bg-white">
          <div className="relative max-w-3xl mx-auto rounded-3xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-200/40 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            {/* Preset Suggestions Row above textarea */}
            <div className="flex items-center gap-1.5 overflow-x-auto px-3 pt-1.5 pb-1 scrollbar-none">
              {[
                { label: '⚡ Stripe to Slack', prompt: 'Sync Stripe payments to Slack.' },
                { label: '🤖 AI Email Lead', prompt: 'Auto-respond to incoming email leads with AI.' },
                { label: '📊 Sheets Sync', prompt: 'Append webhook payload to Google Sheets.' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => { setInput(chip.prompt); inputRef.current?.focus(); }}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your automation workflow..."
              rows={2}
              className="w-full resize-none border-0 bg-transparent px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-0 text-xs sm:text-sm outline-none min-h-[52px]"
            />

            {/* Bottom Controls Row inside Input Box */}
            <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Upload n8n JSON Workflow file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <span className="text-[10px] font-semibold text-slate-450 hidden xs:inline">
                  Press Enter to send
                </span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!input.trim() || loading}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition-all hover:bg-indigo-700 disabled:opacity-30 cursor-pointer"
              >
                <ArrowUp className="h-4.5 w-4.5 stroke-[3]" />
              </button>
            </div>
          </div>

          <div className="mt-2 text-center text-[10px] font-semibold text-slate-400">
            Qonace AI builds production-ready n8n workflows. Verify nodes before deployment.
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 3. RIGHT WORKFLOW CANVAS VISUALIZER                             */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <aside
        className={`flex flex-col border-l border-slate-200/80 bg-slate-50 transition-all duration-300 ease-in-out ${
          showVisualizer ? 'w-[480px]' : 'w-0 overflow-hidden border-l-0'
        }`}
      >
        {/* Canvas Header */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200/80 px-5 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Workflow Canvas
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSimulateExecution()}
              disabled={simulating || !currentWorkflow}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 disabled:opacity-40 transition-all cursor-pointer"
            >
              {simulating ? <Loader2 className="h-3 w-3 animate-spin text-emerald-700" /> : <Play className="h-3 w-3 fill-current text-emerald-700" />}
              <span>{simulating ? 'Simulating...' : 'Simulate'}</span>
            </button>

            {sessionId && (
              <button
                onClick={handleCopyForN8n}
                className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-indigo-600" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Graph Canvas Container */}
        <div className="flex-1 relative bg-slate-100">
          {currentWorkflow ? (
            <WorkflowGraph graph={currentWorkflow} className="h-full" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200/80 text-slate-400">
                <Workflow className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Visualizer Ready</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Your node graph will dynamically generate here in real-time as you chat with Qonace AI.
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Execution Simulation Trace Modal */}
      <ExecutionPreviewModal
        trace={simulationTrace}
        currentGraph={(currentWorkflow as any) || undefined}
        isOpen={showSimulationModal}
        onClose={() => setShowSimulationModal(false)}
        onExport={handleExportSession}
        onRerunSimulation={(customPayload) => handleSimulateExecution(customPayload)}
      />

      {/* Upgrade to Pro Modal */}
      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
