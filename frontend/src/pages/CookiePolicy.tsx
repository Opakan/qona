import React from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Shield, Info, ArrowLeft } from 'lucide-react';

export default function CookiePolicy() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-150 text-[11px] font-extrabold text-yellow-800 uppercase tracking-wider mb-4">
            <Cookie className="h-3.5 w-3.5" />
            <span>Transparency &amp; Tracking</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-display text-slate-950 tracking-tight">
            Cookie Policy
          </h1>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Last Updated: {lastUpdated} • Clear information on how Qonace uses cookies &amp; browser storage
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-sm space-y-10 text-sm leading-relaxed text-slate-700">
          
          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work properly, improve user efficiency, maintain active login sessions, and provide anonymous analytical reporting to site operators.
            </p>
            <p>
              In addition to cookies, Qonace may use modern browser web storage (such as <code>localStorage</code> and <code>sessionStorage</code>) to remember your workspace visualizer layout preferences, draft prompts, and user onboarding state.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">2. Categories of Cookies We Use</h2>
            
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="font-extrabold text-slate-950 text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  A. Strictly Necessary Cookies (Essential)
                </span>
                <p className="text-xs text-slate-600">
                  These cookies and local storage tokens are essential for you to navigate Qonace and use its features, such as accessing authenticated chat sessions, verifying security tokens, and processing checkout sessions. The platform cannot function properly without them.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="font-extrabold text-slate-950 text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-600" />
                  B. Functionality &amp; Preference Cookies
                </span>
                <p className="text-xs text-slate-600">
                  These items remember choices you make (such as your 3-pane sidebar width, canvas zoom preferences, and whether you have completed the first-time user tour) to provide a personalized, fluid workspace experience.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="font-extrabold text-slate-950 text-sm flex items-center gap-2">
                  <Cookie className="h-4 w-4 text-yellow-600" />
                  C. Security &amp; Performance Cookies
                </span>
                <p className="text-xs text-slate-600">
                  Used by our edge infrastructure (Cloudflare) to identify trusted web traffic, detect automated abuse, and mitigate DDoS bot attacks (e.g. <code>__cf_bm</code>).
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">3. Specific Storage Items in Use</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Item / Key Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-800">sb-[ref]-auth-token</td>
                    <td className="p-3">Essential</td>
                    <td className="p-3">Maintains authenticated user session via Supabase Auth</td>
                    <td className="p-3">Persistent (until sign-out)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-800">qonace_onboarding_seen</td>
                    <td className="p-3">Preferences</td>
                    <td className="p-3">Remembers if user finished the 3-slide welcome guide</td>
                    <td className="p-3">Persistent</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-800">qonace_sidebar_width</td>
                    <td className="p-3">Preferences</td>
                    <td className="p-3">Stores your customized chat history sidebar width</td>
                    <td className="p-3">Persistent</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-800">__cf_bm</td>
                    <td className="p-3">Security</td>
                    <td className="p-3">Cloudflare bot management &amp; anti-DDoS challenge cookie</td>
                    <td className="p-3">30 Minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">4. How to Manage or Disable Cookies</h2>
            <p>
              Most web browsers automatically accept cookies, but you can modify your browser settings to decline or delete them at any time.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Chrome:</strong> Settings ➔ Privacy and Security ➔ Third-party cookies.</li>
              <li><strong>Safari:</strong> Settings ➔ Privacy ➔ Block all cookies.</li>
              <li><strong>Firefox:</strong> Settings ➔ Privacy &amp; Security ➔ Cookies and Site Data.</li>
              <li><strong>Edge:</strong> Settings ➔ Cookies and site permissions.</li>
            </ul>
            <p className="text-xs text-slate-500 font-medium">
              <em>Note: If you disable strictly necessary cookies or local storage, you will not be able to log in, maintain active sessions, or save workflow drafts on Qonace.</em>
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-xl font-black font-display text-slate-950">5. Questions &amp; Inquiries</h2>
            <p>
              If you have any questions about our use of cookies or tracking technologies, please contact:
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700">
              <p>Email: <a href="mailto:privacy@qonace.com" className="text-indigo-600 hover:underline">privacy@qonace.com</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
