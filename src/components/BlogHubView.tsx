import React, { useState, useEffect } from 'react';
import { BLOG_ARTICLES, BlogArticle } from '../data/blogArticles';
import {
  BookOpen,
  ArrowRight,
  Clock,
  Calendar,
  Sparkles,
  ChevronRight,
  Home,
  MessageSquare,
  Camera,
  CheckCircle2,
  Share2,
} from 'lucide-react';

interface BlogHubViewProps {
  currentSlug?: string | null;
  onNavigate: (view: string) => void;
  onSelectArticle: (slug: string) => void;
  onAskQuestion: (query: string) => void;
  onUploadPhotoForCategory: (categoryName: string) => void;
}

export const BlogHubView: React.FC<BlogHubViewProps> = ({
  currentSlug,
  onNavigate,
  onSelectArticle,
  onAskQuestion,
  onUploadPhotoForCategory,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Find active article if slug exists
  const activeArticle: BlogArticle | undefined = currentSlug
    ? BLOG_ARTICLES.find((a) => a.slug === currentSlug)
    : undefined;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const pageTitle = activeArticle
      ? `${activeArticle.title} | Ghar Ghar Vastu`
      : 'Vastu Shastra Guides & Articles | Ghar Ghar Vastu';
    document.title = pageTitle;

    const metaDesc = document.querySelector('meta[name="description"]');
    const descContent = activeArticle
      ? activeArticle.excerpt
      : 'Read practical, non-destructive Vastu guides, room orientation tips, color rules, and architectural remedies from Ghar Ghar Vastu.';
    if (metaDesc) metaDesc.setAttribute('content', descContent);

    const canonicalUrl = activeArticle
      ? `https://ghargharvastu.com/blog/${activeArticle.slug}`
      : 'https://ghargharvastu.com/blog';

    let canonical = document.querySelector('link[rel="canonical"]');
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
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', descContent);
  }, [activeArticle]);

  const categories = ['All', 'Fundamentals', 'Room Guides', 'Practical Vastu', 'Colors & Decor', 'Remedies'];

  const filteredArticles = selectedCategory === 'All'
    ? BLOG_ARTICLES
    : BLOG_ARTICLES.filter((a) => a.category === selectedCategory);

  // If viewing a specific article
  if (activeArticle) {
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: activeArticle.title,
      description: activeArticle.excerpt,
      author: {
        '@type': 'Organization',
        name: 'Ghar Ghar Vastu',
        url: 'https://ghargharvastu.com',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Ghar Ghar Vastu',
        url: 'https://ghargharvastu.com',
        logo: {
          '@type': 'ImageObject',
          url: 'https://ghargharvastu.com/favicon.svg',
        },
      },
      datePublished: activeArticle.publishedDate,
      mainEntityOfPage: `https://ghargharvastu.com/blog/${activeArticle.slug}`,
      keywords: activeArticle.keywords.join(', '),
    };

    return (
      <article className="space-y-8 max-w-3xl mx-auto pb-16 min-w-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history?.pushState) {
                window.history.pushState(null, '', '/');
              }
              onNavigate('home');
            }}
            className="hover:text-amber-800 transition-colors flex items-center gap-1 shrink-0 font-medium"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Ghar Ghar Vastu</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history?.pushState) {
                window.history.pushState(null, '', '/blog');
              }
              onSelectArticle('');
            }}
            className="hover:text-amber-800 transition-colors font-medium shrink-0"
          >
            Articles
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="text-stone-800 font-semibold truncate">{activeArticle.title}</span>
        </nav>

        {/* Article Header */}
        <header className="space-y-3 border-b border-stone-200 pb-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
              {activeArticle.category}
            </span>
            <span className="flex items-center gap-1 text-stone-500">
              <Clock className="w-3.5 h-3.5" />
              {activeArticle.readTime}
            </span>
            <span className="flex items-center gap-1 text-stone-500">
              <Calendar className="w-3.5 h-3.5" />
              {activeArticle.publishedDate}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-heading font-extrabold text-stone-900 tracking-tight leading-tight">
            {activeArticle.title}
          </h1>

          {activeArticle.hindiTitle && (
            <p className="text-sm font-semibold text-amber-900/80">
              {activeArticle.hindiTitle}
            </p>
          )}

          <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-normal pt-1">
            {activeArticle.excerpt}
          </p>
        </header>

        {/* Article Content Body */}
        <div className="space-y-6 text-stone-700 leading-relaxed text-sm sm:text-base">
          <p className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-stone-800 font-medium leading-relaxed">
            {activeArticle.content.intro}
          </p>

          {activeArticle.content.sections.map((section, idx) => (
            <section key={idx} className="space-y-3 pt-2">
              <h2 className="text-lg sm:text-xl font-heading font-bold text-stone-900">
                {section.heading}
              </h2>
              {section.subheading && (
                <h3 className="text-xs sm:text-sm font-semibold text-amber-800">
                  {section.subheading}
                </h3>
              )}

              {section.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                  {p}
                </p>
              ))}

              {section.keyTakeaway && (
                <div className="p-3.5 rounded-xl bg-stone-50 border-l-4 border-amber-500 text-xs sm:text-sm text-stone-800 font-medium">
                  <strong>Key Takeaway:</strong> {section.keyTakeaway}
                </div>
              )}

              {section.tips && section.tips.length > 0 && (
                <ul className="space-y-1.5 pt-1 pl-2">
                  {section.tips.map((tip, tIdx) => (
                    <li key={tIdx} className="flex items-start gap-2 text-xs sm:text-sm text-stone-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/* Conclusion */}
          <section className="p-5 rounded-2xl bg-stone-100/80 border border-stone-200 text-stone-800 space-y-2">
            <h3 className="font-heading font-bold text-base text-stone-900">Summary & Conclusion</h3>
            <p className="text-xs sm:text-sm leading-relaxed text-stone-700">
              {activeArticle.content.conclusion}
            </p>
          </section>
        </div>

        {/* Interactive Consultation CTA */}
        <section className="p-6 rounded-3xl bg-gradient-to-br from-amber-600 to-amber-700 text-white text-center space-y-4 shadow-sm">
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-heading font-bold">Have Questions About This Vastu Rule?</h3>
            <p className="text-xs text-amber-100">
              Ask Ghar Ghar Vastu AI or upload your room photo for a custom assessment.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onAskQuestion(`Explain ${activeArticle.title} in simple terms for my house`)}
              className="px-4 py-2.5 rounded-xl bg-white text-stone-900 font-bold text-xs hover:bg-stone-50 shadow-xs flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
              <span>Ask AI Advisor</span>
            </button>
            <button
              type="button"
              onClick={() => onUploadPhotoForCategory(activeArticle.category)}
              className="px-4 py-2.5 rounded-xl bg-amber-800 text-white font-bold text-xs hover:bg-amber-900 border border-amber-500/50 flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>
          </div>
        </section>

        {/* Back to All Articles */}
        <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history?.pushState) {
                window.history.pushState(null, '', '/blog');
              }
              onSelectArticle('');
            }}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
          >
            ← Back to All Articles
          </button>
        </div>
      </article>
    );
  }

  // Blog Hub listing view
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 min-w-0">
      {/* Header */}
      <header className="space-y-3 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Vastu Knowledge Hub & Articles</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-heading font-extrabold text-stone-900 tracking-tight">
          Vastu Shastra Guides & Architecture Insights
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          Authentic, research-backed spatial guidelines for Indian homes, apartments, and modern living spaces.
        </p>
      </header>

      {/* Category Pills */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredArticles.map((article) => (
          <article
            key={article.id}
            onClick={() => {
              if (typeof window !== 'undefined' && window.history?.pushState) {
                window.history.pushState(null, '', `/blog/${article.slug}`);
              }
              onSelectArticle(article.slug);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="p-5 rounded-2xl bg-white border border-stone-200/90 hover:border-amber-400 hover:shadow-md cursor-pointer transition-all space-y-3 flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-stone-500">
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200/50">
                  {article.category}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {article.readTime}
                </span>
              </div>

              <h2 className="font-heading font-bold text-base sm:text-lg text-stone-900 group-hover:text-amber-700 transition-colors leading-snug">
                {article.title}
              </h2>

              {article.hindiTitle && (
                <p className="text-xs text-stone-400">{article.hindiTitle}</p>
              )}

              <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                {article.excerpt}
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-amber-700">
              <span>Read Full Guide</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
