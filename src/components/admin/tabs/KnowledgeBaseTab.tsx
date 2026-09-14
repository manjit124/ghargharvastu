import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  Compass,
  Lightbulb,
  Download,
  AlertCircle,
} from 'lucide-react';
import { adminFetch } from '../adminApi';
import { VastuKnowledgeItem } from '../types';

export const KnowledgeBaseTab: React.FC = () => {
  const [rules, setRules] = useState<VastuKnowledgeItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<VastuKnowledgeItem> | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchKnowledge = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        category: categoryFilter,
        status: statusFilter,
      });
      const res = await adminFetch<{ knowledge: VastuKnowledgeItem[] }>(
        `/api/admin/knowledge?${query}`
      );
      setRules(res.knowledge);
    } catch (err) {
      console.error('Error fetching knowledge:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKnowledge();
  };

  const handleCreateNew = () => {
    setEditingItem({
      title: '',
      category: 'Kitchen',
      question: '',
      traditionalGuidance: '',
      recommendedDirection: 'South-East (Agni)',
      lessPreferredDirection: 'North-East (Ishan)',
      recommendedPlacement: '',
      alternativeSolution: '',
      explanation: '',
      keywords: ['vastu', 'home'],
      language: 'Hinglish',
      status: 'published',
      priority: 'medium',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: VastuKnowledgeItem) => {
    setEditingItem(JSON.parse(JSON.stringify(item)));
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!editingItem || !editingItem.title || !editingItem.question) {
      alert('Please fill out the title and question fields');
      return;
    }

    try {
      if (editingItem.id) {
        // Update
        const res = await adminFetch<{ success: boolean; item: VastuKnowledgeItem }>(
          `/api/admin/knowledge/${editingItem.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(editingItem),
          }
        );
        setRules((prev) => prev.map((r) => (r.id === res.item.id ? res.item : r)));
        setSuccessMessage('Vastu rule updated successfully');
      } else {
        // Create
        const res = await adminFetch<{ success: boolean; item: VastuKnowledgeItem }>(
          '/api/admin/knowledge',
          {
            method: 'POST',
            body: JSON.stringify(editingItem),
          }
        );
        setRules((prev) => [res.item, ...prev]);
        setSuccessMessage('New Vastu knowledge rule created');
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save rule');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the rule "${title}"?`)) return;

    try {
      await adminFetch(`/api/admin/knowledge/${id}`, { method: 'DELETE' });
      setRules((prev) => prev.filter((r) => r.id !== id));
      setSuccessMessage('Rule deleted');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete rule');
    }
  };

  const categories = [
    'all',
    'Main Entrance',
    'Kitchen',
    'Master Bedroom',
    'Pooja Room',
    'Toilet & Bathroom',
    'Mirrors & Reflectors',
    'Water Elements',
    'Staircase',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-stone-900">
            Vastu Knowledge Base & Remedies
          </h1>
          <p className="text-xs text-stone-500">
            Curated repository of authentic Vedic spatial guidelines, non-structural remedies, and practical alternatives
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open('/api/admin/export/knowledge', '_blank')}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vastu Rule</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by keywords, room type, remedies, or direction..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-stone-900 text-stone-100 rounded-xl text-xs font-semibold"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 text-xs">
          <span className="text-stone-400 font-medium">Category:</span>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                categoryFilter === c
                  ? 'bg-amber-500 text-stone-950 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {c === 'all' ? 'All Categories' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center text-stone-400 text-xs">
            No Vastu rules match the specified search.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-2xs hover:border-amber-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-900">{rule.title}</span>
                  <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-semibold">
                    {rule.category}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      rule.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {rule.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                    title="Edit Rule"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id, rule.title)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-stone-700 font-medium">{rule.question}</div>

              {/* Direction & Guidance Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl text-xs text-stone-700">
                <div className="flex items-start gap-2">
                  <Compass className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-stone-900">Recommended: </span>
                    <span>{rule.recommendedDirection}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-stone-900">Practical Remedy: </span>
                    <span>{rule.alternativeSolution}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-stone-500 leading-relaxed">
                {rule.traditionalGuidance}
              </div>

              {rule.keywords && rule.keywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {rule.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 text-[10px]"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Rule Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingItem.id ? 'Edit Vastu Rule' : 'Add New Vastu Knowledge Rule'}
                </h3>
                <p className="text-xs text-stone-500">
                  Used by the AI chat engine and fallback reference lookup
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Rule Title</label>
                  <input
                    type="text"
                    required
                    value={editingItem.title || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    placeholder="e.g. Master Bedroom Bed Alignment"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Zone / Room Category</label>
                  <select
                    value={editingItem.category || 'Kitchen'}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="Main Entrance">Main Entrance</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Master Bedroom">Master Bedroom</option>
                    <option value="Pooja Room">Pooja Room</option>
                    <option value="Toilet & Bathroom">Toilet & Bathroom</option>
                    <option value="Mirrors & Reflectors">Mirrors & Reflectors</option>
                    <option value="Water Elements">Water Elements</option>
                    <option value="Staircase">Staircase</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Common User Question / Trigger</label>
                <input
                  type="text"
                  required
                  value={editingItem.question || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, question: e.target.value })}
                  placeholder="e.g. Which direction should our head face while sleeping?"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Ideal Direction</label>
                  <input
                    type="text"
                    value={editingItem.recommendedDirection || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, recommendedDirection: e.target.value })
                    }
                    placeholder="e.g. South or East"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Negative / Avoid Direction</label>
                  <input
                    type="text"
                    value={editingItem.lessPreferredDirection || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, lessPreferredDirection: e.target.value })
                    }
                    placeholder="e.g. North (magnetic clash)"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">
                  Practical Non-Structural Remedy
                </label>
                <textarea
                  rows={2}
                  value={editingItem.alternativeSolution || ''}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, alternativeSolution: e.target.value })
                  }
                  placeholder="e.g. If head faces North, reposition bed towards East, or use wooden headboard with warm earth tone wall art."
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">
                  Traditional Vedic Rationale
                </label>
                <textarea
                  rows={3}
                  value={editingItem.traditionalGuidance || ''}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, traditionalGuidance: e.target.value })
                  }
                  placeholder="Vastu principles state that Earth's magnetic poles interact with iron in the blood..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Status</label>
                  <select
                    value={editingItem.status || 'published'}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, status: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Priority</label>
                  <select
                    value={editingItem.priority || 'medium'}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, priority: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Language Scope</label>
                  <select
                    value={editingItem.language || 'Hinglish'}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, language: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="Hinglish">Hinglish</option>
                    <option value="Hindi">Hindi</option>
                    <option value="English">English</option>
                    <option value="All">All Languages</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-sm"
              >
                Save Knowledge Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
