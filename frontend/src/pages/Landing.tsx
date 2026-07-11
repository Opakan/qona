import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Sparkles, Workflow, Brain, ArrowUp, Download, Layers, History, Shield, 
  MessageSquare, Play, HelpCircle, Network, Code, Plus, ChevronDown, CheckCircle2, MousePointer, Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const suggestions = [
  'Design a database schema',
  'Send welcome email on signup',
  'Sync Google Calendar with Slack',
  'Save email attachments to Drive',
];

// Stepper items for the "Meet Qona" interactive showcase
const meetQonaSteps = [
  {
    id: 0,
    title: 'Start with an idea',
    description: 'Describe your trigger and desired action in plain English. Qonace interprets your operational intent immediately.',
  },
  {
    id: 1,
    title: 'Watch it come to life',
    description: 'Nodes are generated, mapped, and linked visually. See exactly how data flows across integrations.',
  },
  {
    id: 2,
    title: 'Refine and ship',
    description: 'Run internal validations, map custom fields, and export your production-ready workflow schema to n8n in seconds.',
  },
];

// Typing carousel placeholders for the Hero and CTA sections
const heroPlaceholders = [
  'design a database schema...',
  'sync Google Calendar with Slack...',
  'save email attachments to Drive...',
  'create a signup welcome email workflow...',
];

