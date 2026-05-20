import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Trash2, Send, ArrowUp, Sparkles, Workflow } from 'lucide-react';
import apiClient from '../api/client';
import ExportButton from '../components/chat/ExportButton';

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
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ conversations: ConversationItem[] }>('/conversations');
      setConversations(data.conversations);
    } catch {
      /* ignore - auth will redirect */
    }
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    try {
      const { data } = await apiClient.get(`/conversations/${id}`);
      const conv = data.conversation;
      setMessages(conv?.messages ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activeId) fetchMessages(activeId);
  }, [activeId, fetchMessages]);

  const sendMessage = async (text: string) => {
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let convId = activeId;

      if (!convId) {
        const { data } = await apiClient.post<{ conversation: { id: string } }>('/conversations', {
          title: text.slice(0, 80) || 'New conversation',
        });
        convId = data.conversation.id;
        setActiveId(convId);
        fetchConversations();
      }

      const { data } = await apiClient.post(`/conversations/${convId}/messages`, { content: text });

      const role = data.type === 'error' ? 'assistant' : 'assistant';
      const reply: Message = {
        id: `a-${Date.now()}`,
        role,
        content: data.explanation ?? data.error ?? 'Workflow generated.',
        metadata: data.type === 'clarification' ? { questions: data.questions } : undefined,
      };

      setMessages((prev) => [...prev, reply]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: errorMsg }]);
    } finally {
      setLoading(false);
      fetchConversations();
    }
  };

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || loading) return;
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const newConversation = () => {
    setActiveId(null);
    setMessages([]);
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/conversations/${id}`);
      if (activeId === id) { setActiveId(null); setMessages([]); }
      fetchConversations();
    } catch { /* ignore */ }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-gray-200 bg-gray-50 transition-all ${
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <button
            onClick={newConversation}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
          <button onClick={() => navigate('/dashboard')} className="text-xs text-gray-400 hover:text-gray-600">
            Dashboard
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => { setActiveId(conv.id); fetchMessages(conv.id); }}
              className={`group flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                activeId === conv.id ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <span className="flex-1 truncate">{conv.title}</span>
              <Trash2
                onClick={(e) => deleteConversation(e, conv.id)}
                className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
              />
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-gray-400">No conversations yet</p>
          )}
        </div>

        <div className="border-t border-gray-200 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-gray-400 transition-colors hover:bg-gray-200"
          >
            Close sidebar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-100"
          >
            {!sidebarOpen ? 'Open sidebar' : ''}
          </button>
          <button
            onClick={newConversation}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            New
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">Qona</span>
              </div>
              <h2 className="text-lg font-medium text-gray-900">What would you like to automate?</h2>
              <p className="max-w-md text-center text-sm text-gray-500">
                Describe your automation in plain English and Qona will generate a workflow you can export to n8n, Zapier, or Make.com.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
              {messages.map((msg) => {
                const meta = msg.metadata as Record<string, unknown> | undefined;
                const wfId = meta?.workflowId as string | undefined;
                return (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div>
                    <div
                      className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {msg.content}
                      {wfId && msg.role === 'assistant' && (
                        <ExportButton workflowId={wfId} workflowName={msg.content.slice(0, 60)} />
                      )}
                    </div>
                  </div>
                </div>
              )})}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-400">
                    <div className="flex gap-1">
                      <span className="animate-pulse">.</span>
                      <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                      <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white px-4 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow focus-within:border-gray-300 focus-within:shadow-md">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your automation..."
                rows={1}
                className="min-h-[52px] w-full resize-none bg-transparent px-4 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                <span className="text-xs text-gray-400">Shift + Enter for new line</span>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || loading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white transition-opacity disabled:opacity-30 hover:opacity-90"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
