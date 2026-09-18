import React, { useEffect } from 'react';
import { FileText, ShieldAlert, CreditCard, Sparkles, Scale, AlertCircle, ChevronRight, Home, Mail, CheckCircle2 } from 'lucide-react';

interface TermsConditionsViewProps {
  onNavigate?: (view: string) => void;
}

export const TermsConditionsView: React.FC<TermsConditionsViewProps> = ({ onNavigate }) => {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Terms & Conditions | Ghar Ghar Vastu';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute(
          'content',
          'Read the Terms and Conditions for Ghar Ghar Vastu governing website usage, user accounts, subscriptions, AI Vastu consultation, and Razorpay transactions.'
        );
      }

      let canonical = document.querySelector('link[rel="canonical"]');
      const canonicalUrl = 'https://ghargharvastu.com/terms-and-conditions';
      if (canonical) {
        canonical.setAttribute('href', canonicalUrl);
      } else {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        canonical.setAttribute('href', canonicalUrl);
        document.head.appendChild(canonical);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNav = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else if (typeof window !== 'undefined' && window.history?.pushState) {
      window.history.pushState(null, '', `/${view}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 space-y-8 text-stone-800">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-stone-500 font-medium">
        <button
          onClick={() => handleNav('home')}
          className="flex items-center gap-1 hover:text-amber-800 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
        <span className="text-stone-900 font-semibold">Terms & Conditions</span>
      </nav>

      {/* Header Banner */}
      <header className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
          <FileText className="w-4 h-4 text-amber-700" />
          <span>Legal Agreement & User Terms</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-stone-900 tracking-tight">
          Terms & Conditions
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-2xl">
          Please read these Terms & Conditions carefully before accessing or using the services provided on{' '}
          <strong>Ghar Ghar Vastu</strong> (
          <a href="https://ghargharvastu.com" className="text-amber-700 hover:underline">
            https://ghargharvastu.com
          </a>
          ). By accessing or using our website, you agree to be bound by these Terms.
        </p>
        <div className="pt-2 text-[11px] text-stone-400 font-medium">
          Last Updated: September 2026 • Governing Jurisdiction: New Delhi, India
        </div>
      </header>

      {/* Main Content Body */}
      <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-10 shadow-xs space-y-10 text-xs sm:text-sm leading-relaxed text-stone-700">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">1</span>
            Acceptance of Terms & Eligibility
          </h2>
          <p>
            By accessing or using Ghar Ghar Vastu, you represent and warrant that you are at least 18 years of age or possess the legal capacity to form a binding contract under the Indian Contract Act, 1872. If you are accessing the website on behalf of a family, firm, or entity, you confirm that you have the authority to accept these terms on their behalf.
          </p>
          <p>
            If you disagree with any part of these terms, you must discontinue using our website and services immediately.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">2</span>
            Account Registration & Security
          </h2>
          <p>
            To access certain personalized features, such as saving room analyses, downloading comprehensive home reports, or subscribing to advanced tiers, you may create an account using Google Sign-In, Mobile OTP verification, or Email registration.
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-stone-700">
            <li>You agree to provide accurate, current, and complete information during registration.</li>
            <li>You are responsible for maintaining the confidentiality of your session credentials and verification OTPs.</li>
            <li>You must notify us immediately at <a href="mailto:support@ghargharvastu.com" className="text-amber-700 underline">support@ghargharvastu.com</a> if you suspect any unauthorized access to your account.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">3</span>
            Free Allowances & Paid Subscription Plans
          </h2>
          <p>
            Ghar Ghar Vastu offers both complimentary tools and optional paid subscription packages to support our server and AI compute costs:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
              <span className="font-bold text-stone-900 block">Complimentary Free Access</span>
              <p className="text-xs text-stone-600">
                New visitors receive complimentary initial query and scan credits to test our AI Vastu Advisor and room guidance capabilities without requiring payment details.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
              <span className="font-bold text-stone-900 block">Paid Upgrades (Pro Advisor & Home Expert)</span>
              <p className="text-xs text-stone-700">
                Paid tiers provide higher query allowances, multi-room photo diagnoses, full directional assessments, and downloadable PDF reports as outlined on our pricing page.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">4</span>
            Payments, Billing & Refund Policy
          </h2>
          <p>
            All paid transactions are processed securely through <strong>Razorpay</strong> in Indian Rupees (₹ INR). By initiating a transaction, you authorize Razorpay and its banking partners to charge your designated payment method.
          </p>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="font-bold text-stone-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-700" />
              <span>Refund & Cancellation Policy</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Because our digital services provide immediate access to computational AI analyses and proprietary Vastu algorithms, subscription fees are generally non-refundable once digital credits or generated reports have been consumed.
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>Technical Billing Issues:</strong> In the event of a double billing, transaction debited without credit activation, or server outage preventing service access, please contact <a href="mailto:support@ghargharvastu.com" className="text-amber-700 font-semibold underline">support@ghargharvastu.com</a> within 7 days of the transaction with your Razorpay Payment ID. Verified billing anomalies will be promptly refunded back to the original payment source within 5–7 business days.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">5</span>
            Nature of AI Vastu Guidance & No Professional Advice
          </h2>
          <p>
            <strong>Advisory & Cultural Context:</strong> Ghar Ghar Vastu provides spatial layout interpretations based on classical Indian Vastu Shastra traditions and automated generative AI.
          </p>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 space-y-1.5 text-amber-950 font-medium">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Strict Non-Medical, Non-Financial, Non-Structural Notice</span>
            </div>
            <p className="text-xs">
              Vastu recommendations are traditional cultural guidelines and do NOT constitute medical diagnosis, treatment, psychological counseling, financial planning, investment advice, legal counsel, or structural engineering certification. For any major structural renovation, always consult licensed structural engineers and registered architects.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">6</span>
            User Content & Image Submissions
          </h2>
          <p>
            When you upload photographs or floor diagrams to Ghar Ghar Vastu:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-stone-700">
            <li>You retain full ownership of the images you submit.</li>
            <li>You grant Ghar Ghar Vastu a limited, non-exclusive license to process and transmit the image solely for generating real-time architectural guidance for your session.</li>
            <li>You represent that you own or have obtained all necessary permissions to photograph and submit the residential space.</li>
            <li>You agree not to upload any abusive, unlawful, or sexually explicit imagery.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">7</span>
            Intellectual Property Rights
          </h2>
          <p>
            All website design, graphics, custom algorithms, code, branding, logos, educational articles, and UI layouts on{' '}
            <strong>Ghar Ghar Vastu</strong> are the exclusive intellectual property of Ghar Ghar Vastu and are protected under Indian and international copyright and trademark laws. You may not scrape, reproduce, resell, or distribute our content or code without prior written consent.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">8</span>
            Limitation of Liability
          </h2>
          <p>
            To the fullest extent permitted by applicable law, Ghar Ghar Vastu, its founders, team members, and affiliates shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of:
          </p>
          <ul className="space-y-1 list-disc list-inside text-stone-600">
            <li>Your reliance on any Vastu suggestion, direction guide, or AI response.</li>
            <li>Structural modifications or furniture purchases made based on automated advice.</li>
            <li>Any temporary service interruptions, network downtimes, or technical errors.</li>
          </ul>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">9</span>
            Governing Law & Dispute Resolution
          </h2>
          <p>
            These Terms & Conditions are governed by and construed in accordance with the laws of the Republic of India. Any legal dispute, claim, or controversy arising out of or relating to these terms or your use of Ghar Ghar Vastu shall be subject to the exclusive jurisdiction of the competent courts located in <strong>New Delhi, India</strong>.
          </p>
        </section>

        {/* Section 10 */}
        <section className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
          <h2 className="text-base sm:text-lg font-heading font-bold text-stone-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-700" />
            Contact for Legal Questions
          </h2>
          <p className="text-xs sm:text-sm text-stone-700">
            For questions regarding these Terms & Conditions or to report a violation, please contact our administrative desk:
          </p>
          <div className="text-xs text-stone-800 space-y-1">
            <div><strong>Entity:</strong> Ghar Ghar Vastu Legal Desk</div>
            <div><strong>Email:</strong> <a href="mailto:support@ghargharvastu.com" className="text-amber-700 underline font-medium">support@ghargharvastu.com</a></div>
            <div><strong>Official URL:</strong> <a href="https://ghargharvastu.com" className="text-amber-700 hover:underline">https://ghargharvastu.com</a></div>
          </div>
        </section>
      </div>

      {/* Internal Navigation Links */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200 text-xs font-medium text-stone-600">
        <span>Related Legal & Trust Information:</span>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={() => handleNav('privacy-policy')} className="text-amber-700 hover:underline font-semibold">
            Privacy Policy
          </button>
          <span>•</span>
          <button onClick={() => handleNav('disclaimer')} className="text-amber-700 hover:underline font-semibold">
            Vastu Disclaimer
          </button>
          <span>•</span>
          <button onClick={() => handleNav('contact')} className="text-amber-700 hover:underline font-semibold">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};
