import { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const suggestions = [
  'Send a welcome email when a new user signs up',
  'Save Gmail attachments to Google Drive',
  'Post Slack messages when RSS feed updates',
];

export default function LandingPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Describe the automation you want to build. Qona will generate a workflow you can export to n8n, Zapier, or Make.com.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    setTimeout(() => {
      const reply: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: 'To build this workflow, I need a few more details. What should trigger this automation — a webhook, a schedule, or a manual action? Once I understand the trigger, I can design the full workflow for you.',
      };
      setMessages((prev) => [...prev, reply]);
      setLoading(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-4 lg:px-6">
      {messages.length <= 1 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <div className="text-center">
            <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">What would you like to automate?</h1>
            <p className="mt-2 text-sm text-gray-500">Describe your workflow in plain English.</p>
          </div>

          <div className="w-full max-w-xl">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow focus-within:border-gray-300 focus-within:shadow-md">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a welcome email when a new user signs up..."
                rows={1}
                className="min-h-[52px] w-full resize-none bg-transparent px-4 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                <span className="text-xs text-gray-400">Shift + Enter for new line</span>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white transition-opacity disabled:opacity-30 hover:opacity-90"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs text-gray-400">Try an example</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-300">Exports to n8n, Zapier, and Make.com</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col py-8">
          <div className="flex-1 space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
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

          <div className="mt-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow focus-within:border-gray-300 focus-within:shadow-md">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your automation..."
                rows={1}
                className="min-h-[52px] w-full resize-none bg-transparent px-4 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              <div className="flex items-center justify-end border-t border-gray-100 px-3 py-2">
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white transition-opacity disabled:opacity-30 hover:opacity-90"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
