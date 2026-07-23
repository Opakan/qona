import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Plus, MessageSquare, Trash2, ArrowUp, Sparkles, Workflow, Play,
  LogOut, History, Loader2, LayoutDashboard, Download, Copy, Check,
  PanelRightClose, PanelRightOpen, Lightbulb
} from 'lucide-react';
import apiClient from '../api/client';
import WorkflowGraph from '../components/chat/WorkflowGraph';
import { SetupGuideCard } from '../components/SetupGuideCard';
import { ExecutionPreviewModal } from '../components/ExecutionPreview/ExecutionPreviewModal';
import { useAuth } from '../context/AuthContext';

interface ConversationItem {
  id: string;
  title: string;
  status: string;
  _count?: { messages: number };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}

export default function ChatPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Record<string, unknown> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'conversations' | 'history'>('conversations');
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simulationTrace, setSimulationTrace] = useState<any | null>(null);
  const [showSimulationModal, setShowSimulationModal] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
        alert(data.message || 'Cannot export workflow. Please complete the setup/clarification questions in the chat first!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
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
        if (meta?.graph) { setCurrentWorkflow(meta.graph as Record<string, unknown>); return; }
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

  // Live graph sync
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (!sessionId) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await apiClient.get(`/sessions/${sessionId}/draft`);
        if (data.draft) setCurrentWorkflow(data.draft as Record<string, unknown>);
      } catch { /* */ }
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
        setCurrentWorkflow(data.graph as Record<string, unknown>);
      }

      setTyping(false);
      const reply: Message = {
        id: `a-${Date.now()}`, role: 'assistant',
        content: data.explanation ?? data.error ?? data.singleQuestion?.question ?? 'Workflow generated.',
        metadata: Object.keys(meta).length > 0 ? meta : undefined,
      };
      setMessages((prev) => [...prev, reply]);
    } catch (err: unknown) {
      setTyping(false);
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: err instanceof Error ? err.message : 'Something went wrong.' }]);
    } finally {
      setLoading(false);
      fetchConversations();
    }
  };

  // Process initialPrompt passed from dashboard redirect
  useEffect(() => {
    const state = location.state as { initialPrompt?: string } | null;
    if (state?.initialPrompt && !activeId && messages.length === 0 && !loading) {
      const prompt = state.initialPrompt;
      // Clear location state immediately so it doesn't trigger on refresh
      window.history.replaceState({}, document.title);
      sendMessage(prompt);
    }
  }, [location.state, activeId, messages.length, loading]);

  const handleSubmit = () => { const t = input.trim(); if (t && !loading) sendMessage(t); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } };
  const newConversation = () => { setActiveId(null); setMessages([]); setCurrentWorkflow(null); setSessionId(null); };
  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/conversations/${id}`);
      if (activeId === id) { setActiveId(null); setMessages([]); setCurrentWorkflow(null); setSessionId(null); }
      fetchConversations();
    } catch { /* */ }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 antialiased">
      {/* ═════ LEFT COLUMN: SIDEBAR ═════ */}
      <div className="flex w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-300">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white hover:scale-[1.02] transition-all">
            <LayoutDashboard className="h-4.5 w-4.5 text-indigo-400" />
            <span>Qonace Workspace</span>
          </Link>
        </div>
        
        <div className="flex border-b border-slate-800">
          {(['conversations', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setLeftTab(tab)}
              className={`flex-1 py-3 text-xs font-semibold tracking-wide transition-all border-b-2 uppercase ${
                leftTab === tab
                  ? 'border-indigo-500 text-white bg-slate-800/40'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-850/20'
              }`}
            >
              {tab === 'conversations' ? 'Chats' : 'Workflows'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {leftTab === 'conversations' ? (
            <>
              <div>
                <button
                  onClick={newConversation}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-850 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4 text-indigo-400" /> New Chat
                </button>
              </div>
              
              <div className="mt-4 space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => { setActiveId(conv.id); fetchMessages(conv.id); }}
                    className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-all ${
                      activeId === conv.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/25'
                        : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{conv.title}</span>
                    <Trash2
                      onClick={(e) => deleteConversation(e, conv.id)}
                      className="h-3.5 w-3.5 flex-shrink-0 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                    />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              <History className="mx-auto mb-2 h-6 w-6 opacity-30" />
              <p>Workflow history coming soon</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 p-4">
          <button
            onClick={async () => { await signOut(); navigate('/sign-in'); }}
            className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold text-slate-400 transition-all hover:bg-slate-850 hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>

      {/* ═════ CENTER COLUMN: CHAT INTERFACE ═════ */}
      <div className="flex flex-1 flex-col min-w-0 bg-white relative">
        <header className="flex h-16 items-center justify-between border-b border-slate-200/60 px-6">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>AI workflow builder</span>
          </div>
          <button
            onClick={newConversation}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Clear & Restart
          </button>
        </header>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto bg-slate-50/20">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 max-w-2xl mx-auto space-y-8 select-none">
              {/* Header Info */}
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs">
                  <Workflow className="h-6 w-6 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Let's design your workflow</h2>
                <p className="text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                  Describe your desired automation trigger and actions. I will collect requirements and build a production-ready n8n flow graph.
                </p>
              </div>

              {/* Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {[
                  {
                    title: 'Sync Stripe to Slack',
                    desc: 'Notify Slack channels when a subscription succeeds.',
                    prompt: 'Create a customer onboarding workflow that syncs Stripe payments to Slack.'
                  },
                  {
                    title: 'Lead ingestion to Sheet',
                    desc: 'Save incoming webhook contact details into Google Sheets.',
                    prompt: 'Create a webhook trigger that appends contact form submissions to a Google Sheet.'
                  },
                  {
                    title: 'Daily Slack digest',
                    desc: 'Query a database and send a daily summary report.',
                    prompt: 'Set up a daily cron schedule to fetch active database users and email a report.'
                  },
                  {
                    title: 'Auto Email responder',
                    desc: 'Scan email attachments and save to Google Drive.',
                    prompt: 'Create a Gmail watcher that automatically saves pdf attachments to my Google Drive.'
                  }
                ].map((card) => (
                  <button
                    key={card.title}
                    onClick={() => { setInput(card.prompt); inputRef.current?.focus(); }}
                    className="flex flex-col text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-450 hover:shadow-md transition-all duration-300 cursor-pointer group"
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
            <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-8.5 w-8.5 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-xs select-none ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                  }`}>
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className={`rounded-2xl px-5 py-3 text-sm leading-relaxed max-w-[80%] shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-800 border border-slate-200/60'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {typing && (
                <div className="flex gap-4">
                  <div className="flex h-8.5 w-8.5 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs font-bold shadow-xs">
                    AI
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-white px-5 py-3 border border-slate-200/60 shadow-xs">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '0.15s' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Floating Quick Navigation Toolbar */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          <div className="backdrop-blur-md bg-white/75 border border-slate-200/80 rounded-2xl p-1.5 shadow-lg flex flex-col gap-1.5">
            {/* Quick Action: Collapse/Expand Visualizer */}
            <button
              onClick={() => setShowVisualizer(!showVisualizer)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer border-0"
              title={showVisualizer ? "Collapse Workflow Canvas" : "Expand Workflow Canvas"}
            >
              {showVisualizer ? <PanelRightClose className="h-4.5 w-4.5" /> : <PanelRightOpen className="h-4.5 w-4.5 text-indigo-600" />}
            </button>
            
            {/* Quick Action: Export JSON */}
            {sessionId && (
              <button
                onClick={handleExportSession}
                disabled={exporting}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 transition-all cursor-pointer border-0"
                title="Export Workflow JSON"
              >
                {exporting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Download className="h-4.5 w-4.5" />}
              </button>
            )}

            {/* Quick Action: Clear & Restart */}
            <button
              onClick={newConversation}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer border-0"
              title="Clear Chat & Restart"
            >
              <Sparkles className="h-4.5 w-4.5" />
            </button>

            {/* Quick Action: Scroll to Bottom */}
            <button
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer border-0"
              title="Scroll to Bottom"
            >
              <ArrowUp className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Input box */}
        <div className="border-t border-slate-200/60 px-6 py-4 bg-white">
          <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-100/50 transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 max-w-2xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply or describe your automation..."
              rows={1}
              className="w-full resize-none border-0 bg-transparent px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-0 sm:text-sm outline-none min-h-[48px]"
            />
            <div className="flex items-center justify-between border-t border-slate-100 px-3 pt-2 pb-1">
              <span className="text-xs text-slate-450">Shift + Enter for new line</span>
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || loading}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-30 cursor-pointer"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═════ RIGHT COLUMN: WORKFLOW PREVIEW ═════ */}
      <div 
        className={`flex flex-col border-l border-slate-200 bg-slate-50 transition-all duration-300 ease-in-out ${
          showVisualizer ? 'w-[460px]' : 'w-0 overflow-hidden border-l-0'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200/60 px-6 flex-shrink-0">
          <Workflow className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workflow Canvas</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => handleSimulateExecution()}
              disabled={simulating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 shadow-2xs transition-all hover:bg-emerald-100 cursor-pointer"
              title="Simulate step-by-step workflow execution with mock data before exporting"
            >
              {simulating ? <Loader2 className="h-3 w-3 animate-spin text-emerald-700" /> : <Play className="h-3 w-3 fill-current text-emerald-700" />}
              {simulating ? 'Simulating...' : 'Simulate Run'}
            </button>

            {sessionId && (
              <>
                <button
                  onClick={handleCopyForN8n}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-700 shadow-2xs transition-all hover:bg-indigo-100 cursor-pointer"
                  title="Copy n8n JSON directly to clipboard so you can paste (Ctrl+V) onto any n8n canvas!"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-indigo-600" />}
                  {copied ? 'Copied for n8n!' : 'Copy for n8n'}
                </button>

                <button
                  onClick={handleExportSession}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {exporting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {exporting ? 'Exporting...' : 'Export JSON'}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 relative bg-slate-100">
          {currentWorkflow ? (
            <WorkflowGraph graph={currentWorkflow} className="h-full" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3.5 px-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200/60 text-slate-400">
                <Workflow className="h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Visualizer ready</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Your nodes and connections will generate dynamically in real-time as we clarify details.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Execution Simulation Trace Modal */}
      <ExecutionPreviewModal
        trace={simulationTrace}
        currentGraph={currentWorkflow}
        isOpen={showSimulationModal}
        onClose={() => setShowSimulationModal(false)}
        onExport={handleExportSession}
        onRerunSimulation={(customPayload) => handleSimulateExecution(customPayload)}
      />
    </div>
  );
}