const ctaPlaceholders = [
  'create a Stripe to Slack notification sync...',
  'build a database migration scheduler...',
  'connect Github commits to a Discord webhook...',
  'automatically sync Google Calendar with Slack...',
];

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Interactive Demo State (Conversational Sandbox)
  const [demoStep, setDemoStep] = useState(0);

  // Meet Qona Interactive Features Showcase State
  const [activeShowcaseStep, setActiveShowcaseStep] = useState(0);
  const [showcaseInputText, setShowcaseInputText] = useState('');
  const [showcaseCursorClicked, setShowcaseCursorClicked] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  // Hero Section Typing Carousel State
  const [heroPlaceholderText, setHeroPlaceholderText] = useState('');
  const [heroPlaceholderIndex, setHeroPlaceholderIndex] = useState(0);
  const [heroIsDeleting, setHeroIsDeleting] = useState(false);
  const [heroTypingSpeed, setHeroTypingSpeed] = useState(70);

  // CTA Section Typing Carousel State
  const [ctaPlaceholderText, setCtaPlaceholderText] = useState('');
  const [ctaPlaceholderIndex, setCtaPlaceholderIndex] = useState(0);
  const [ctaIsDeleting, setCtaIsDeleting] = useState(false);
  const [ctaTypingSpeed, setCtaTypingSpeed] = useState(70);

  // Redirection for already signed in users
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Demo Simulation Interval Loop (Conversational Sandbox)
  useEffect(() => {
    const timer = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Hero typing carousel animation
  useEffect(() => {
    let timer: any;
    const fullText = heroPlaceholders[heroPlaceholderIndex];

    if (!heroIsDeleting) {
      timer = setTimeout(() => {
        setHeroPlaceholderText(fullText.substring(0, heroPlaceholderText.length + 1));
        setHeroTypingSpeed(70);
      }, heroTypingSpeed);

      if (heroPlaceholderText === fullText) {
        timer = setTimeout(() => {
          setHeroIsDeleting(true);
        }, 2000);
      }
    } else {
      timer = setTimeout(() => {
        setHeroPlaceholderText(fullText.substring(0, heroPlaceholderText.length - 1));
        setHeroTypingSpeed(30);
      }, heroTypingSpeed);

      if (heroPlaceholderText === '') {
        setHeroIsDeleting(false);
        setHeroPlaceholderIndex((prev) => (prev + 1) % heroPlaceholders.length);
      }
    }

    return () => clearTimeout(timer);
  }, [heroPlaceholderText, heroIsDeleting, heroPlaceholderIndex, heroTypingSpeed]);

  // CTA typing carousel animation
  useEffect(() => {
    let timer: any;
    const fullText = ctaPlaceholders[ctaPlaceholderIndex];

    if (!ctaIsDeleting) {
      timer = setTimeout(() => {
        setCtaPlaceholderText(fullText.substring(0, ctaPlaceholderText.length + 1));
        setCtaTypingSpeed(70);
      }, ctaTypingSpeed);

      if (ctaPlaceholderText === fullText) {
        timer = setTimeout(() => {
          setCtaIsDeleting(true);
        }, 2000);
      }
    } else {
      timer = setTimeout(() => {
        setCtaPlaceholderText(fullText.substring(0, ctaPlaceholderText.length - 1));
        setCtaTypingSpeed(30);
      }, ctaTypingSpeed);

      if (ctaPlaceholderText === '') {
        setCtaIsDeleting(false);
        setCtaPlaceholderIndex((prev) => (prev + 1) % ctaPlaceholders.length);
      }
    }

    return () => clearTimeout(timer);
  }, [ctaPlaceholderText, ctaIsDeleting, ctaPlaceholderIndex, ctaTypingSpeed]);

  // Meet Qona Auto-Playing loop
  useEffect(() => {
    let timer: any;
    
    const runShowcaseLoop = async () => {
      if (activeShowcaseStep === 0) {
        setExportComplete(false);
        setShowcaseCursorClicked(false);
        const targetText = 'Create a customer onboarding workflow that syncs Stripe payments to Slack.';
        let currentText = '';
        for (let i = 0; i <= targetText.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 40));
          currentText = targetText.substring(0, i);
          setShowcaseInputText(currentText);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
        setShowcaseCursorClicked(true);
        await new Promise((resolve) => setTimeout(resolve, 600));
        setActiveShowcaseStep(1);
      } else if (activeShowcaseStep === 1) {
        timer = setTimeout(() => {
          setActiveShowcaseStep(2);
        }, 5000);
      } else if (activeShowcaseStep === 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setExportComplete(true);
        timer = setTimeout(() => {
          setShowcaseInputText('');
          setActiveShowcaseStep(0);
        }, 4000);
      }
    };

    runShowcaseLoop();

    return () => clearTimeout(timer);
  }, [activeShowcaseStep]);

  const handleStepClick = (stepId: number) => {
    setActiveShowcaseStep(stepId);
    if (stepId === 0) {
      setShowcaseInputText('');
      setExportComplete(false);
      setShowcaseCursorClicked(false);
    } else if (stepId === 2) {
      setExportComplete(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text) return;

    sessionStorage.setItem('qona_pending_prompt', text);
    navigate('/sign-in');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="relative isolate overflow-hidden bg-white">
      {/* Replicated Lovable-Style Hero Section with Teal-Indigo-Violet Gradient Backdrop */}
      <div className="relative mx-auto max-w-5xl px-6 pt-28 pb-20 sm:pt-36 sm:pb-28 lg:px-8">
        
        {/* Teal-Indigo-Violet Gradient Background */}
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[320px] rounded-full bg-gradient-to-tr from-teal-400/20 via-indigo-400/10 to-violet-500/20 blur-[90px] pointer-events-none select-none z-0 animate-pulse" style={{ animationDuration: '7s' }} />

        <div className="relative z-10 mx-auto max-w-3xl text-center space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-955 sm:text-5xl lg:text-6xl leading-[1.05] max-w-3xl mx-auto">
            Build AI Automations Through Conversation
          </h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">
            Create production-ready workflows and export them to n8n by chatting with Qona.
          </p>

          {/* Interactive Lovable-style Hero Input Box */}
          <div className="mx-auto max-w-2xl pt-6">
            <form onSubmit={handleSubmit} className="relative rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-md p-3 shadow-md focus-within:border-slate-350 focus-within:ring-2 focus-within:ring-slate-100 transition-all flex items-center justify-between">
              
              {/* Left Action Button */}
              <button 
                type="button" 
                className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer border-0"
              >
                <Plus className="h-4 w-4" />
              </button>

              {/* Center Text Area with Overlay Typing Placeholder */}
              <div className="flex-1 relative mx-3 min-h-[44px] flex items-center">
                {input === '' && !isFocused && (
                  <div className="absolute left-3 text-slate-400 text-xs sm:text-sm font-medium pointer-events-none flex items-center">
                    <span>Ask Qona to </span>
                    <span className="ml-1 text-slate-500">{heroPlaceholderText}</span>
                    <span className="inline-block w-1 h-3.5 ml-0.5 bg-slate-650 animate-pulse align-middle" />
                  </div>
                )}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={handleKeyDown}
                  placeholder=""
                  rows={1}
                  className="w-full resize-none border-0 bg-transparent px-3 py-2 text-slate-905 placeholder-transparent focus:ring-0 sm:text-sm outline-none"
                />
              </div>

              {/* Right Side Controls */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
                  <span>Build</span>
                  <ChevronDown className="h-2.5 w-2.5 text-slate-450" />
                </div>
                <button 
                  type="button" 
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer border-0"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-slate-950 text-white transition-all hover:bg-slate-800 disabled:opacity-10 cursor-pointer border-0"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>

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

      {/* Meet Qona Interactive Animation Section (Lovable-Style Features Video Replication) */}
      <div className="mx-auto max-w-5xl px-6 pb-28">
        <div className="border-t border-slate-100 pt-20">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Meet Qonace
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              A workspace that turns natural language instructions into functional n8n graphs instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center max-w-4xl mx-auto">
            {/* Left side: Interactive Mockup Card */}
            <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-white p-6 shadow-md relative overflow-hidden h-[380px] flex flex-col justify-between select-none">
              
              <AnimatePresence mode="wait">
                {activeShowcaseStep === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex-1 flex flex-col justify-center items-center relative h-full px-4"
                  >
                    {/* Animated gradient ring placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                      <div className="w-56 h-56 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 blur-xl animate-spin" style={{ animationDuration: '8s' }} />
                    </div>

                    <div className="relative w-full max-w-sm border border-slate-200 bg-white p-4 rounded-xl shadow-md space-y-3 z-10">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-650" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Integration</span>
                      </div>
                      <div className="min-h-[44px] text-xs text-slate-800 text-left font-medium leading-relaxed">
                        {showcaseInputText}
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-slate-900 animate-pulse" />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          className="px-3.5 py-1.5 bg-slate-950 text-white rounded-lg text-[10px] font-bold tracking-wide hover:bg-slate-800 transition-colors flex items-center gap-1 relative overflow-hidden border-0"
                        >
                          Generate Workflow
                          {/* Animated Cursor Pointer */}
                          {showcaseInputText.length > 50 && (
                            <motion.div
                              initial={{ x: 60, y: 60, opacity: 0 }}
                              animate={{ x: 10, y: 12, opacity: 1 }}
                              transition={{ duration: 0.6 }}
                              className="absolute z-20 pointer-events-none"
                            >
                              <MousePointer className={`h-4.5 w-4.5 text-slate-850 fill-white ${showcaseCursorClicked ? 'scale-90 opacity-80' : ''}`} />
                            </motion.div>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeShowcaseStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-center items-center relative h-full w-full"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] [background-size:16px_16px] opacity-60" />
                    
                    <div className="flex items-center justify-center gap-8 relative z-10 w-full px-6">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm flex items-center gap-2 max-w-[130px] border-l-4 border-l-slate-900 text-left"
                      >
                        <div className="h-7 w-7 rounded bg-slate-100 flex items-center justify-center">
                          <Play className="h-3.5 w-3.5 text-slate-700" />
                        </div>
                        <div>
                          <p className="text-[9px] font-extrabold text-slate-900 leading-none">Stripe Trigger</p>
                          <p className="text-[7px] text-slate-400 mt-1">Payment Success</p>
                        </div>
                      </motion.div>

                      <div className="flex-1 max-w-[50px] relative h-0.5 bg-slate-250">
                        <motion.div
                          animate={{ x: [0, 50] }}
                          transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                          className="h-1.5 w-1.5 -top-[2px] rounded-full bg-slate-900 absolute shadow-sm"
                        />
                      </div>

                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm flex items-center gap-2 max-w-[130px] border-l-4 border-l-indigo-650 text-left"
                      >
                        <div className="h-7 w-7 rounded bg-indigo-50 flex items-center justify-center">
                          <Workflow className="h-3.5 w-3.5 text-indigo-700" />
                        </div>
                        <div>
                          <p className="text-[9px] font-extrabold text-slate-900 leading-none">Slack Notify</p>
                          <p className="text-[7px] text-slate-400 mt-1">Send Message</p>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {activeShowcaseStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex-1 flex flex-col justify-center items-center relative h-full px-6"
                  >
                    <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-md max-w-sm w-full space-y-4 z-10">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 justify-between">
                        <div className="flex items-center gap-1.5">
                          <Code className="h-3.5 w-3.5 text-slate-800" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Export Node Graph</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">n8n_v1.json</span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="text-left">
                          <p className="text-[10px] font-bold text-slate-900">Download config</p>
                          <p className="text-[8px] text-slate-400 mt-0.5">Compatible with cloud & local n8n</p>
                        </div>
                        <button
                          type="button"
                          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 border-0 relative"
                        >
                          {!exportComplete ? (
                            <>
                              <Download className="h-3 w-3" />
                              Export to n8n
                            </>
                          ) : (
                            <motion.span
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className="flex items-center gap-1 text-emerald-400 font-bold"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              Saved
                            </motion.span>
                          )}
                          
                          {/* Animated Pointer Clicking Export */}
                          {!exportComplete && (
                            <motion.div
                              initial={{ x: 60, y: 60, opacity: 0 }}
                              animate={{ x: 10, y: 15, opacity: 1 }}
                              transition={{ delay: 0.5, duration: 0.5 }}
                              className="absolute z-20 pointer-events-none"
                            >
                              <MousePointer className="h-4.5 w-4.5 text-slate-850 fill-white" />
                            </motion.div>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono border-t border-slate-100 pt-3">
                <span>Interactive Qona Engine</span>
                <span>Active State: {meetQonaSteps[activeShowcaseStep].title}</span>
              </div>
            </div>

            {/* Right side: Interactive Stepper */}
            <div className="lg:col-span-5 flex flex-col gap-6 justify-center">
              {meetQonaSteps.map((step) => {
                const isActive = activeShowcaseStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    className={`text-left p-4.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isActive 
                        ? 'bg-slate-50 border-slate-200 shadow-sm pl-6 border-l-4 border-l-slate-900' 
                        : 'bg-transparent border-transparent hover:bg-slate-50/50'
                    }`}
                  >
                    <h3 className={`text-sm font-bold transition-colors duration-250 ${isActive ? 'text-slate-955' : 'text-slate-500'}`}>
                      {step.title}
                    </h3>
                    <p className={`text-xs mt-1.5 leading-relaxed transition-colors duration-250 ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                      {step.description}
                    </p>
                  </button>
                );
              })}
            </div>
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

      {/* Redesigned Premium Glowing CTA Section (Lovable-Style CTA Replication) */}
      <div className="relative mx-auto max-w-5xl px-6 py-32 border-t border-slate-100 overflow-hidden">
        
        {/* Soft Glowing Pulsing Blur Background (Teal-Indigo-Violet color scheme) */}
        <div className="absolute left-1/2 bottom-[-10%] -translate-x-1/2 w-[550px] h-[300px] rounded-full bg-gradient-to-tr from-teal-500/20 via-indigo-500/10 to-violet-500/20 blur-[80px] pointer-events-none select-none z-0 animate-pulse" style={{ animationDuration: '6s' }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-10">
          
          <div className="space-y-3.5">
            <span className="text-[10px] font-extrabold text-slate-400 tracking-[0.2em] uppercase block">
              AI Automation Builder
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-955 sm:text-5xl">
              Ready to build?
            </h2>
          </div>

          {/* Interactive Lovable-style Prompter Input Box */}
          <div className="mx-auto max-w-xl">
            <div className="rounded-2xl border border-slate-200 bg-white/85 backdrop-blur-md p-4 shadow-lg focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100 transition-all text-left">
              
              <div className="min-h-[50px] text-sm text-slate-805 pl-3 pt-1 font-medium relative flex items-center">
                {input === '' && !isFocused && (
                  <div className="absolute left-3 text-slate-400 pointer-events-none select-none flex items-center">
                    <span>Ask Qona to </span>
                    <span className="ml-1 text-slate-500">{ctaPlaceholderText}</span>
                    <span className="inline-block w-1.5 h-4 ml-0.5 bg-slate-800 animate-pulse align-middle" />
                  </div>
                )}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={handleKeyDown}
                  placeholder=""
                  rows={1}
                  className="w-full resize-none border-0 bg-transparent px-3 py-2 text-slate-905 placeholder-transparent focus:ring-0 sm:text-sm outline-none"
                />
              </div>

              {/* Lower Tool Bar inside input card */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-850 hover:bg-slate-100 transition-all cursor-pointer border-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600">
                    <Brain className="h-3 w-3 text-indigo-650" />
                    <span>Qona Reasoner</span>
                    <ChevronDown className="h-2.5 w-2.5 text-slate-450 ml-0.5" />
                  </div>
                </div>

                <button
                  onClick={() => navigate('/sign-in')}
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-slate-950 text-white transition-all hover:bg-slate-800 cursor-pointer border-0"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Button */}
            <div className="mt-8">
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
