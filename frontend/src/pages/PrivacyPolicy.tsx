import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, FileText, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-150 text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider mb-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Data Protection &amp; Security</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-display text-slate-950 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Last Updated: {lastUpdated} • Compliance with GDPR, CCPA, and Global Privacy Standards
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-sm space-y-10 text-sm leading-relaxed text-slate-700">
          
          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">1. Overview &amp; Commitment</h2>
            <p>
              At <strong>Qonace</strong> (operated by <strong>Alive Technologies Ltd</strong>, “we”, “our”, or “us”), we respect your privacy and are committed to safeguarding your personal data. This Privacy Policy details how we collect, process, store, and protect your information when you use our website, AI automation compiler, APIs, and associated services at{' '}
              <a href="https://qonace.com" className="text-indigo-600 font-bold hover:underline">qonace.com</a>.
            </p>
            <p>
              We believe in data minimization: we collect only what is strictly necessary to authenticate your identity, generate and deliver your workflows, process subscription transactions, and ensure platform security.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">2. Information We Collect</h2>
            <p>We may collect and process the following categories of data:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>Identity &amp; Account Data:</strong> When you sign up via Google, GitHub, or Email, we receive your email address, full name, profile avatar, and unique authentication identifier (`authId`).
              </li>
              <li>
                <strong>Workflow &amp; Prompt Data:</strong> The text descriptions, automation criteria, parameter names, and configuration choices you submit into the Qonace chat workspace.
              </li>
              <li>
                <strong>Billing &amp; Transaction Identifiers:</strong> When subscribing to Starter or Pro tiers, payment transactions are handled directly by PCI-DSS compliant providers (<strong>Flutterwave</strong> and <strong>Paystack</strong>). Qonace <em>never</em> stores full credit card numbers, CVVs, or cardholder bank data on our servers; we only store transaction tokens, plan status, and payment reference IDs.
              </li>
              <li>
                <strong>Technical &amp; Telemetry Data:</strong> IP address (used for high-level geographic currency localization and security rate-limiting), browser type, operating system, and system performance metrics.
              </li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">3. How We Use AI Models &amp; User Prompts</h2>
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 leading-relaxed font-medium space-y-2">
              <p className="font-extrabold flex items-center gap-1.5 text-indigo-900">
                <Lock className="h-4 w-4 text-indigo-600" />
                No Public Model Training on Private Prompts
              </p>
              <p>
                When you generate or refine a workflow, prompts are transmitted via enterprise APIs (AWS Bedrock Anthropic Claude 3.5 Sonnet and DeepSeek) solely for the purpose of constructing your n8n workflow graph. We do not sell your automation structures, and your private prompts are not used to train public foundation models without your explicit consent.
              </p>
            </div>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">4. Third-Party Service Providers (Subprocessors)</h2>
            <p>
              To maintain reliable global operations, we partner with trusted, industry-leading infrastructure providers under strict data processing agreements:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <span className="font-extrabold text-slate-900 block mb-0.5">Amazon Web Services (AWS)</span>
                Cloud infrastructure, Elastic Beanstalk API hosting, and Bedrock AI computation.
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <span className="font-extrabold text-slate-900 block mb-0.5">Supabase / PostgreSQL</span>
                Encrypted user session authentication and relational database services.
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <span className="font-extrabold text-slate-900 block mb-0.5">Cloudflare</span>
                DNS management, SSL certificate encryption, and DDoS edge protection.
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <span className="font-extrabold text-slate-900 block mb-0.5">Flutterwave &amp; Paystack</span>
                PCI-DSS Level 1 compliant international and regional payment processing.
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <span className="font-extrabold text-slate-900 block mb-0.5">Zoho Mail</span>
                Custom SMTP server infrastructure for transactional notifications and account alerts.
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">5. Data Retention &amp; Security</h2>
            <p>
              We retain personal data only as long as necessary to provide your active account services or fulfill legitimate business and legal obligations.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>All web traffic between your device and Qonace is encrypted using modern TLS 1.3 / HTTPS encryption.</li>
              <li>Databases are encrypted at rest with automated backup snapshotting.</li>
              <li>You may request complete deletion of your account and associated workflow history at any time.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">6. Your Data Rights (GDPR &amp; CCPA)</h2>
            <p>Depending on your geographic location, you hold legal rights regarding your personal information:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Right to Access:</strong> You can request a complete copy of the personal data we hold about you.</li>
              <li><strong>Right to Rectification:</strong> You can update inaccurate profile information via Account Settings.</li>
              <li><strong>Right to Erasure (“Right to Be Forgotten”):</strong> You can request that we permanently delete your account and records.</li>
              <li><strong>Right to Data Portability:</strong> You can export all your generated n8n workflow graphs in standardized JSON format.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">7. Contact the Privacy Team</h2>
            <p>
              To exercise any of your privacy rights or submit questions regarding this policy, please reach out to our Data Protection Officer:
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 space-y-1">
              <p><strong>Alive Technologies Ltd — Privacy &amp; Data Protection</strong></p>
              <p>Email: <a href="mailto:privacy@qonace.com" className="text-indigo-600 hover:underline">privacy@qonace.com</a></p>
              <p>Support: <a href="mailto:support@qonace.com" className="text-indigo-600 hover:underline">support@qonace.com</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
