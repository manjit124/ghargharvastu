import React, { useEffect } from 'react';
import { ShieldCheck, Lock, Eye, FileText, Database, Server, RefreshCw, Mail, CheckCircle2, ChevronRight, Home } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onNavigate?: (view: string) => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onNavigate }) => {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Privacy Policy | Ghar Ghar Vastu';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute(
          'content',
          'Read the Ghar Ghar Vastu Privacy Policy to understand how information, accounts, analytics, payments, and website services are handled.'
        );
      }

      let canonical = document.querySelector('link[rel="canonical"]');
      const canonicalUrl = 'https://ghargharvastu.com/privacy-policy';
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
        <span className="text-stone-900 font-semibold">Privacy Policy</span>
      </nav>

      {/* Header Banner */}
      <header className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Privacy & Data Transparency</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-stone-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-2xl">
          At <strong>Ghar Ghar Vastu</strong> (accessible at{' '}
          <a href="https://ghargharvastu.com" className="text-amber-700 hover:underline">
            https://ghargharvastu.com
          </a>
          ), we are committed to respecting your privacy, protecting your personal data, and maintaining absolute transparency about how our services operate.
        </p>
        <div className="pt-2 text-[11px] text-stone-400 font-medium">
          Last Updated: September 2026 • Effective Date: September 2026
        </div>
      </header>

      {/* Main Content Body */}
      <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-10 shadow-xs space-y-10 text-xs sm:text-sm leading-relaxed text-stone-700">
        {/* Section 1: Overview */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">1</span>
            Introduction & Platform Identity
          </h2>
          <p>
            This Privacy Policy governs the manner in which <strong>Ghar Ghar Vastu</strong> collects, uses, maintains, and discloses information gathered from users of the website{' '}
            <a href="https://ghargharvastu.com" className="text-amber-700 font-medium hover:underline">
              https://ghargharvastu.com
            </a>{' '}
            and its associated AI spatial guidance features.
          </p>
          <p>
            Ghar Ghar Vastu is an Indian web application providing traditional Vastu architectural principles, room layout suggestions, educational guides, and non-destructive spatial balance assessments assisted by artificial intelligence. We do not sell personal data, do not broadcast private home photos, and strictly limit data handling to providing and improving your user experience.
          </p>
        </section>

        {/* Section 2: Information Collected */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">2</span>
            Information We Actually Collect
          </h2>
          <p>
            We adhere to strict data minimization principles. We only collect information that is genuinely necessary for authentication, service delivery, or transaction execution:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="font-bold text-stone-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Account & Authentication</span>
              </div>
              <ul className="space-y-1.5 text-xs text-stone-600 list-disc list-inside">
                <li><strong>Google Sign-In:</strong> Your name, verified email address, and profile picture provided securely via Firebase Authentication.</li>
                <li><strong>Mobile OTP Login:</strong> Your 10-digit Indian mobile number for receiving one-time verification passwords (OTPs) via APITXT SMS gateway.</li>
                <li><strong>Email Authentication:</strong> Your email address and securely hashed password.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="font-bold text-stone-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-600" />
                <span>User Input & Analysis Data</span>
              </div>
              <ul className="space-y-1.5 text-xs text-stone-600 list-disc list-inside">
                <li><strong>Room Photographs:</strong> Optional room images you choose to upload for automated AI spatial analysis.</li>
                <li><strong>Vastu Consultation Queries:</strong> Text or voice prompts you submit to the AI Advisor.</li>
                <li><strong>Saved Reports:</strong> Vastu check scores, home reports, and saved notes stored in your profile.</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="font-bold text-stone-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600" />
              <span>Subscription & Payment Information</span>
            </div>
            <p className="text-xs text-stone-600">
              When you purchase a subscription plan (such as Pro Advisor or Home Expert), transactions are processed through <strong>Razorpay</strong>, a PCI-DSS compliant Indian payment aggregator.
            </p>
            <p className="text-xs text-stone-600 font-medium">
              <strong>Important:</strong> Ghar Ghar Vastu never sees, accesses, or stores your complete credit/debit card numbers, UPI PINs, CVV codes, net banking credentials, or bank passwords. We receive only transaction confirmation metadata (Razorpay Order ID, Payment ID, signature verification token, plan name, and amount paid).
            </p>
          </div>
        </section>

        {/* Section 3: Room Photos & AI Image Analysis */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">3</span>
            Handling of User-Uploaded Room Images
          </h2>
          <p>
            Your residential privacy is sacred to us. When you upload a photo of your living room, kitchen, bedroom, entrance, or bathroom for analysis:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-stone-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Advisory Processing Only:</strong> The photo is processed in real time by server-side Gemini AI models strictly to identify structural elements (doors, windows, bed alignment, stove placement, mirrors).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>No Public Exposure:</strong> Your private photos are never published, shared with third-party advertisers, or made visible to other users.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>User Control:</strong> You can delete saved analyses and associated cached reports from your profile dashboard at any time.</span>
            </li>
          </ul>
        </section>

        {/* Section 4: Analytics & Cookies */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">4</span>
            Cookies, Technical Logs & Google Analytics 4
          </h2>
          <p>
            We use technical cookies and industry-standard analytics tools to ensure our website functions reliably and to understand general visitor interaction patterns:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-stone-700">
            <li>
              <strong>Google Analytics 4 (Measurement ID: G-8CQM6VX33E):</strong> We use GA4 with IP anonymization enabled to analyze aggregate website traffic (pages visited, device types, browser types, session duration). We explicitly do <em>not</em> send personally identifiable information (PII), full phone numbers, passwords, OTPs, or financial secrets to Google Analytics.
            </li>
            <li>
              <strong>Essential Session Cookies & Local Storage:</strong> Used to maintain your login session, save your language preference (English/Hindi), and remember your free credit counter locally on your browser.
            </li>
            <li>
              <strong>Advertising / Google AdSense:</strong> If third-party advertising partners display ads on our website in the future, they may use cookies or web beacons to serve ads based on prior visits. Users may manage ad personalization settings via{' '}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-amber-700 underline">
                Google Ads Settings
              </a>.
            </li>
          </ul>
        </section>

        {/* Section 5: Third-Party Service Providers */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">5</span>
            Third-Party Infrastructure & Service Providers
          </h2>
          <p>
            To deliver an enterprise-grade, secure experience, we partner with reputable cloud and API providers:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="font-bold text-stone-900 block">Google Cloud & Firebase</span>
              <span className="text-stone-600">Secure user authentication (Google Sign-In, Email auth) and cloud server hosting.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="font-bold text-stone-900 block">Razorpay Payments</span>
              <span className="text-stone-600">PCI-DSS compliant payment gateway for processing UPI, debit/credit cards, and netbanking.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="font-bold text-stone-900 block">Google Gemini AI</span>
              <span className="text-stone-600">Advanced foundational AI models used server-side for real-time spatial recommendations.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="font-bold text-stone-900 block">APITXT SMS Gateway</span>
              <span className="text-stone-600">Encrypted transmission of one-time password (OTP) verification codes to Indian mobile numbers.</span>
            </div>
          </div>
        </section>

        {/* Section 6: Data Security & Retention */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">6</span>
            Data Security & Retention
          </h2>
          <p>
            We implement robust technical and organizational security measures, including HTTPS/TLS 1.3 encryption across all client-server communications, token-based authentication sessions, and server-side secret isolation. API secrets and private payment keys are never exposed in client browser code.
          </p>
          <p>
            We retain account data only for as long as your account remains active or as needed to comply with our statutory tax and financial reporting obligations under Indian law.
          </p>
        </section>

        {/* Section 7: User Rights & Data Deletion */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">7</span>
            Your Rights & Account Deletion Requests
          </h2>
          <p>
            In accordance with the Indian Information Technology Act, 2000 and the Digital Personal Data Protection (DPDP) Act, you have the right to:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-stone-700">
            <li>Access the personal information associated with your account.</li>
            <li>Correct or update your name, email, or language preferences.</li>
            <li>Delete your saved room analyses and reports from your user profile.</li>
            <li><strong>Request Complete Account Deletion:</strong> You may request complete erasure of your account and associated records by emailing us at <a href="mailto:support@ghargharvastu.com" className="text-amber-700 font-semibold underline">support@ghargharvastu.com</a> with the subject line <em>"Data Erasure Request"</em>. We process verified deletion requests within 30 days.</li>
          </ul>
        </section>

        {/* Section 8: Children's Privacy */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">8</span>
            Children's Privacy
          </h2>
          <p>
            Ghar Ghar Vastu is intended for general audiences, homeowners, tenants, and architectural enthusiasts. We do not knowingly collect or solicit personal information from children under the age of 18. If a parent or guardian discovers that a child has provided us with personal information, please contact us at <a href="mailto:support@ghargharvastu.com" className="text-amber-700 underline">support@ghargharvastu.com</a>, and we will promptly remove the information.
          </p>
        </section>

        {/* Section 9: Changes to Policy */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">9</span>
            Modifications to This Privacy Policy
          </h2>
          <p>
            We may update our Privacy Policy periodically to reflect enhancements to our features, service architecture, or legal requirements. When updated, we will revise the "Last Updated" timestamp at the top of this page. We encourage you to review this page periodically to stay informed about our data protection standards.
          </p>
        </section>

        {/* Section 10: Contact Us */}
        <section className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
          <h2 className="text-base sm:text-lg font-heading font-bold text-stone-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-700" />
            Contacting Our Privacy & Data Protection Officer
          </h2>
          <p className="text-xs sm:text-sm text-stone-700">
            If you have questions, concerns, or feedback regarding this Privacy Policy or our data handling practices, please contact us:
          </p>
          <div className="space-y-1 text-xs text-stone-800">
            <div><strong>Platform Name:</strong> Ghar Ghar Vastu</div>
            <div><strong>Official Website:</strong> <a href="https://ghargharvastu.com" className="text-amber-700 hover:underline">https://ghargharvastu.com</a></div>
            <div><strong>Email:</strong> <a href="mailto:support@ghargharvastu.com" className="text-amber-700 font-medium underline">support@ghargharvastu.com</a></div>
            <div><strong>Grievance Officer:</strong> Data Privacy Desk, Ghar Ghar Vastu, New Delhi, India</div>
            <div><strong>Expected Response Time:</strong> Within 24 to 48 business hours</div>
          </div>
        </section>
      </div>

      {/* Internal Navigation Links */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200 text-xs font-medium text-stone-600">
        <span>Related Legal & Trust Information:</span>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={() => handleNav('terms-and-conditions')} className="text-amber-700 hover:underline font-semibold">
            Terms & Conditions
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
