import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, Lock, Globe2, FileCheck, ArrowLeft } from 'lucide-react';

export default function GDPR() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-150 text-[11px] font-extrabold text-blue-700 uppercase tracking-wider mb-4">
            <Globe2 className="h-3.5 w-3.5" />
            <span>European Union &amp; UK Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-display text-slate-950 tracking-tight">
            GDPR Compliance Commitment
          </h1>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Last Updated: {lastUpdated} • Standards aligning with Regulation (EU) 2016/679 &amp; UK GDPR
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-sm space-y-10 text-sm leading-relaxed text-slate-700">
          
          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">1. Our Commitment to GDPR</h2>
            <p>
              The General Data Protection Regulation (GDPR) is a comprehensive European privacy law that establishes strict rules for how organizations collect, process, and protect the personal data of individuals located within the European Economic Area (EEA) and the United Kingdom.
            </p>
            <p>
              <strong>Qonace</strong> (operated by <strong>Alive Technologies Ltd</strong>) is fully committed to upholding the data protection principles outlined in the GDPR: lawfulness, fairness, transparency, purpose limitation, data minimization, accuracy, storage limitation, integrity, and confidentiality.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">2. Lawful Bases for Processing</h2>
            <p>We process personal data only when an established legal basis under Article 6 of the GDPR exists:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>Contractual Necessity:</strong> Processing required to provide you with the Qonace Service, such as authenticating your account, compiling requested n8n workflow graphs, and activating paid subscriptions.
              </li>
              <li>
                <strong>Legitimate Interests:</strong> Processing necessary for our legitimate business interests, including preventing fraud, mitigating platform abuse, and maintaining cybersecurity (e.g. rate-limiting disposable email bots).
              </li>
              <li>
                <strong>Legal Obligation:</strong> Processing required to comply with financial, accounting, and regulatory compliance laws.
              </li>
              <li>
                <strong>Explicit Consent:</strong> Where you have voluntarily opted in to specific optional communications or features.
              </li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">3. Your Rights as a Data Subject</h2>
            <p>Under GDPR Articles 15 through 22, you possess the following enforceable rights:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-extrabold text-slate-950 text-xs block">Right of Access (Art. 15)</span>
                <p className="text-xs text-slate-600">Request confirmation and a portable copy of all personal data held about you.</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-extrabold text-slate-950 text-xs block">Right to Rectification (Art. 16)</span>
                <p className="text-xs text-slate-600">Correct inaccurate, incomplete, or outdated profile details directly.</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-extrabold text-slate-950 text-xs block">Right to Erasure (Art. 17)</span>
                <p className="text-xs text-slate-600">Request permanent deletion of your account and related workflow history.</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-extrabold text-slate-950 text-xs block">Right to Portability (Art. 20)</span>
                <p className="text-xs text-slate-600">Export your automation data in machine-readable n8n JSON formats.</p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">4. International Transfers &amp; Safeguards</h2>
            <p>
              Because Qonace operates a globally distributed cloud architecture, data may be transferred to and processed by subprocessors located outside the EEA (such as in the United States).
            </p>
            <p>
              We ensure all cross-border data transfers adhere strictly to Chapter V of the GDPR by utilizing European Commission-approved <strong>Standard Contractual Clauses (SCCs)</strong> and working exclusively with cloud vendors that maintain robust international certifications.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">5. Data Processing Addendum (DPA)</h2>
            <p>
              For businesses and enterprise customers that require a formal Data Processing Addendum (DPA) incorporated into their contractual terms, we provide pre-signed DPAs with standard contractual clauses. Please request a copy by emailing our legal team.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">6. Submit a Data Subject Request (DSR)</h2>
            <p>
              To exercise any of your GDPR rights or submit a data erasure request, please send an email with the subject line <em>“GDPR Data Subject Request”</em>:
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 space-y-1">
              <p><strong>Alive Technologies Ltd — Data Protection Office</strong></p>
              <p>DPO Contact: <a href="mailto:dpo@qonace.com" className="text-indigo-600 hover:underline">dpo@qonace.com</a></p>
              <p>General Legal: <a href="mailto:legal@qonace.com" className="text-indigo-600 hover:underline">legal@qonace.com</a></p>
              <p className="text-[11px] text-slate-500 font-normal mt-2">
                We respond to all verified Data Subject Requests within thirty (30) calendar days as mandated by GDPR Article 12.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
