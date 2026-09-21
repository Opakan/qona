import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, AlertCircle, Clock, Shield, Sparkles, PhoneCall } from 'lucide-react';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Support');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate instant receipt & acknowledgement
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 py-16 px-4 sm:px-6 lg:px-8 text-slate-900 antialiased">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-150 text-xs font-extrabold text-indigo-700 tracking-wide uppercase">
            <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
            <span>We're Here to Help</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black font-display text-slate-950 tracking-tight">
            Contact the Qonace Team
          </h1>

          <p className="text-sm sm:text-base font-medium text-slate-600 leading-relaxed">
            Have questions about conversational automation, custom enterprise plans, or platform integration? Our engineering and support team is ready to assist.
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-sm text-left space-y-2">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-black font-display text-slate-950">General Support</h3>
            <p className="text-xs text-slate-500 font-medium">Help with accounts, billing, and workflow exports.</p>
            <a href="mailto:support@qonace.com" className="text-xs font-bold text-indigo-600 hover:underline block pt-1">
              support@qonace.com
            </a>
          </div>

          <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-sm text-left space-y-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-black font-display text-slate-950">Sales &amp; Enterprise</h3>
            <p className="text-xs text-slate-500 font-medium">Volume automation licensing and custom agency setups.</p>
            <a href="mailto:sales@qonace.com" className="text-xs font-bold text-indigo-600 hover:underline block pt-1">
              sales@qonace.com
            </a>
          </div>

          <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-sm text-left space-y-2">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-black font-display text-slate-950">Security &amp; Legal</h3>
            <p className="text-xs text-slate-500 font-medium">Compliance, DPAs, and security vulnerability reports.</p>
            <a href="mailto:security@qonace.com" className="text-xs font-bold text-indigo-600 hover:underline block pt-1">
              security@qonace.com
            </a>
          </div>

          <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-sm text-left space-y-2">
            <div className="h-10 w-10 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-black font-display text-slate-950">Response Time</h3>
            <p className="text-xs text-slate-500 font-medium">Global support coverage around the clock.</p>
            <span className="text-xs font-bold text-slate-800 block pt-1">
              &lt; 12 Hours Average
            </span>
          </div>
        </div>

        {/* Form & Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Interactive Form */}
          <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-sm">
            <h2 className="text-xl font-black font-display text-slate-950 mb-2">
              Send us a direct message
            </h2>
            <p className="text-xs text-slate-500 font-medium mb-6">
              Fill out the form below and an engineer will reply directly to your email inbox.
            </p>

            {submitted ? (
              <div className="p-8 text-center space-y-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl animate-in fade-in">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-black font-display text-emerald-950">
                  Message Sent Successfully!
                </h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto font-medium">
                  Thank you, <strong>{name}</strong>. We received your note and will review it and reply to <strong>{email}</strong> shortly.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="w-full rounded-xl border border-slate-250 bg-white py-2.5 px-3.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@company.com"
                      className="w-full rounded-xl border border-slate-250 bg-white py-2.5 px-3.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Inquiry Topic
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-250 bg-white py-2.5 px-3.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                  >
                    <option value="General Support">General Support &amp; How-To</option>
                    <option value="Billing & Plans">Billing &amp; Subscription Inquiry</option>
                    <option value="Enterprise Solution">Enterprise / Custom Volume Plan</option>
                    <option value="Bug Report">Technical Issue / Bug Report</option>
                    <option value="Partnership">Partnership &amp; Integration Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    How can we help?
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what workflow you're trying to build or how we can assist..."
                    className="w-full rounded-xl border border-slate-250 bg-white py-2.5 px-3.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{loading ? 'Sending...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Quick FAQ / Info */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-lg flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                Quick Answers
              </span>
              <h3 className="text-xl font-black font-display mt-1">Frequently Asked</h3>

              <div className="mt-6 space-y-4 text-xs font-medium text-slate-300 leading-relaxed">
                <div>
                  <p className="font-bold text-white mb-1">Where do I find my exported workflows?</p>
                  <p>In your Dashboard, click "Saved Workflows" or download .json files directly from any template card.</p>
                </div>

                <div>
                  <p className="font-bold text-white mb-1">Do I need an n8n account to use Qonace?</p>
                  <p>No! Qonace generates the complete workflows for you. You can run them on your own local/cloud n8n instance whenever you choose.</p>
                </div>

                <div>
                  <p className="font-bold text-white mb-1">How do subscriptions renew?</p>
                  <p>Subscriptions renew automatically each month and can be canceled anytime with 1 click in your account settings.</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-400">
              Alive Technologies Ltd • Registered Office: London, UK
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
