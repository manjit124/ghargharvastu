import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Download,
  Edit2,
  Trash2,
  BookOpen,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';

const ALL_CATEGORIES = [
  'Mirror',
  'Wall Clock',
  'Kitchen',
  'Bedroom',
  'Bed',
  'Main Door',
  'Living Room',
  'Pooja Room',
  'Bathroom',
  'Toilet',
  'Study Room',
  'Dining Room',
  'Staircase',
  'Balcony',
  'Safe / Locker',
  'Water Tank',
  'Plants / Tulsi',
  'Shoes / Shoe Rack',
  'Dustbin',
  'Temple',
  'Overhead Tank',
  'Septic Tank',
  'Colors',
  'Lights',
];

export const KnowledgeBaseTab: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchKnowledge = async () => {
    setLoading(true);
    try {
      const data = await adminService.getKnowledge({
        search,
        category: categoryFilter,
        status: statusFilter,
      });
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load knowledge items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKnowledge();
  };

  const handleOpenAdd = () => {
    setCurrentItem({
      id: '',
      title: '',
      category: 'Bedroom',
      question: '',
      traditionalGuidance: '',
      recommendedDirection: 'North or East',
      lessPreferredDirection: 'South-West',
      recommendedPlacement: '',
      alternativeSolution: '',
      explanation: '',
      keywords: ['vastu', 'home'],
      language: 'All',
      status: 'published',
      priority: 'high',
    });
    setEditModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setCurrentItem({ ...item });
    setEditModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem.title || !currentItem.question) {
      alert('Please provide at least a title and a question.');
      return;
    }

    setSaving(true);
    try {
      if (currentItem.id) {
        await adminService.updateKnowledge(currentItem.id, currentItem);
      } else {
        await adminService.createKnowledge(currentItem);
      }
      setEditModalOpen(false);
      fetchKnowledge();
    } catch (err: any) {
      alert(err.message || 'Failed to save knowledge item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await adminService.deleteKnowledge(id);
      setConfirmDeleteId(null);
      fetchKnowledge();
    } catch (err: any) {
      alert(err.message || 'Failed to delete knowledge item');
    }
  };

  const handleExportCSV = async () => {
    try {
      await adminService.downloadExport('knowledge');
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight">Vastu Knowledge Repository</h2>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Curate traditional principles, directions, and remedies across all 24 spatial categories ({items.length} records).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vastu Rule</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions, guidelines, or keywords..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </form>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none"
        >
          <option value="all">All 24 Categories</option>
          {ALL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Knowledge Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs font-semibold text-stone-500">
            Loading Vedic knowledge base...
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs font-semibold text-stone-500">
            No knowledge entries found matching the filter criteria.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 hover:border-stone-400 transition-all flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 font-bold text-[10px] rounded-full border border-amber-200/60">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-stone-400">
                      {item.priority}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-stone-900 line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-amber-800 font-medium italic mt-0.5 line-clamp-1">
                    "{item.question}"
                  </p>
                </div>

                <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                  {item.traditionalGuidance}
                </p>

                <div className="p-2.5 bg-stone-50 rounded-xl space-y-1 text-[11px] border border-stone-100">
                  <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                    <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Favored: {item.recommendedDirection}</span>
                  </div>
                  {item.alternativeSolution && (
                    <div className="text-stone-600 line-clamp-1">
                      <strong>Remedy:</strong> {item.alternativeSolution}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                <div className="flex flex-wrap gap-1 max-w-[65%] overflow-hidden">
                  {(item.keywords || []).slice(0, 2).map((k: string, i: number) => (
                    <span
                      key={i}
                      className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded"
                    >
                      #{k}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                    title="Edit Rule"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(item.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Knowledge Modal */}
      {editModalOpen && currentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900">
                {currentItem.id ? 'Edit Vastu Guideline' : 'Create New Vastu Guideline'}
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Rule Title</label>
                  <input
                    type="text"
                    required
                    value={currentItem.title}
                    onChange={(e) => setCurrentItem({ ...currentItem, title: e.target.value })}
                    placeholder="e.g. Master Bedroom Mirror Placement"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Category</label>
                  <select
                    value={currentItem.category}
                    onChange={(e) => setCurrentItem({ ...currentItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Primary User Question</label>
                <input
                  type="text"
                  required
                  value={currentItem.question}
                  onChange={(e) => setCurrentItem({ ...currentItem, question: e.target.value })}
                  placeholder="e.g. Bedroom mein mirror kahan hona chahiye?"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Traditional Vastu Guidance</label>
                <textarea
                  rows={3}
                  required
                  value={currentItem.traditionalGuidance}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, traditionalGuidance: e.target.value })
                  }
                  placeholder="Detailed Vedic principles and rationale..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Recommended Direction</label>
                  <input
                    type="text"
                    value={currentItem.recommendedDirection}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, recommendedDirection: e.target.value })
                    }
                    placeholder="e.g. North or East Wall"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Less Preferred / Avoid</label>
                  <input
                    type="text"
                    value={currentItem.lessPreferredDirection}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, lessPreferredDirection: e.target.value })
                    }
                    placeholder="e.g. South-West facing bed"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Non-Structural Alternative Remedy</label>
                <input
                  type="text"
                  value={currentItem.alternativeSolution}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, alternativeSolution: e.target.value })
                  }
                  placeholder="e.g. Cover with light curtain before sleeping"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Publish Status</label>
                  <select
                    value={currentItem.status}
                    onChange={(e) => setCurrentItem({ ...currentItem, status: e.target.value })}
                    className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Priority Rank</label>
                  <select
                    value={currentItem.priority}
                    onChange={(e) => setCurrentItem({ ...currentItem, priority: e.target.value })}
                    className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Language Target</label>
                  <select
                    value={currentItem.language}
                    onChange={(e) => setCurrentItem({ ...currentItem, language: e.target.value })}
                    className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  >
                    <option value="All">All Languages</option>
                    <option value="Hindi">Hindi / Hinglish</option>
                    <option value="English">English Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold rounded-xl disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Guideline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-stone-900">Delete Knowledge Rule?</h4>
              <p className="text-xs text-stone-500">
                This rule will no longer be referenced in AI recommendations.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 bg-stone-100 text-stone-800 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteItem(confirmDeleteId)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
