import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  const lastUpdated = 'September 21, 2026';

  return (
    <div className="min-h-screen bg-slate-50/60 py-16 px-4 sm:px-6 lg:px-8 text-slate-900 antialiased">
      <div className="mx-auto max-w-4xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-sm mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-150 text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider mb-4">
            <FileText className="h-3.5 w-3.5" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-display text-slate-950 tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Effective Date: {lastUpdated} • Applicable to all Qonace users globally
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-sm space-y-10 text-sm leading-relaxed text-slate-700">
          
          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, registering for, or using the <strong>Qonace</strong> platform (“Service”), accessible at{' '}
              <a href="https://qonace.com" className="text-indigo-600 font-bold hover:underline">qonace.com</a> and operated by{' '}
              <strong>Alive Technologies Ltd</strong> (“Qonace”, “we”, “our”, or “us”), you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service (“Terms”) and our Privacy Policy.
            </p>
            <p>
              If you are entering into this agreement on behalf of a company, organization, or other legal entity, you represent and warrant that you have full legal authority to bind that entity to these Terms. If you do not agree to all provisions, you must immediately discontinue use of the Service.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">2. Description of the Service</h2>
            <p>
              Qonace provides an AI-powered automation architecture suite. The Service utilizes large language models (including Anthropic Claude 3.5 Sonnet and DeepSeek) paired with an automated compiler to translate natural language user prompts into workflow structures and JSON representations compatible with the open-source automation platform <strong>n8n</strong>.
            </p>
            <p>
              Features include conversational workflow planning, live 3-pane interactive visual node graphs, ready-to-run automation templates, and direct workflow export in n8n-compliant JSON formats.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">3. User Accounts & Security</h2>
            <p>
              To access specific features (such as AI workflow synthesis, saving drafts, and exporting full graphs), you must register for an account using Google OAuth, GitHub OAuth, or a verified personal or business email address.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>You agree to provide accurate, current, and complete registration information.</li>
              <li>You are strictly responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</li>
              <li>You must immediately notify Qonace at <a href="mailto:security@qonace.com" className="text-indigo-600 font-bold hover:underline">security@qonace.com</a> of any unauthorized access or security breach.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">4. Zero-Secret Credential Architecture</h2>
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
              <strong className="font-extrabold flex items-center gap-1.5 mb-1 text-amber-950">
                <Shield className="h-4 w-4 text-amber-700" />
                Critical Security Notice:
              </strong>
              Qonace enforces a strict zero-credential retention policy. You should <strong>NEVER</strong> enter live API secret keys, passwords, database passwords, or private encryption keys into the Qonace prompt input. Workflows are generated with placeholders (e.g. <code>&#123;&#123;USER_CONFIGURED&#125;&#125;</code>) so that you configure your credentials securely inside your private n8n execution environment upon export.
            </div>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">5. Subscriptions, Payments & Refunds</h2>
            <p>
              Qonace offers both free sandbox features and paid subscription tiers (such as the Starter and Pro plans).
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Billing:</strong> Paid plans are processed securely via verified third-party payment gateways, including <strong>Flutterwave</strong> and <strong>Paystack</strong>. By subscribing, you authorize automatic recurring billing for renewal periods until canceled.</li>
              <li><strong>Cancellation:</strong> You may cancel your subscription at any time through your Account Settings or Billing page. Cancellation takes effect at the conclusion of your current paid billing period.</li>
              <li><strong>Refunds:</strong> Due to the immediate allocation of cloud compute resources and AI token generation upon subscription, fees are generally non-refundable except where required by applicable consumer protection laws.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">6. Intellectual Property & Workflow Ownership</h2>
            <p>
              <strong>Your Workflows:</strong> You retain complete ownership of all workflow concepts, configurations, prompts, and exported JSON files created by you through Qonace. You are free to run, modify, commercialize, or self-host your exported workflows anywhere without royalty obligations to Qonace.
            </p>
            <p>
              <strong>Qonace IP:</strong> All rights, title, and interest in the Qonace platform—including its user interface, AI compilers, node registries, branding, logos, graphics, and proprietary software—remain the exclusive property of Alive Technologies Ltd.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">7. Acceptable Use Policy</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>Build or distribute malicious automations, denial-of-service bots, phishing campaigns, or illegal scraping tools.</li>
              <li>Attempt to reverse-engineer, decompile, or extract the underlying models, compiler source code, or proprietary algorithms of Qonace.</li>
              <li>Use temporary, disposable, or fraudulent email addresses to exploit trial services or bypass rate limits.</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any third party.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">8. Disclaimers & Limitation of Liability</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS. QONACE MAKES NO WARRANTIES, EXPRESS OR IMPLIED, REGARDING SYSTEM UPTIME, ACCURACY OF THIRD-PARTY APIS, OR THE FITNESS OF GENERATED WORKFLOWS FOR A PARTICULAR PURPOSE.
            </p>
            <p>
              IN NO EVENT SHALL ALIVE TECHNOLOGIES LTD, ITS DIRECTORS, EMPLOYEES, OR PARTNERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">9. Contact & Legal Inquiries</h2>
            <p>
              For any questions regarding these Terms of Service or legal notices, please contact us at:
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 space-y-1">
              <p><strong>Alive Technologies Ltd (Qonace)</strong></p>
              <p>Legal Inquiries: <a href="mailto:legal@qonace.com" className="text-indigo-600 hover:underline">legal@qonace.com</a></p>
              <p>General Support: <a href="mailto:support@qonace.com" className="text-indigo-600 hover:underline">support@qonace.com</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
