import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Layers,
  Globe,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  MoveUp,
  MoveDown,
  ExternalLink,
  Tag,
  Eye,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { useAppConfig } from '../../../context/AppConfigContext';

export const ContentManagerTab: React.FC<{ initialSection?: string }> = ({
  initialSection = 'questions',
}) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'categories' | 'seo' | 'faqs'>(
    initialSection as any
  );
  const { refreshConfig } = useAppConfig();

  // Data states
  const [questions, setQuestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [seoPages, setSeoPages] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Edit states
  const [modalType, setModalType] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qData, cData, sData, fData] = await Promise.all([
        adminService.getPopularQuestions(),
        adminService.getCategories(),
        adminService.getSEOPages(),
        adminService.getFAQs(),
      ]);
      setQuestions(qData || []);
      setCategories(cData || []);
      setSeoPages(sData || []);
      setFaqs(fData || []);
    } catch (err) {
      console.error('Failed to load content collections', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers for Questions
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem.id) {
        await adminService.updatePopularQuestion(editItem.id, editItem);
      } else {
        await adminService.createPopularQuestion(editItem);
      }
      setModalType(null);
      await loadData();
      await refreshConfig();
    } catch (err: any) {
      alert(err.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this suggested inquiry?')) return;
    try {
      await adminService.deletePopularQuestion(id);
      await loadData();
      await refreshConfig();
    } catch (err: any) {
      alert(err.message || 'Failed to delete question');
    }
  };

  // Handlers for Categories
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem.id) {
        await adminService.updateCategory(editItem.id, editItem);
      } else {
        await adminService.createCategory(editItem);
      }
      setModalType(null);
      await loadData();
      await refreshConfig();
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await adminService.deleteCategory(id);
      await loadData();
      await refreshConfig();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  // Handlers for SEO Pages
  const handleSaveSEO = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem.id) {
        await adminService.updateSEOPage(editItem.id, editItem);
      } else {
        await adminService.createSEOPage(editItem);
      }
      setModalType(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save SEO page');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSEO = async (id: string) => {
    if (!confirm('Delete this SEO page?')) return;
    try {
      await adminService.deleteSEOPage(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete SEO page');
    }
  };

  // Handlers for FAQs
  const handleSaveFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem.id) {
        await adminService.updateFAQ(editItem.id, editItem);
      } else {
        await adminService.createFAQ(editItem);
      }
      setModalType(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm('Delete this FAQ entry?')) return;
    try {
      await adminService.deleteFAQ(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete FAQ');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'questions'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Popular Questions ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'categories'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Spatial Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'seo'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Public SEO Landing Pages ({seoPages.length})
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'faqs'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            App FAQs ({faqs.length})
          </button>
        </div>

        {/* Add Button */}
        <div>
          {activeTab === 'questions' && (
            <button
              onClick={() => {
                setEditItem({
                  query: '',
                  category: 'Bedroom',
                  displayOrder: questions.length + 1,
                  enabled: true,
                });
                setModalType('question');
              }}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          )}

          {activeTab === 'categories' && (
            <button
              onClick={() => {
                setEditItem({
                  name: '',
                  type: 'room',
                  icon: 'Bed',
                  description: '',
                  displayOrder: categories.length + 1,
                  active: true,
                  featured: false,
                });
                setModalType('category');
              }}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          )}

          {activeTab === 'seo' && (
            <button
              onClick={() => {
                setEditItem({
                  slug: '',
                  title: '',
                  metaDescription: '',
                  category: 'Wall Clock',
                  content: '',
                  faqs: [],
                  status: 'published',
                });
                setModalType('seo');
              }}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create SEO Page</span>
            </button>
          )}

          {activeTab === 'faqs' && (
            <button
              onClick={() => {
                setEditItem({
                  question: '',
                  answer: '',
                  category: 'General',
                  displayOrder: faqs.length + 1,
                  active: true,
                  includeInSEO: true,
                });
                setModalType('faq');
              }}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add FAQ</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: POPULAR QUESTIONS */}
      {activeTab === 'questions' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Inquiry Text</th>
                <th className="px-4 py-3">Category Tag</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono font-bold text-stone-400">#{q.displayOrder}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{q.query}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md font-semibold text-[11px]">
                      {q.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {q.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditItem({ ...q });
                          setModalType('question');
                        }}
                        className="p-1.5 text-stone-500 hover:text-stone-900 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded"
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
      )}

      {/* SECTION 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-700 font-bold uppercase text-[10px] rounded">
                    {cat.type}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      cat.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {cat.active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-stone-900">{cat.name}</span>
                  <span className="text-[10px] font-mono text-stone-400">Order: {cat.displayOrder}</span>
                </div>
                <p className="text-xs text-stone-500 line-clamp-2">{cat.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                <span className="font-mono text-[10px] text-stone-400">Icon: {cat.icon}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditItem({ ...cat });
                      setModalType('category');
                    }}
                    className="p-1.5 text-stone-500 hover:text-stone-900 rounded"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 3: SEO LANDING PAGES */}
      {activeTab === 'seo' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">Slug Route</th>
                <th className="px-4 py-3">Page Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {seoPages.map((page) => (
                <tr key={page.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono font-bold text-amber-800">
                    /vastu/{page.slug}
                  </td>
                  <td className="px-4 py-3 font-bold text-stone-900 max-w-xs truncate">
                    {page.title}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{page.category}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        page.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {page.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditItem({ ...page });
                          setModalType('seo');
                        }}
                        className="p-1.5 text-stone-500 hover:text-stone-900 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSEO(page.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded"
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
      )}

      {/* SECTION 4: FAQS */}
      {activeTab === 'faqs' && (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-900">{faq.question}</span>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px] font-bold">
                    {faq.category}
                  </span>
                  <button
                    onClick={() => {
                      setEditItem({ ...faq });
                      setModalType('faq');
                    }}
                    className="p-1 text-stone-500 hover:text-stone-900"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFAQ(faq.id)}
                    className="p-1 text-stone-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* EDIT MODAL DIALOG */}
      {modalType && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h4 className="text-base font-black text-stone-900 capitalize">
                {editItem.id ? 'Edit' : 'Add'} {modalType}
              </h4>
              <button
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Question Form */}
            {modalType === 'question' && (
              <form onSubmit={handleSaveQuestion} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Question Query</label>
                  <input
                    type="text"
                    required
                    value={editItem.query}
                    onChange={(e) => setEditItem({ ...editItem, query: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">Category</label>
                    <input
                      type="text"
                      required
                      value={editItem.category}
                      onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">Display Order</label>
                    <input
                      type="number"
                      value={editItem.displayOrder}
                      onChange={(e) =>
                        setEditItem({ ...editItem, displayOrder: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 pt-2 cursor-pointer font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={editItem.enabled}
                    onChange={(e) => setEditItem({ ...editItem, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span>Active & Shown to Users</span>
                </label>
                <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 bg-stone-100 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-stone-900 text-amber-400 font-bold rounded-xl"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* Category Form */}
            {modalType === 'category' && (
              <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Category Name</label>
                  <input
                    type="text"
                    required
                    value={editItem.name}
                    onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">Type</label>
                    <select
                      value={editItem.type}
                      onChange={(e) => setEditItem({ ...editItem, type: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    >
                      <option value="room">Room Category</option>
                      <option value="object">Object Category</option>
                      <option value="vastu">Vastu Element</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">Icon Name</label>
                    <input
                      type="text"
                      value={editItem.icon}
                      onChange={(e) => setEditItem({ ...editItem, icon: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Description</label>
                  <textarea
                    rows={2}
                    value={editItem.description}
                    onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <label className="flex items-center gap-2 pt-2 cursor-pointer font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={editItem.active}
                    onChange={(e) => setEditItem({ ...editItem, active: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span>Active</span>
                </label>
                <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 bg-stone-100 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-stone-900 text-amber-400 font-bold rounded-xl"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* SEO Form */}
            {modalType === 'seo' && (
              <form onSubmit={handleSaveSEO} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">Slug</label>
                    <input
                      type="text"
                      required
                      value={editItem.slug}
                      onChange={(e) => setEditItem({ ...editItem, slug: e.target.value })}
                      placeholder="e.g. wall-clock"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">Category</label>
                    <input
                      type="text"
                      required
                      value={editItem.category}
                      onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Page Title (H1 / Title)</label>
                  <input
                    type="text"
                    required
                    value={editItem.title}
                    onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Meta Description</label>
                  <textarea
                    rows={2}
                    value={editItem.metaDescription}
                    onChange={(e) => setEditItem({ ...editItem, metaDescription: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Article Body / Guidance</label>
                  <textarea
                    rows={3}
                    value={editItem.content}
                    onChange={(e) => setEditItem({ ...editItem, content: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 bg-stone-100 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-stone-900 text-amber-400 font-bold rounded-xl"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* FAQ Form */}
            {modalType === 'faq' && (
              <form onSubmit={handleSaveFAQ} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Question</label>
                  <input
                    type="text"
                    required
                    value={editItem.question}
                    onChange={(e) => setEditItem({ ...editItem, question: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Answer</label>
                  <textarea
                    rows={3}
                    required
                    value={editItem.answer}
                    onChange={(e) => setEditItem({ ...editItem, answer: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">Category</label>
                    <input
                      type="text"
                      value={editItem.category}
                      onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">Display Order</label>
                    <input
                      type="number"
                      value={editItem.displayOrder}
                      onChange={(e) =>
                        setEditItem({ ...editItem, displayOrder: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 bg-stone-100 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-stone-900 text-amber-400 font-bold rounded-xl"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
