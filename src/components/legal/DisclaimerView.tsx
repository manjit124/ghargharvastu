import React, { useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, ChevronRight, Home, Stethoscope, IndianRupee, Hammer, HelpCircle, Mail } from 'lucide-react';

interface DisclaimerViewProps {
  onNavigate?: (view: string) => void;
}

export const DisclaimerView: React.FC<DisclaimerViewProps> = ({ onNavigate }) => {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Vastu Disclaimer | Ghar Ghar Vastu';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute(
          'content',
          'Read the Vastu and Safety Disclaimer for Ghar Ghar Vastu. Learn about the traditional and advisory nature of Vastu guidance and our commitment to practical, non-destructive home planning.'
        );
      }

      let canonical = document.querySelector('link[rel="canonical"]');
      const canonicalUrl = 'https://ghargharvastu.com/disclaimer';
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
        <span className="text-stone-900 font-semibold">Vastu & Safety Disclaimer</span>
      </nav>

      {/* Header Banner */}
      <header className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-amber-700" />
          <span>Important Transparency Notice</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-stone-900 tracking-tight">
          Vastu & Safety Disclaimer
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-2xl">
          At <strong>Ghar Ghar Vastu</strong> (
          <a href="https://ghargharvastu.com" className="text-amber-700 hover:underline">
            https://ghargharvastu.com
          </a>
          ), we believe in transparent, rational, and positive spatial guidance. Please review this disclaimer to understand the advisory scope and philosophical nature of our content.
        </p>
        <div className="pt-2 text-[11px] text-stone-400 font-medium">
          Last Updated: September 2026 • Published by Ghar Ghar Vastu Editorial Team
        </div>
      </header>

      {/* Core Principle Callout */}
      <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/80 border border-amber-200/90 space-y-3">
        <div className="flex items-center gap-2 text-amber-950 font-heading font-bold text-base">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
          <span>Core Advisory Principle</span>
        </div>
        <p className="text-xs sm:text-sm text-amber-900 leading-relaxed font-medium">
          Ghar Ghar Vastu provides educational information and automated spatial suggestions derived from classical Indian Vastu Shastra traditions and modern generative artificial intelligence. These recommendations are intended to encourage organized, well-lit, and harmonious living environments. They are <strong>not empirical scientific facts</strong>, nor do they carry guarantees of specific life outcomes.
        </p>
      </div>

      {/* Main Content Body */}
      <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-10 shadow-xs space-y-10 text-xs sm:text-sm leading-relaxed text-stone-700">
        {/* Section 1: Traditional Belief vs Empirical Science */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">1</span>
            Traditional Practice, Not Empirical Cause-and-Effect
          </h2>
          <p>
            Vastu Shastra is a traditional cultural and philosophical discipline developed in ancient India that integrates directional orientations, solar paths, and natural elements with domestic architecture.
          </p>
          <p>
            While many traditional principles offer practical benefits regarding natural ventilation, passive daylighting, and spatial organization, <strong>Vastu recommendations should not be represented or relied upon as scientifically proven causes of human events</strong>. When our articles or AI tools describe traditional associations (such as certain corners representing prosperity or peace), these should be understood as cultural metaphors and customary design beliefs rather than deterministic guarantees.
          </p>
        </section>

        {/* Section 2: What We Do NOT Provide */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">2</span>
            Specific Non-Professional Declarations
          </h2>
          <p>
            Ghar Ghar Vastu strictly clarifies that its services and articles do NOT constitute the following:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="font-bold text-stone-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-rose-600" />
                <span>No Medical Advice</span>
              </div>
              <p className="text-xs text-stone-600">
                Ghar Ghar Vastu does not provide medical diagnosis, treatment, therapy, or health guarantees. Vastu layouts do not cure illnesses, diabetes, blood pressure, or psychological conditions. For all medical and psychological concerns, consult qualified healthcare practitioners.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="font-bold text-stone-900 flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span>No Financial Advice</span>
              </div>
              <p className="text-xs text-stone-600">
                We do not provide financial, wealth management, tax, or investment counseling. Directional alignments do not guarantee business success or financial windfalls. Financial growth depends on skills, budgeting, planning, and economic conditions.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="font-bold text-stone-900 flex items-center gap-2">
                <Hammer className="w-4 h-4 text-amber-600" />
                <span>No Structural Engineering</span>
              </div>
              <p className="text-xs text-stone-600">
                We do not provide structural, architectural, civil engineering, electrical, or plumbing certifications. Never break load-bearing walls or modify building foundations based on Vastu suggestions without consulting licensed structural engineers.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: AI Model Limitations */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">3</span>
            Artificial Intelligence Limitations
          </h2>
          <p>
            Our AI Vastu Advisor and automated photo-analysis tools utilize generative multimodal models (Google Gemini AI). While trained on extensive architectural and traditional texts:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-stone-700">
            <li>AI can occasionally produce incomplete, generalized, or inaccurate observations about an uploaded photograph due to lighting, angle, or lens distortion.</li>
            <li>Compass measurements taken on mobile devices may be affected by nearby magnetic interference, steel rebars, or electrical conduits.</li>
            <li>Users are urged to use personal discretion, common sense, and practical spatial requirements when evaluating suggestions.</li>
          </ul>
        </section>

        {/* Section 4: Our Rejection of Fear-Based Superstition */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">4</span>
            Strict Rejection of Fear-Based Claims & Superstition
          </h2>
          <p>
            Ghar Ghar Vastu fundamentally opposes fear-mongering and superstitious exploitation in Vastu consulting. We never use fatalistic or alarming language such as:
          </p>
          <div className="p-4 rounded-2xl bg-stone-100/70 border border-stone-200 text-stone-600 text-xs space-y-1.5 line-through">
            <div>"This direction will destroy your family"</div>
            <div>"A toilet here will cause incurable disease or cancer"</div>
            <div>"Your marriage will definitely fail due to bedroom placement"</div>
            <div>"You will face bankruptcy without expensive gemstone remedies"</div>
          </div>
          <p className="pt-2">
            Instead, we promote calm, constructive, and practical interior thinking:
          </p>
          <ul className="space-y-1.5 text-stone-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Constructive Prioritization:</strong> Focus on natural light, healthy cross-ventilation, functional furniture ergonomics, uncluttered spaces, and pleasant color psychology.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Non-Destructive Solutions:</strong> We focus on movable adjustments (shifting desks, rearranging beds, adding indoor plants, soft warm lighting, mirrors) rather than costly structural demolitions.</span>
            </li>
          </ul>
        </section>

        {/* Section 5: Practical Guidance Reminder */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">5</span>
            Balancing Tradition with Modern Reality
          </h2>
          <p>
            Modern apartments, multi-story flats, and urban rental homes often have fixed plumbing shafts, pre-installed front doors, and shared concrete structures. Trying to achieve 100% textbook Vastu in modern urban living is rarely practical or necessary.
          </p>
          <p>
            Your home should be a sanctuary of comfort, rest, and happiness. If a traditional Vastu rule conflicts with practical hygiene, building codes, safety, or your family's daily comfort, <strong>practicality, safety, and hygiene must always take precedence</strong>.
          </p>
        </section>

        {/* Section 6: Inquiries */}
        <section className="p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
          <h2 className="text-base font-heading font-bold text-stone-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-amber-700" />
            Questions or Content Clarifications?
          </h2>
          <p className="text-xs text-stone-600">
            If you notice any claim on our platform that seems exaggerated, fear-based, or inaccurate, please notify our editorial board at{' '}
            <a href="mailto:support@ghargharvastu.com" className="text-amber-700 font-semibold underline">
              support@ghargharvastu.com
            </a>
            . We review user feedback and update our content to maintain the highest standards of transparency and integrity.
          </p>
        </section>
      </div>

      {/* Internal Navigation Links */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200 text-xs font-medium text-stone-600">
        <span>Explore Our Educational Guides & Trust Pages:</span>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={() => handleNav('about')} className="text-amber-700 hover:underline font-semibold">
            About Our Mission
          </button>
          <span>•</span>
          <button onClick={() => handleNav('terms-and-conditions')} className="text-amber-700 hover:underline font-semibold">
            Terms & Conditions
          </button>
          <span>•</span>
          <button onClick={() => handleNav('contact')} className="text-amber-700 hover:underline font-semibold">
            Contact Us
          </button>
        </div>
      </div>
    </div>
  );
};
