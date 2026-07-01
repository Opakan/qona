import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, MessageSquare, Trash2, ArrowUp, Sparkles, Workflow,
  LogOut, History, ChevronRight, Loader2, LayoutDashboard, Download
} from 'lucide-react';
import apiClient from '../api/client';
import WorkflowGraph from '../components/chat/WorkflowGraph';
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

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    <div className="flex h-screen overflow-hidden bg-white text-gray-900 antialiased">
      {/* ═════ LEFT COLUMN ═════ */}
      <div className="flex w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <Link to="/" className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4 text-gray-400" /><span className="text-sm font-medium">Qona</span></Link>
        </div>
        <div className="flex border-b border-gray-200">
          {(['conversations', 'history'] as const).map((tab) => (
            <button key={tab} onClick={() => setLeftTab(tab)} className={`flex-1 py-2.5 text-xs font-medium transition-colors ${leftTab === tab ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
              {tab === 'conversations' ? 'Chats' : 'Workflows'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {leftTab === 'conversations' ? (
            <>
              <div className="px-3 py-2">
                <button onClick={newConversation} className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-100">
                  <Plus className="h-3.5 w-3.5" /> New chat
                </button>
              </div>
              {conversations.map((conv) => (
                <button key={conv.id} onClick={() => { setActiveId(conv.id); fetchMessages(conv.id); }} className={`group flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors ${activeId === conv.id ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}>
                  <MessageSquare className="h-3 w-3 flex-shrink-0" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  <Trash2 onClick={(e) => deleteConversation(e, conv.id)} className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100" />
                </button>
              ))}
            </>
          ) : (
            <div className="p-4 text-center text-xs text-gray-400">
              <History className="mx-auto mb-2 h-5 w-5 opacity-30" />
              <p>Workflow history coming soon</p>
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 px-4 py-3">
          <button onClick={async () => { await signOut(); navigate('/sign-in'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-gray-400 transition-colors hover:bg-gray-200">
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      </div>

      {/* ═════ CENTER COLUMN ═════ */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-2.5">
          <span className="text-xs font-medium text-gray-400">Conversation</span>
          <button onClick={newConversation} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100"><Sparkles className="h-3 w-3" /> New</button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
              <div className="flex items-center gap-2"><Workflow className="h-5 w-5 text-gray-300" /><span className="text-lg font-semibold">Qona</span></div>
              <p className="max-w-sm text-center text-sm text-gray-400">Describe the automation you want — I'll ask questions to build it step by step.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-4 px-5 py-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs ${msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {msg.role === 'user' ? 'U' : 'Q'}
                  </div>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[80%] ${msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500">Q</div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-gray-100 px-4 py-2.5">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.15s' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-3">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow focus-within:border-gray-300 focus-within:shadow-md">
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Describe your automation..." rows={1}
              className="min-h-[48px] w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-400" />
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
              <span className="text-xs text-gray-350">Shift + Enter for new line</span>
              <button onClick={handleSubmit} disabled={!input.trim() || loading}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white transition-opacity disabled:opacity-25 hover:opacity-90">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═════ RIGHT COLUMN ═════ */}
      <div className="flex w-[420px] flex-shrink-0 flex-col border-l border-gray-200">
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-2.5 h-12">
          <Workflow className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">WORKFLOW PREVIEW</span>
          {sessionId && (
            <button
              onClick={handleExportSession}
              disabled={exporting}
              className="ml-auto inline-flex items-center gap-1 rounded bg-gray-900 px-2 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              {exporting ? 'Exporting...' : 'Export n8n JSON'}
            </button>
          )}
        </div>
        <div className="flex-1 bg-gray-50">
          {currentWorkflow ? (
            <WorkflowGraph graph={currentWorkflow} className="h-full" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Workflow className="h-8 w-8 text-gray-200" />
              <p className="text-xs text-gray-400">Your workflow will appear here as it's built.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
