import React, { useState, useEffect } from 'react';
import { SeoTopicPageData, SEO_TOPIC_PAGES } from '../data/seoPagesData';
import {
  Compass,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Camera,
  MessageSquare,
  Home,
  ChevronRight,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

interface SeoTopicPageViewProps {
  topic?: SeoTopicPageData;
  slug?: string;
  onNavigate?: (view: string) => void;
  onAskQuestion?: (query: string) => void;
  onUploadPhotoForCategory?: (categoryName: string) => void;
  onStartAnalysis?: (categoryName: string) => void;
}

export const SeoTopicPageView: React.FC<SeoTopicPageViewProps> = ({
  topic: propTopic,
  slug,
  onNavigate,
  onAskQuestion,
  onUploadPhotoForCategory,
  onStartAnalysis,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const topic: SeoTopicPageData | undefined =
    propTopic ||
    (slug && SEO_TOPIC_PAGES[slug]) ||
    SEO_TOPIC_PAGES['vastu-shastra'];

  const handlePhotoUpload = (categoryName: string) => {
    if (onUploadPhotoForCategory) {
      onUploadPhotoForCategory(categoryName);
    } else if (onStartAnalysis) {
      onStartAnalysis(categoryName);
    }
  };

  const handleAsk = (query: string) => {
    if (onAskQuestion) {
      onAskQuestion(query);
    }
  };

  const handleNav = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else if (typeof window !== 'undefined' && window.history?.pushState) {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined' || !topic) return;
    document.title = topic.title || 'Ghar Ghar Vastu';

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && topic.metaDescription) metaDesc.setAttribute('content', topic.metaDescription);

    let canonical = document.querySelector('link[rel="canonical"]');
    const canonicalUrl = `https://ghargharvastu.com${topic.path || ''}`;
    if (canonical) {
      canonical.setAttribute('href', canonicalUrl);
    } else {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', canonicalUrl);
      document.head.appendChild(canonical);
    }

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && topic.title) ogTitle.setAttribute('content', topic.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && topic.metaDescription) ogDesc.setAttribute('content', topic.metaDescription);
  }, [topic]);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  if (!topic) {
    return (
      <div className="p-8 text-center text-stone-600">
        <p>Vastu topic guide not found.</p>
      </div>
    );
  }

  const faqList = Array.isArray(topic.faq) ? topic.faq : [];
  const idealDirections = Array.isArray(topic.idealDirections) ? topic.idealDirections : [];
  const goldenPrinciples = Array.isArray(topic.goldenPrinciples) ? topic.goldenPrinciples : [];
  const commonMistakes = Array.isArray(topic.commonMistakes) ? topic.commonMistakes : [];
  const internalLinks = Array.isArray(topic.internalLinks) ? topic.internalLinks : [];

  // Structured data for rich search engine indexing
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqList.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://ghargharvastu.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: topic.h1,
        item: `https://ghargharvastu.com${topic.path}`,
      },
    ],
  };

  return (
    <article className="space-y-8 sm:space-y-10 pb-16 max-w-4xl w-full mx-auto min-w-0">
      {/* Schema.org Injections */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500 overflow-x-auto py-1">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history?.pushState) {
              window.history.pushState(null, '', '/');
            }
            handleNav('home');
          }}
          className="hover:text-amber-800 transition-colors flex items-center gap-1 shrink-0 font-medium"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Ghar Ghar Vastu</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <span className="text-stone-800 font-semibold truncate">{topic.h1}</span>
      </nav>

      {/* Hero Header */}
      <header className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-amber-500/10 via-amber-100/20 to-stone-50/50 p-5 sm:p-10 border border-amber-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
            <Sparkles className="w-3 h-3 text-amber-600" />
            {topic.badge}
          </span>
          <span className="text-xs font-semibold text-stone-500">{topic.hindiTitle}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-heading font-extrabold text-stone-900 tracking-tight leading-tight">
          {topic.h1}
        </h1>

        <p className="text-sm sm:text-base text-amber-900/90 font-medium">
          {topic.subtitle}
        </p>

        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-3xl">
          {topic.intro}
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-3">
          <button
            type="button"
            onClick={() => handleAsk(topic.ctaQuery)}
            className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/25 flex items-center gap-2 transition-all active:scale-98"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>{topic.ctaText}</span>
          </button>
          <button
            type="button"
            onClick={() => handlePhotoUpload(topic.h1.split(':')[0])}
            className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-900 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-2xs transition-all active:scale-98"
          >
            <Camera className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Check Photo with AI Vision</span>
          </button>
        </div>
      </header>

      {/* Key Cardinal Rule Callout */}
      <section className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-stone-800 space-y-1.5 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
          <Compass className="w-4 h-4 text-amber-600" />
          <span>Core Vastu Directive</span>
        </div>
        <p className="text-xs sm:text-sm font-semibold text-stone-900 leading-relaxed">
          {topic.keyRule}
        </p>
      </section>

      {/* Ideal Directions Analysis */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-stone-900">
            Ideal Directions & Spatial Zoning
          </h2>
          <p className="text-xs text-stone-500">
            How magnetic poles and daylight progression affect this room
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {idealDirections.map((dir, idx) => {
            const isBest = dir.verdict === 'Best';
            const isAvoid = dir.verdict === 'Avoid';
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading font-bold text-sm text-stone-900">
                      {dir.direction}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isBest
                          ? 'bg-emerald-100 text-emerald-800'
                          : isAvoid
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {dir.verdict}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-stone-400 mt-0.5">{dir.hindiName}</div>
                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">{dir.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Golden Principles */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-stone-900">
            Golden Rules & Practical Guidelines
          </h2>
          <p className="text-xs text-stone-500">
            Timeless Vedic architecture harmonized with modern living standards
          </p>
        </div>

        <div className="space-y-3">
          {goldenPrinciples.map((rule, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-heading font-bold text-stone-900">
                    {rule.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {rule.description}
                  </p>
                  {rule.remedyTip && (
                    <div className="pt-2 flex items-start gap-2 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Actionable Tip: {rule.remedyTip}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Common Mistakes & Non-Destructive Remedies */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-stone-900">
            Common Vastu Dosh & Non-Destructive Remedies
          </h2>
          <p className="text-xs text-stone-500">
            No demolition required: practical corrections for apartments and flats
          </p>
        </div>

        <div className="space-y-3">
          {commonMistakes.map((item, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h3 className="text-xs sm:text-sm font-bold text-stone-900">{item.mistake}</h3>
                  <p className="text-xs text-rose-700">{item.impact}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-900 font-bold">Vastu Remedy (बिना तोड़-फोड़ उपाय): </strong>
                  {item.remedy}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Frequently Asked Questions (FAQ Section) */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-stone-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-stone-500">
            Common queries answered by Ghar Ghar Vastu architectural experts
          </p>
        </div>

        <div className="space-y-2.5">
          {faqList.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-stone-200/90 shadow-2xs overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 font-semibold text-xs sm:text-sm text-stone-900 hover:text-amber-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{item.question}</span>
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${
                      isOpen ? 'rotate-90 text-amber-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-4.5 sm:pb-4.5 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Internal Linking & Related Topics */}
      <section className="p-6 rounded-3xl bg-stone-50 border border-stone-200/80 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-heading font-bold text-stone-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Explore Related Vastu Guides</span>
          </h2>
          <p className="text-xs text-stone-500">
            Discover complete Vedic harmony across every quadrant of your home
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {internalLinks.map((link, idx) => (
            <a
              key={idx}
              href={link.path}
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== 'undefined' && window.history?.pushState) {
                  window.history.pushState(null, '', link.path);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 hover:shadow-xs transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-bold text-stone-900 group-hover:text-amber-700 transition-colors flex items-center justify-between">
                  <span>{link.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                  {link.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Sticky or Bottom AI Consultation Call to Action */}
      <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-md space-y-4 text-center">
        <div className="max-w-xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold">
            Have a Specific Question about Your {topic.h1.split(':')[0]}?
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
            Upload your room photo or ask our Gemini-powered AI Vastu Advisor for an instant, practical audit with zero fear-mongering.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleAsk(topic.ctaQuery)}
            className="px-5 py-3 rounded-2xl bg-white text-stone-900 hover:bg-stone-50 font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all active:scale-98"
          >
            <MessageSquare className="w-4 h-4 text-amber-600" />
            <span>Ask Ghar Ghar Vastu AI</span>
          </button>
          <button
            type="button"
            onClick={() => handlePhotoUpload(topic.h1.split(':')[0])}
            className="px-5 py-3 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-amber-500/40 transition-all active:scale-98"
          >
            <Camera className="w-4 h-4" />
            <span>Upload Photo for Analysis</span>
          </button>
        </div>
      </section>
    </article>
  );
};
