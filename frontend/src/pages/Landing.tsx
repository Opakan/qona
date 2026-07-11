import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Workflow, Brain, ArrowUp, Download, Layers, History, Shield, MessageSquare, Play, HelpCircle, Network, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const suggestions = [
  'Design a database schema',
  'Send welcome email on signup',
  'Sync Google Calendar with Slack',
  'Save email attachments to Drive',
];

const timelineSteps = [
  {
    title: 'Prompt',
    icon: MessageSquare,
    image: '/assets/timeline_prompt.png',
    description: 'Describe what you want to automate in plain English. Qona starts with a simple description of your goal.',
  },
  {
    title: 'AI asks questions',
    icon: HelpCircle,
    image: '/assets/timeline_questions.png',
    description: 'Qona identifies missing variables or credentials and prompts you for details to prevent broken workflows.',
  },
  {
    title: 'Workflow planning',
    icon: Brain,
    image: '/assets/timeline_planning.png',
    description: 'The AI maps your intent into structured logical steps, planning trigger and action routing before generation.',
  },
  {
    title: 'Internal graph',
    icon: Network,
    image: '/assets/timeline_graph.png',
    description: 'An internal schema validation connects nodes, endpoints, and credentials to ensure strict integrity.',
  },
  {
    title: 'n8n workflow generated',
    icon: Workflow,
    image: '/assets/timeline_workflow.png',
    description: 'The platform builds valid n8n nodes, connects variables, and compiles a ready-to-run structure.',
  },
  {
    title: 'Export',
    icon: Download,
    image: '/assets/timeline_export.png',
    description: 'Download the compiled JSON workflow and import it directly into your own self-hosted or cloud n8n instances.',
  },
];

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');

  // Interactive Demo State
  const [demoStep, setDemoStep] = useState(0);

  // Redirection for already signed in users
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Demo Simulation Interval Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text) return;

    // Save prompt to sessionStorage and redirect to sign-in
    sessionStorage.setItem('qona_pending_prompt', text);
    navigate('/sign-in');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // If loading or authenticated, render a minimal clean loading layout to avoid flicker
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="relative isolate overflow-hidden bg-white">
      {/* ChatGPT-style Hero Section */}
      <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-955 sm:text-5xl leading-[1.1] max-w-2xl mx-auto">
            Build AI Automations Through Conversation
          </h1>

          {/* Interactive OpenAI-style prompt area */}
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSubmit} className="relative rounded-3xl border border-slate-200 bg-white p-3 shadow-md focus-within:border-slate-350 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Design a database schema"
                rows={2}
                className="w-full resize-none border-0 bg-transparent pr-12 pl-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-0 sm:text-base outline-none min-h-[64px]"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="absolute bottom-3.5 right-3.5 flex h-8.5 w-8.5 items-center justify-center rounded-full bg-slate-955 text-white transition-all hover:bg-slate-800 disabled:opacity-10 cursor-pointer border-0"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>

            {/* Pill chips below input */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-650 transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Product Features Section (2x3 grid) */}
      <div className="mx-auto max-w-5xl px-6 pb-28">
        <div className="border-t border-slate-100 pt-16">
          <div className="text-left mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-slate-955">Product Features</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16">
            {/* Feature 1: Workflow Generation */}
            <div className="space-y-4 text-left">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
                <img 
                  src="/assets/workflow_generation_preview.png" 
                  alt="Workflow Generation Preview" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                  <Workflow className="h-3.5 w-3.5 text-slate-800" />
                  Workflow Generation
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Workflow Generation</h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  Qonace empowers your operations by transforming ideas into fully operational, tested workflow configurations.
                </p>
              </div>
            </div>

            {/* Feature 2: Deep Reasoning */}
            <div className="space-y-4 text-left">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
                <img 
                  src="/assets/deep_reasoning_professional.png" 
                  alt="Deep Reasoning Preview" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                  <Brain className="h-3.5 w-3.5 text-slate-800" />
                  Deep Reasoning
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Deep Reasoning</h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  Qonace is an intelligent agent system that plans and verifies every connection parameter before compiling standard JSON.
                </p>
              </div>
            </div>

            {/* Feature 3: One-click n8n Export */}
            <div className="space-y-4 text-left">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
                <img 
                  src="/assets/n8n_export_preview.png" 
                  alt="One-click n8n Export Preview" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                  <Download className="h-3.5 w-3.5 text-slate-800" />
                  One-click n8n Export
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">One-click n8n Export</h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  Instantly download compiled workflow configurations and import them directly into self-hosted or cloud n8n instances.
                </p>
              </div>
            </div>

            {/* Feature 4: Future Multi-platform Support */}
            <div className="space-y-4 text-left">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
                <img 
                  src="/assets/multi_platform_preview.png" 
                  alt="Future Multi-platform Support Preview" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                  <Layers className="h-3.5 w-3.5 text-slate-800" />
                  Future Multi-platform Support
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Future Multi-platform Support</h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  Architected to soon support native deployments for Make.com, Zapier integration recipes, and custom webhooks.
                </p>
              </div>
            </div>

            {/* Feature 5: Conversation Memory */}
            <div className="space-y-4 text-left">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
                <img 
                  src="/assets/conversation_memory_preview.png" 
                  alt="Conversation Memory Preview" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                  <History className="h-3.5 w-3.5 text-slate-800" />
                  Conversation Memory
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Conversation Memory</h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  Retain variables, labels, and parameters from past prompts to incrementally build and extend your integrations.
                </p>
              </div>
            </div>

            {/* Feature 6: Secure Local Execution */}
            <div className="space-y-4 text-left">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
                <img 
                  src="/assets/secure_execution_preview.png" 
                  alt="Secure Local Execution Preview" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                  <Shield className="h-3.5 w-3.5 text-slate-800" />
                  Secure Local Execution
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Secure Local Execution</h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  Export and run Qonace-generated JSON workflows locally on your own infrastructure without vendor lock-in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned How Qonace Works Section (Grid Styled Like Features) */}
      <div className="mx-auto max-w-5xl px-6 pb-28">
        <div className="border-t border-slate-100 pt-20">
          <div className="text-left mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-slate-955">How Qonace Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16">
            {timelineSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div key={idx} className="space-y-4 text-left">
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
                    <img 
                      src={step.image} 
                      alt={`${step.title} Stage`} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                      <StepIcon className="h-3.5 w-3.5 text-slate-850" />
                      Stage 0{idx + 1}: {step.title}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                    <p className="text-xs leading-relaxed text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Live Demo Simulation Section */}
      <div className="mx-auto max-w-5xl px-6 pb-28">
        <div className="border-t border-slate-100 pt-20">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Conversational Building in Real-Time
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Watch Qonace interpret instructions, prompt for configurations, and build nodes concurrently.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-4xl mx-auto">
            {/* Left side: Simulated Conversation */}
            <div className="lg:col-span-5 border border-slate-200 rounded-2xl bg-slate-50/50 p-6 flex flex-col justify-between h-[360px] shadow-sm relative overflow-hidden select-none">
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 pb-3 border-b border-slate-150">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Demo Sandbox</span>
                </div>

                <div className="space-y-3.5 overflow-y-auto max-h-[250px]">
                  <AnimatePresence>
                    {demoStep >= 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2.5"
                      >
                        <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-slate-200 text-slate-800 text-[10px] font-extrabold">U</div>
                        <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-800 leading-relaxed max-w-[80%] text-left">
                          "Notify me on Telegram whenever Stripe receives a payment."
                        </div>
                      </motion.div>
                    )}

                    {demoStep >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2.5 justify-end"
                      >
                        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl px-3 py-2 text-xs leading-relaxed max-w-[80%] text-left">
                          "Which Telegram bot?"
                        </div>
                        <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-extrabold">Q</div>
                      </motion.div>
                    )}

                    {demoStep >= 3 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2.5"
                      >
                        <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-slate-200 text-slate-800 text-[10px] font-extrabold">U</div>
                        <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-800 leading-relaxed max-w-[80%] text-left">
                          "Sales Bot."
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
                <span>Cycle updates automatically</span>
                <span className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${demoStep === 0 ? 'bg-slate-950' : 'bg-slate-200'}`} />
                  <span className={`h-1.5 w-1.5 rounded-full ${demoStep === 1 ? 'bg-slate-955' : 'bg-slate-200'}`} />
                  <span className={`h-1.5 w-1.5 rounded-full ${demoStep === 2 ? 'bg-slate-955' : 'bg-slate-200'}`} />
                  <span className={`h-1.5 w-1.5 rounded-full ${demoStep === 3 ? 'bg-slate-955' : 'bg-slate-200'}`} />
                </span>
              </div>
            </div>

            {/* Right side: Live updating Node Graph */}
            <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-white p-6 flex flex-col justify-between h-[360px] shadow-sm relative overflow-hidden select-none">
              <div className="flex-1 flex flex-col justify-center items-center relative">
                {/* Dotted Grid Background */}
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />

                <div className="flex items-center justify-center gap-8 relative z-10 w-full px-4">
                  {/* Stripe Trigger Node */}
                  <AnimatePresence>
                    {demoStep >= 1 ? (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white border border-slate-250 p-4 rounded-xl shadow-sm flex items-center gap-2.5 max-w-[160px] text-left border-l-4 border-l-slate-900"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 border border-slate-100">
                          <Play className="h-4 w-4 text-slate-800" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-900 leading-none">Stripe Trigger</p>
                          <p className="text-[8px] text-slate-400 mt-1">Payment Received</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-[52px] w-[140px] border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[9px] text-slate-350">
                        Awaiting Stripe...
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Connecting Line */}
                  <div className="flex-1 max-w-[60px] relative h-0.5 bg-slate-200">
                    {demoStep >= 2 && (
                      <motion.div
                        animate={{ x: [0, 60] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        className="h-1.5 w-1.5 -top-[2px] rounded-full bg-slate-900 absolute shadow-sm"
                      />
                    )}
                  </div>

                  {/* Telegram Node */}
                  <AnimatePresence>
                    {demoStep >= 2 ? (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className={`bg-white border p-4 rounded-xl shadow-sm flex items-center gap-2.5 max-w-[160px] text-left transition-colors duration-300 ${
                          demoStep >= 3 ? 'border-slate-250 border-l-4 border-l-indigo-650' : 'border-dashed border-slate-200'
                        }`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 border border-slate-100">
                          <Workflow className="h-4 w-4 text-slate-800" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-900 leading-none">Telegram Node</p>
                          <p className="text-[8px] text-slate-450 mt-1">
                            {demoStep >= 3 ? 'Bot: Sales Bot' : 'Bot: Awaiting name...'}
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-[52px] w-[140px] border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[9px] text-slate-350">
                        Awaiting bot setup...
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
                <span>Visual n8n schema mockup</span>
                <span>Active Step: {demoStep === 0 ? 'Idle' : demoStep === 1 ? 'Trigger Detected' : demoStep === 2 ? 'Question Prompted' : 'Completed'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Typographic Card CTA Section */}
      <div className="mx-auto max-w-5xl px-6 py-28 border-t border-slate-100">
        <div className="border border-slate-200 rounded-3xl bg-white p-12 md:p-16 text-center max-w-3xl mx-auto shadow-sm relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-955 sm:text-4xl">
              Start Building Automations Today
            </h2>
            <div className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-sm mx-auto font-medium">
              <p>Describe your workflow.</p>
              <p>Qonace builds it.</p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => navigate('/sign-in')}
                className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all cursor-pointer border-0"
              >
                Start Free
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
