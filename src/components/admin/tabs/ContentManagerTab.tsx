import React, { useEffect, useState } from 'react';
import {
  FolderTree,
  HelpCircle,
  FileText,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { adminFetch } from '../adminApi';
import { PopularQuestionItem, CategoryItem, SEOPageItem, FAQItem } from '../types';

export const ContentManagerTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'questions' | 'categories' | 'seo' | 'faqs'>('questions');
  const [questions, setQuestions] = useState<PopularQuestionItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [seoPages, setSeoPages] = useState<SEOPageItem[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Question modal
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<PopularQuestionItem> | null>(null);

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<CategoryItem> | null>(null);

  // SEO Page modal
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [editingSeoPage, setEditingSeoPage] = useState<Partial<SEOPageItem> | null>(null);

  // FAQ modal
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Partial<FAQItem> | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [qRes, cRes, sRes, fRes] = await Promise.all([
        adminFetch<{ questions: PopularQuestionItem[] }>('/api/admin/content/popular-questions'),
        adminFetch<{ categories: CategoryItem[] }>('/api/admin/content/categories'),
        adminFetch<{ pages: SEOPageItem[] }>('/api/admin/content/seo-pages'),
        adminFetch<{ faqs: FAQItem[] }>('/api/admin/content/faqs'),
      ]);
      setQuestions(qRes.questions);
      setCategories(cRes.categories);
      setSeoPages(sRes.pages);
      setFaqs(fRes.faqs);
    } catch (err) {
      console.error('Error loading content data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Question actions
  const handleSaveQuestion = async () => {
    if (!editingQuestion || !editingQuestion.query) return;
    try {
      if (editingQuestion.id) {
        const res = await adminFetch<{ success: boolean; question: PopularQuestionItem }>(
          `/api/admin/content/popular-questions/${editingQuestion.id}`,
          { method: 'PUT', body: JSON.stringify(editingQuestion) }
        );
        setQuestions((prev) => prev.map((q) => (q.id === res.question.id ? res.question : q)));
      } else {
        const res = await adminFetch<{ success: boolean; question: PopularQuestionItem }>(
          '/api/admin/content/popular-questions',
          { method: 'POST', body: JSON.stringify(editingQuestion) }
        );
        setQuestions((prev) => [...prev, res.question]);
      }
      setIsQuestionModalOpen(false);
      setSuccessMessage('Prompt question saved');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this prompt question?')) return;
    try {
      await adminFetch(`/api/admin/content/popular-questions/${id}`, { method: 'DELETE' });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Category actions
  const handleSaveCategory = async () => {
    if (!editingCategory || !editingCategory.name) return;
    try {
      if (editingCategory.id) {
        const res = await adminFetch<{ success: boolean; category: CategoryItem }>(
          `/api/admin/content/categories/${editingCategory.id}`,
          { method: 'PUT', body: JSON.stringify(editingCategory) }
        );
        setCategories((prev) => prev.map((c) => (c.id === res.category.id ? res.category : c)));
      } else {
        const res = await adminFetch<{ success: boolean; category: CategoryItem }>(
          '/api/admin/content/categories',
          { method: 'POST', body: JSON.stringify(editingCategory) }
        );
        setCategories((prev) => [...prev, res.category]);
      }
      setIsCategoryModalOpen(false);
      setSuccessMessage('Category saved');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await adminFetch(`/api/admin/content/categories/${id}`, { method: 'DELETE' });
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // SEO Page actions
  const handleSaveSeoPage = async () => {
    if (!editingSeoPage || !editingSeoPage.slug || !editingSeoPage.pageTitle) return;
    try {
      if (editingSeoPage.id) {
        const res = await adminFetch<{ success: boolean; page: SEOPageItem }>(
          `/api/admin/content/seo-pages/${editingSeoPage.id}`,
          { method: 'PUT', body: JSON.stringify(editingSeoPage) }
        );
        setSeoPages((prev) => prev.map((p) => (p.id === res.page.id ? res.page : p)));
      } else {
        const res = await adminFetch<{ success: boolean; page: SEOPageItem }>(
          '/api/admin/content/seo-pages',
          { method: 'POST', body: JSON.stringify(editingSeoPage) }
        );
        setSeoPages((prev) => [...prev, res.page]);
      }
      setIsSeoModalOpen(false);
      setSuccessMessage('SEO content page saved');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSeoPage = async (id: string) => {
    if (!confirm('Delete this SEO page?')) return;
    try {
      await adminFetch(`/api/admin/content/seo-pages/${id}`, { method: 'DELETE' });
      setSeoPages((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // FAQ actions
  const handleSaveFaq = async () => {
    if (!editingFaq || !editingFaq.question || !editingFaq.answer) return;
    try {
      if (editingFaq.id) {
        const res = await adminFetch<{ success: boolean; faq: FAQItem }>(
          `/api/admin/content/faqs/${editingFaq.id}`,
          { method: 'PUT', body: JSON.stringify(editingFaq) }
        );
        setFaqs((prev) => prev.map((f) => (f.id === res.faq.id ? res.faq : f)));
      } else {
        const res = await adminFetch<{ success: boolean; faq: FAQItem }>(
          '/api/admin/content/faqs',
          { method: 'POST', body: JSON.stringify(editingFaq) }
        );
        setFaqs((prev) => [...prev, res.faq]);
      }
      setIsFaqModalOpen(false);
      setSuccessMessage('FAQ item saved');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await adminFetch(`/api/admin/content/faqs/${id}`, { method: 'DELETE' });
      setFaqs((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-heading text-stone-900">
          Content, Taxonomy & SEO Management
        </h1>
        <p className="text-xs text-stone-500">
          Control home screen prompt chips, room classifications, organic search landing pages, and consumer FAQs
        </p>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setSubTab('questions')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'questions'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Prompt Questions ({questions.length})
        </button>

        <button
          onClick={() => setSubTab('categories')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'categories'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Room Categories ({categories.length})
        </button>

        <button
          onClick={() => setSubTab('seo')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'seo'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          SEO Landing Pages ({seoPages.length})
        </button>

        <button
          onClick={() => setSubTab('faqs')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'faqs'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Public FAQs ({faqs.length})
        </button>
      </div>

      {/* 1. Prompt Questions */}
      {subTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">
              Prompt chips shown on the user app homepage and chat interface
            </span>
            <button
              onClick={() => {
                setEditingQuestion({
                  query: '',
                  category: 'Kitchen',
                  displayOrder: questions.length + 1,
                  enabled: true,
                });
                setIsQuestionModalOpen(true);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Prompt Question</span>
            </button>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Question Prompt</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Search Count</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-stone-50/80">
                    <td className="py-3 px-4 font-mono text-stone-400">#{q.displayOrder}</td>
                    <td className="py-3 px-4 font-medium text-stone-900">{q.query}</td>
                    <td className="py-3 px-4 text-stone-500">{q.category}</td>
                    <td className="py-3 px-4 font-mono">{q.searchCount || 0}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          q.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {q.enabled ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingQuestion(q);
                            setIsQuestionModalOpen(true);
                          }}
                          className="p-1 rounded hover:bg-stone-100 text-stone-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Room Categories */}
      {subTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">
              Taxonomy for domestic zones and interior objects
            </span>
            <button
              onClick={() => {
                setEditingCategory({
                  name: '',
                  type: 'room',
                  icon: 'Home',
                  description: '',
                  displayOrder: categories.length + 1,
                  active: true,
                  featured: false,
                });
                setIsCategoryModalOpen(true);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-sm">{c.name}</span>
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] font-mono uppercase">
                      {c.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">{c.description}</p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className={c.active ? 'text-emerald-600 text-[11px]' : 'text-stone-400 text-[11px]'}>
                    {c.active ? '● Active' : '○ Inactive'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCategory(c);
                        setIsCategoryModalOpen(true);
                      }}
                      className="p-1 rounded text-stone-500 hover:bg-stone-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SEO Landing Pages */}
      {subTab === 'seo' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">
              Programmatic SEO pages for organic search rankings
            </span>
            <button
              onClick={() => {
                setEditingSeoPage({
                  slug: '',
                  pageTitle: '',
                  seoTitle: '',
                  metaDescription: '',
                  keywords: '',
                  introduction: '',
                  mainContent: '',
                  faq: [],
                  relatedTopics: [],
                  status: 'published',
                  publishDate: new Date().toISOString(),
                });
                setIsSeoModalOpen(true);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create SEO Page</span>
            </button>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Title / Slug</th>
                  <th className="py-3 px-4">Meta Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {seoPages.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/80">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-900">{p.pageTitle}</div>
                      <div className="text-[11px] text-stone-400 font-mono">/{p.slug}</div>
                    </td>
                    <td className="py-3 px-4 text-stone-500 max-w-xs truncate">
                      {p.metaDescription}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingSeoPage(p);
                            setIsSeoModalOpen(true);
                          }}
                          className="p-1 rounded hover:bg-stone-100 text-stone-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSeoPage(p.id)}
                          className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. FAQs */}
      {subTab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">
              Customer facing frequently asked questions
            </span>
            <button
              onClick={() => {
                setEditingFaq({
                  question: '',
                  answer: '',
                  category: 'General',
                  language: 'English',
                  seoVisibility: true,
                  displayOrder: faqs.length + 1,
                  active: true,
                });
                setIsFaqModalOpen(true);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add FAQ</span>
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((f) => (
              <div
                key={f.id}
                className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs text-stone-900">{f.question}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingFaq(f);
                        setIsFaqModalOpen(true);
                      }}
                      className="p-1 rounded text-stone-500 hover:bg-stone-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFaq(f.id)}
                      className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-stone-600 leading-relaxed">{f.answer}</div>
                <div className="flex items-center gap-2 pt-1 text-[10px] text-stone-400">
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">{f.category}</span>
                  <span>{f.active ? '● Live' : '○ Draft'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {/* 1. Prompt Question Modal */}
      {isQuestionModalOpen && editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900">Edit Prompt Question</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Question Prompt</label>
                <input
                  type="text"
                  value={editingQuestion.query || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, query: e.target.value })
                  }
                  placeholder="e.g. Can we place mirror facing the bed?"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Category</label>
                <input
                  type="text"
                  value={editingQuestion.category || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs">
                  <input
                    type="checkbox"
                    checked={editingQuestion.enabled}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, enabled: e.target.checked })
                    }
                    className="rounded border-stone-300 text-amber-600"
                  />
                  <span>Show in User App Quick Prompts</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestion}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs"
              >
                Save Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Category Modal */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900">Edit Category</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Category Name</label>
                <input
                  type="text"
                  value={editingCategory.name || ''}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name: e.target.value })
                  }
                  placeholder="e.g. Master Bedroom"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Type</label>
                <select
                  value={editingCategory.type || 'room'}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                >
                  <option value="room">Domestic Room Zone</option>
                  <option value="object">Interior Object / Asset</option>
                  <option value="vastu">Vastu Energy Zone</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, description: e.target.value })
                  }
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEO Page Modal */}
      {isSeoModalOpen && editingSeoPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900">Edit SEO Landing Page</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Page Title (H1)</label>
                <input
                  type="text"
                  value={editingSeoPage.pageTitle || ''}
                  onChange={(e) =>
                    setEditingSeoPage({ ...editingSeoPage, pageTitle: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">URL Slug</label>
                <input
                  type="text"
                  value={editingSeoPage.slug || ''}
                  onChange={(e) =>
                    setEditingSeoPage({ ...editingSeoPage, slug: e.target.value })
                  }
                  placeholder="e.g. pooja-room-vastu-tips"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Meta Description</label>
                <textarea
                  rows={2}
                  value={editingSeoPage.metaDescription || ''}
                  onChange={(e) =>
                    setEditingSeoPage({ ...editingSeoPage, metaDescription: e.target.value })
                  }
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Introduction Content</label>
                <textarea
                  rows={3}
                  value={editingSeoPage.introduction || ''}
                  onChange={(e) =>
                    setEditingSeoPage({ ...editingSeoPage, introduction: e.target.value })
                  }
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
              <button
                onClick={() => setIsSeoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSeoPage}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs"
              >
                Save SEO Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FAQ Modal */}
      {isFaqModalOpen && editingFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900">Edit FAQ</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Question</label>
                <input
                  type="text"
                  value={editingFaq.question || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Answer</label>
                <textarea
                  rows={4}
                  value={editingFaq.answer || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
              <button
                onClick={() => setIsFaqModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFaq}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs"
              >
                Save FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
