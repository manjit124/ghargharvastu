import React, { useEffect } from 'react';
import {
  Compass,
  Sparkles,
  ShieldCheck,
  Camera,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  Home,
  ArrowRight,
  Lock,
  AlertCircle,
  Wrench,
  Info,
  Layers,
  HelpCircle,
  FileText,
  Mail,
  Palette,
  LayoutGrid,
} from 'lucide-react';

interface AboutViewProps {
  onNavigate?: (view: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // 1. Page Title
      document.title = 'About Ghar Ghar Vastu | AI Vastu Guidance';

      // 2. Meta Description
      const metaDescriptionText =
        'Learn about Ghar Ghar Vastu, an AI-powered platform for exploring traditional Vastu concepts, home guidance, practical tips and educational resources.';
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', metaDescriptionText);
      } else {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        metaDesc.setAttribute('content', metaDescriptionText);
        document.head.appendChild(metaDesc);
      }

      // 3. Canonical URL
      const canonicalUrl = 'https://ghargharvastu.com/about';
      let canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        canonical.setAttribute('href', canonicalUrl);
      } else {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        canonical.setAttribute('href', canonicalUrl);
        document.head.appendChild(canonical);
      }

      // 4. OpenGraph Tags
      const setMetaProperty = (property: string, content: string) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (tag) {
          tag.setAttribute('content', content);
        } else {
          tag = document.createElement('meta');
          tag.setAttribute('property', property);
          tag.setAttribute('content', content);
          document.head.appendChild(tag);
        }
      };

      setMetaProperty('og:title', 'About Ghar Ghar Vastu | AI Vastu Guidance');
      setMetaProperty('og:description', metaDescriptionText);
      setMetaProperty('og:url', canonicalUrl);
      setMetaProperty('og:type', 'website');
      setMetaProperty('og:site_name', 'Ghar Ghar Vastu');

      // 5. Twitter Card Tags
      const setMetaName = (name: string, content: string) => {
        let tag = document.querySelector(`meta[name="${name}"]`);
        if (tag) {
          tag.setAttribute('content', content);
        } else {
          tag = document.createElement('meta');
          tag.setAttribute('name', name);
          tag.setAttribute('content', content);
          document.head.appendChild(tag);
        }
      };

      setMetaName('twitter:card', 'summary_large_image');
      setMetaName('twitter:title', 'About Ghar Ghar Vastu | AI Vastu Guidance');
      setMetaName('twitter:description', metaDescriptionText);

      // 6. Schema.org JSON-LD Structured Data
      const structuredDataId = 'structured-data-about-page';
      let scriptTag = document.getElementById(structuredDataId) as HTMLScriptElement | null;
      const schemaData = {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'About Ghar Ghar Vastu',
        url: canonicalUrl,
        description: metaDescriptionText,
        mainEntity: {
          '@type': 'WebApplication',
          name: 'Ghar Ghar Vastu',
          url: 'https://ghargharvastu.com',
          applicationCategory: 'LifestyleApplication',
          operatingSystem: 'All',
          description:
            'AI-powered Vastu and home guidance platform helping users explore traditional spatial concepts, direction-based insights, and practical living principles.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'INR',
          },
        },
      };

      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = structuredDataId;
        scriptTag.type = 'application/ld+json';
        scriptTag.text = JSON.stringify(schemaData);
        document.head.appendChild(scriptTag);
      } else {
        scriptTag.text = JSON.stringify(schemaData);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNav = (view: string, pathUrl?: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else if (typeof window !== 'undefined' && window.history?.pushState) {
      window.history.pushState(null, '', pathUrl || `/${view}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 space-y-8 text-stone-800">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-stone-500 font-medium">
        <button
          onClick={() => handleNav('home', '/')}
          className="flex items-center gap-1 hover:text-amber-800 transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
        <span className="text-stone-900 font-semibold">About Us</span>
      </nav>

      {/* Hero Header Section */}
      <header className="p-6 sm:p-10 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
          <Compass className="w-4 h-4 text-amber-700" />
          <span>Transparent Home & Spatial Guidance</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-stone-900 tracking-tight">
          About Ghar Ghar Vastu
        </h1>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-3xl">
          An AI-powered Vastu and home guidance platform helping everyday homeowners explore traditional spatial concepts, direction-based insights, practical architectural factors, and comfortable living principles in a simple, transparent way.
        </p>
      </header>

      {/* Main Content Body */}
      <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-10 shadow-xs space-y-12 text-xs sm:text-sm leading-relaxed text-stone-700">

        {/* 1. WHO WE ARE */}
        <section className="space-y-3.5" id="who-we-are">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900">
              Who We Are
            </h2>
          </div>
          <p>
            <strong>Ghar Ghar Vastu</strong> is an AI-powered Vastu and home guidance platform designed to help homeowners, apartment dwellers, and tenants understand traditional Vastu Shastra concepts in a clear, simple, and practical way.
          </p>
          <p>
            We believe that home guidance should be honest, calm, and grounded in reality. In an industry frequently overshadowed by exaggerated marketing, fear-mongering warnings, and unrealistic guarantees, Ghar Ghar Vastu takes a strictly transparent approach:
          </p>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 text-stone-700 text-xs leading-relaxed space-y-1.5">
            <p className="font-semibold text-stone-900">Our Transparency Commitment:</p>
            <p>
              We do not claim to be "India's No. 1 Vastu platform", we do not promise "100% accurate AI", we do not claim that Vastu is a "scientifically proven law", and we never promise "guaranteed wealth", "guaranteed health cures", or "guaranteed business success".
            </p>
            <p>
              Instead, we provide accessible digital tools, educational articles, and AI-assisted analysis to help you reflect thoughtfully on your living environment.
            </p>
          </div>
        </section>

        {/* 2. OUR PURPOSE */}
        <section className="space-y-3.5" id="our-purpose">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900">
              Our Purpose
            </h2>
          </div>
          <p>
            The purpose of Ghar Ghar Vastu is to make Vastu-related information easier to understand and accessible to everyday homeowners without requiring expensive consultancies or destructive structural remodeling.
          </p>
          <p>
            Our platform thoughtfully combines five essential pillars:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-1">
              <div className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Traditional Concepts</span>
              </div>
              <p className="text-stone-600 text-xs">
                Authentic cultural and classical guidelines derived from traditional Indian architectural treatises.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-1">
              <div className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <span>AI-Assisted Analysis</span>
              </div>
              <p className="text-stone-600 text-xs">
                Modern conversational and visual technology to interpret layouts and suggest sensible room arrangements.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-1">
              <div className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Practical Considerations</span>
              </div>
              <p className="text-stone-600 text-xs">
                Ventilation, natural daylighting, ergonomics, hygiene, fire safety, and building regulations.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-1">
              <div className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Educational Articles</span>
              </div>
              <p className="text-stone-600 text-xs">
                Well-researched, original knowledge guides covering apartment living, directions, and color harmony.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-1 sm:col-span-2 lg:col-span-2">
              <div className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Easy-to-Understand Guidance</span>
              </div>
              <p className="text-stone-600 text-xs">
                Zero Sanskrit jargon barriers, fear-free advice, and non-destructive remedies (Bina Tod-Phod) tailored for modern Indian apartments and homes.
              </p>
            </div>
          </div>
          <p className="pt-1 text-stone-600 text-xs">
            <em>Important Note:</em> We clearly encourage all users to always weigh real-world, practical factors—such as structural integrity, electrical safety, plumbing convenience, and personal comfort—alongside traditional Vastu beliefs.
          </p>
        </section>

        {/* 3. WHAT WE OFFER */}
        <section className="space-y-4" id="what-we-offer">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900">
              What We Offer
            </h2>
          </div>
          <p>
            Every feature on Ghar Ghar Vastu is built directly into our accessible web application. Here is a clear overview of our actual services:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* Feature 1 */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>AI Vastu Advisor</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">Interactive</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                An interactive chat consultant where you can ask specific questions about bedroom layouts, kitchen cooking directions, main entrances, and work desks in English, Hindi, or Hinglish.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>AI-Based Image Analysis</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Multimodal</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Upload room photographs (living room, bedroom, kitchen, pooja room, or entrance). Our AI analyzes visible layout elements, clutter, lighting, and furniture to suggest movable improvements.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Direction-Based Guidance & Compass</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">Sensor Tool</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                An integrated 16-zone digital compass tool to help you identify cardinal and ordinal directions inside your room or apartment, mapping traditional zones (North-East Ishanya, South-East Agneya, etc.).
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Vastu Colour Advisor</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">Visual</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Room-by-room wall shade and accent recommendations balancing traditional elemental zones with modern lighting, room orientation, and optical spaciousness.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Object & Remedy Placement</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 font-semibold">Non-Structural</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Practical suggestions for placing everyday items—such as mirrors, clocks, plants, study tables, and water features—prioritizing simple furniture adjustments over breaking walls.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Vastu Articles & Educational Resources</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">Editorial</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                In-depth educational guides detailing bedroom, kitchen, bathroom, main door, and overall home planning, each featuring practical real-world considerations like ventilation and daylighting.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 md:col-span-2">
              <div className="font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Free Credits & Transparent Paid Subscriptions</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Transparent</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Every user receives free trial queries and photo credits upon joining so you can explore all features risk-free. Optional paid subscription plans (Basic, Pro, and Lifetime access) are processed securely through Razorpay with transparent pricing, zero hidden charges, and a clear 7-day refund policy.
              </p>
            </div>
          </div>
        </section>

        {/* 4. HOW OUR AI WORKS */}
        <section className="space-y-3.5" id="how-ai-works">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
              4
            </span>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900">
              How Our AI Works
            </h2>
          </div>
          <p>
            Ghar Ghar Vastu utilizes modern artificial intelligence (large language and multimodal vision models) to interpret user-submitted questions, room details, and photographs. The system synthesizes these inputs against structured frameworks of traditional Indian spatial planning and interior design best practices.
          </p>
          <p>
            While this technology enables rapid, personalized, and accessible feedback, we believe in open and honest communication about its technical nature:
          </p>

          <div className="space-y-2.5 pt-1">
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 flex items-start gap-2.5 text-xs text-stone-700">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900 font-semibold">AI Responses Can Sometimes Be Inaccurate: </strong>
                Language models process statistical text patterns and may occasionally misinterpret specific architectural contexts or generate sub-optimal suggestions.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 flex items-start gap-2.5 text-xs text-stone-700">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900 font-semibold">Not a Replacement for Qualified Professionals: </strong>
                AI guidance should never be substituted for on-site inspections by licensed civil engineers, architects, certified interior designers, or safety inspectors.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 flex items-start gap-2.5 text-xs text-stone-700">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900 font-semibold">Image Analysis Limitations: </strong>
                Computer vision models assess uploaded photos from a 2D angle. They cannot measure load-bearing capabilities, inspect hidden electrical wiring, accurately determine magnetic compass direction without user input, or identify every small decorative object.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 flex items-start gap-2.5 text-xs text-stone-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900 font-semibold">Better Information Yields Better Guidance: </strong>
                Providing accurate room directions, clear well-lit photos, and detailed descriptions helps produce much more relevant, sensible suggestions.
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-600 pt-1">
            <strong>Scientific Note:</strong> We do not claim that AI can scientifically prove Vastu effects, cosmic energy fields, or mystical outcomes. The AI functions as an assistive organizational and advisory tool.
          </p>
        </section>

        {/* 5. OUR APPROACH TO VASTU */}
        <section className="space-y-3.5" id="our-approach">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
              5
            </span>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900">
              Our Approach to Vastu
            </h2>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 font-medium text-xs sm:text-sm">
            "Ghar Ghar Vastu presents Vastu primarily as a traditional and cultural system of home-planning beliefs and guidance."
          </div>
          <p>
            We hold deep respect for India's architectural heritage. Historically, Vastu principles originated as empirical observations for ancient construction: placing kitchens in the south-east to benefit from prevailing wind currents, orienting living spaces to receive gentle morning sun, and avoiding damp northern exposures.
          </p>
          <p>
            When applying these principles today, our philosophy is anchored in common sense and peace of mind:
          </p>
          <ul className="space-y-2 list-disc list-inside text-stone-700 pl-1">
            <li>
              <strong>Interpretations Vary:</strong> Traditional Vastu guidelines vary between classical texts (such as the <em>Mayamata</em>, <em>Manasara</em>, and <em>Samarangana Sutradhara</em>), regional traditions, and individual practitioners. There is rarely a single dogmatic answer.
            </li>
            <li>
              <strong>No Guaranteed Cause-and-Effect:</strong> Vastu recommendations should never be presented as guaranteed cause-and-effect outcomes. Life events depend on complex personal, medical, professional, and societal factors—not the angle of a bed.
            </li>
            <li>
              <strong>Practical Factors Matter:</strong> Natural cross-ventilation, daylighting, hygiene, fire safety, structural integrity, acoustic comfort, accessibility for elderly family members, and modern functionality are just as essential as cultural alignments.
            </li>
            <li>
              <strong>Bina Tod-Phod (Non-Destructive):</strong> We never advise breaking down walls, removing pillars, or undertaking costly renovations. Practical adjustments (shifting furniture, adding indoor plants, enhancing lighting) are always preferred.
            </li>
          </ul>
        </section>

        {/* 6. WHAT WE DO NOT CLAIM */}
        <section className="space-y-3.5" id="what-we-do-not-claim">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
              6
            </span>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900">
              What We Do Not Claim
            </h2>
          </div>
          <p>
            To uphold genuine trust and ethical standards, we explicitly state what Ghar Ghar Vastu does <strong>NOT</strong> claim:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-2.5 text-xs text-stone-700">
              <span className="text-red-500 font-bold text-sm shrink-0">✕</span>
              <span>We do <strong>not</strong> claim that a particular direction will definitely cause illness or disease.</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-2.5 text-xs text-stone-700">
              <span className="text-red-500 font-bold text-sm shrink-0">✕</span>
              <span>We do <strong>not</strong> claim that a Vastu defect will definitely cause financial loss or ruin.</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-2.5 text-xs text-stone-700">
              <span className="text-red-500 font-bold text-sm shrink-0">✕</span>
              <span>We do <strong>not</strong> claim that a room placement can guarantee wealth, abundance, or prosperity.</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-2.5 text-xs text-stone-700">
              <span className="text-red-500 font-bold text-sm shrink-0">✕</span>
              <span>We do <strong>not</strong> claim that Vastu can diagnose, treat, or cure physical or mental health conditions.</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-2.5 text-xs text-stone-700">
              <span className="text-red-500 font-bold text-sm shrink-0">✕</span>
              <span>We do <strong>not</strong> claim that Vastu can guarantee marriage, relationship, career, or business outcomes.</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-2.5 text-xs text-stone-700">
              <span className="text-red-500 font-bold text-sm shrink-0">✕</span>
              <span>We do <strong>not</strong> claim that AI analysis is always 100% accurate, definitive, or error-free.</span>
            </div>
          </div>
        </section>

        {/* 7. OUR CONTENT PRINCIPLES */}
        <section className="space-y-3.5" id="content-principles">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
              7
            </span>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900">
              Our Content Principles
            </h2>
          </div>
          <p>
            All educational articles, topic guides, and AI prompts on Ghar Ghar Vastu are developed under rigorous editorial principles designed to inform and comfort:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Clear Information</span>
              </div>
              <p className="text-stone-600 text-xs">
                Plain, accessible language free from obscure technical or astrological terminology.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Practical Suggestions</span>
              </div>
              <p className="text-stone-600 text-xs">
                Actionable tips for furniture arrangement, lighting, ventilation, and decluttering.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Original Content</span>
              </div>
              <p className="text-stone-600 text-xs">
                Researched, original guides written specifically for modern Indian living conditions.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Transparent AI Limits</span>
              </div>
              <p className="text-stone-600 text-xs">
                Clear notices about what automated models can and cannot identify accurately.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Non-Fear Guidance</span>
              </div>
              <p className="text-stone-600 text-xs">
                Zero fatalistic warnings or superstitious threats regarding family health or fortune.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Cultural Context</span>
              </div>
              <p className="text-stone-600 text-xs">
                Clearly distinguishing traditional cultural beliefs from empirical medical or engineering advice.
              </p>
            </div>
          </div>
        </section>

        {/* 8. PRIVACY AND USER TRUST */}
        <section className="space-y-3.5" id="privacy-and-user-trust">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
              8
            </span>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900">
              Privacy and User Trust
            </h2>
          </div>
          <p>
            User trust and data confidentiality are fundamental to everything we do. Uploaded room photographs and personal chat sessions represent your private sanctuary, and we treat them with the utmost confidentiality:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-stone-700 pl-1">
            <li>We do not sell, rent, or publicly display your submitted photos or consultation inquiries.</li>
            <li>AI image processing is handled securely on protected server infrastructure.</li>
            <li>Authentication is powered by enterprise-grade Firebase security (Google Sign-In, Mobile OTP, Email).</li>
            <li>Payments are handled through PCI-DSS compliant Razorpay gateways with encrypted transmission.</li>
          </ul>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 pt-3">
            <p className="font-semibold text-stone-900 text-xs">Learn More in Our Official Policies:</p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              <button
                onClick={() => handleNav('privacy-policy', '/privacy-policy')}
                className="text-amber-700 hover:text-amber-900 underline font-semibold cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-stone-300">•</span>
              <button
                onClick={() => handleNav('terms', '/terms-and-conditions')}
                className="text-amber-700 hover:text-amber-900 underline font-semibold cursor-pointer"
              >
                Terms & Conditions
              </button>
              <span className="text-stone-300">•</span>
              <button
                onClick={() => handleNav('disclaimer', '/disclaimer')}
                className="text-amber-700 hover:text-amber-900 underline font-semibold cursor-pointer"
              >
                Vastu Disclaimer
              </button>
              <span className="text-stone-300">•</span>
              <button
                onClick={() => handleNav('contact', '/contact')}
                className="text-amber-700 hover:text-amber-900 underline font-semibold cursor-pointer"
              >
                Contact Us
              </button>
            </div>
          </div>
        </section>

        {/* 9. WHO CAN USE GHAR GHAR VASTU */}
        <section className="space-y-3.5" id="who-can-use">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
              9
            </span>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900">
              Who Can Use Ghar Ghar Vastu
            </h2>
          </div>
          <p>
            Our platform is designed for anyone who wants a constructive, practical perspective on their living space, including:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 flex items-start gap-2.5 text-xs text-stone-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>New Homeowners & Buyers:</strong> Looking to evaluate floor plans and room layouts before purchasing or moving in.</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 flex items-start gap-2.5 text-xs text-stone-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Tenants & Apartment Renters:</strong> Seeking non-permanent, non-structural arrangements and decor adjustments.</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 flex items-start gap-2.5 text-xs text-stone-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Curious Learners:</strong> Anyone interested in studying traditional Vastu concepts and direction-based planning.</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 flex items-start gap-2.5 text-xs text-stone-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Interior Decorators:</strong> Exploring how classical orientation intersects with natural lighting and room aesthetics.</span>
            </div>
          </div>
          <p className="text-xs text-stone-500 pt-1">
            <em>Reminder:</em> Ghar Ghar Vastu is an educational and advisory tool. It does not provide medical, financial, or legally binding architectural services.
          </p>
        </section>

        {/* 10. CONTACT / FEEDBACK */}
        <section className="space-y-3.5" id="contact-feedback">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
              10
            </span>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900">
              Contact & Community Feedback
            </h2>
          </div>
          <p>
            We actively welcome questions, feedback, and suggestions from our community. Please reach out to us for:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Technical issues or bug reports</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Login or account verification assistance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Subscription or Razorpay payment inquiries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Privacy requests or data queries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Content correction and editorial requests</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>General suggestions for improving the platform</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-3">
            <div className="space-y-1">
              <div className="font-bold text-stone-900 text-xs sm:text-sm flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-700" />
                <span>Official Support Email:</span>
                <a
                  href="mailto:support@ghargharvastu.com"
                  className="text-amber-800 hover:underline font-semibold"
                >
                  support@ghargharvastu.com
                </a>
              </div>
              <p className="text-stone-600 text-xs">
                Our support team typically responds within 24 business hours.
              </p>
            </div>
            <button
              onClick={() => handleNav('contact', '/contact')}
              className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Visit Contact Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

      </div>

      {/* Explore Practical Tools & Educational Guides */}
      <section className="p-6 sm:p-8 rounded-3xl bg-amber-50/60 border border-amber-200/80 shadow-xs space-y-4">
        <h2 className="text-base sm:text-lg font-heading font-bold text-stone-900 flex items-center gap-2">
          <Compass className="w-5 h-5 text-amber-700" />
          <span>Explore Practical Tools & In-Depth Guides</span>
        </h2>
        <p className="text-xs sm:text-sm text-stone-600">
          Discover our interactive advisors and comprehensive room guides:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <button
            onClick={() => handleNav('chat', '/ai-vastu-advisor')}
            className="p-3 rounded-xl bg-white border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-colors font-medium text-stone-800 flex items-center justify-between cursor-pointer"
          >
            <span>AI Vastu Advisor</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
          <button
            onClick={() => handleNav('photo-analysis', '/image-analysis')}
            className="p-3 rounded-xl bg-white border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-colors font-medium text-stone-800 flex items-center justify-between cursor-pointer"
          >
            <span>Photo Analysis</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
          <button
            onClick={() => handleNav('blog', '/blog')}
            className="p-3 rounded-xl bg-white border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-colors font-medium text-stone-800 flex items-center justify-between cursor-pointer"
          >
            <span>Vastu Blog Hub</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
          <button
            onClick={() => handleNav('topic-page', '/bedroom-vastu')}
            className="p-3 rounded-xl bg-white border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-colors font-medium text-stone-800 flex items-center justify-between cursor-pointer"
          >
            <span>Bedroom Vastu</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
          <button
            onClick={() => handleNav('topic-page', '/kitchen-vastu')}
            className="p-3 rounded-xl bg-white border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-colors font-medium text-stone-800 flex items-center justify-between cursor-pointer"
          >
            <span>Kitchen Vastu</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
          <button
            onClick={() => handleNav('topic-page', '/main-door-vastu')}
            className="p-3 rounded-xl bg-white border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-colors font-medium text-stone-800 flex items-center justify-between cursor-pointer"
          >
            <span>Main Door Vastu</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>
      </section>

      {/* Bottom Legal Links Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200 text-xs font-medium text-stone-600">
        <span>Transparency & Policies:</span>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleNav('privacy-policy', '/privacy-policy')}
            className="text-amber-700 hover:underline font-semibold cursor-pointer"
          >
            Privacy Policy
          </button>
          <span className="text-stone-300">•</span>
          <button
            onClick={() => handleNav('terms', '/terms-and-conditions')}
            className="text-amber-700 hover:underline font-semibold cursor-pointer"
          >
            Terms & Conditions
          </button>
          <span className="text-stone-300">•</span>
          <button
            onClick={() => handleNav('disclaimer', '/disclaimer')}
            className="text-amber-700 hover:underline font-semibold cursor-pointer"
          >
            Vastu Disclaimer
          </button>
          <span className="text-stone-300">•</span>
          <button
            onClick={() => handleNav('contact', '/contact')}
            className="text-amber-700 hover:underline font-semibold cursor-pointer"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};
