import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Clock,
  Filter,
  Download,
  Search,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';

export const FeedbackQualityTab: React.FC<{ initialSection?: string; onNavigate?: (tab: string) => void }> = ({
  initialSection = 'feedback',
  onNavigate,
}) => {
  const [activeSub, setActiveSub] = useState<'feedback' | 'quality'>(
    initialSection === 'quality' ? 'quality' : 'feedback'
  );

  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [qualityStats, setQualityStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Status Note Modal
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<'open' | 'in_progress' | 'resolved'>('open');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fbRes, qRes] = await Promise.all([
        adminService.getFeedback(),
        adminService.getAIQuality(),
      ]);
      setFeedbackList(fbRes || []);
      setQualityStats(qRes);
    } catch (err) {
      console.error('Failed to load feedback & quality logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setUpdating(true);
    try {
      await adminService.updateFeedback(selectedItem.id, {
        status: newStatus,
        adminNotes,
      });
      setSelectedItem(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update feedback status');
    } finally {
      setUpdating(false);
    }
  };

  const handleExportFeedback = async () => {
    try {
      await adminService.downloadExport('feedback');
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Switcher Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSub('feedback')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSub === 'feedback'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            User Submissions & Support ({feedbackList.length})
          </button>
          <button
            onClick={() => setActiveSub('quality')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSub === 'quality'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            AI Quality & Satisfaction Metrics
          </button>
        </div>

        <button
          onClick={handleExportFeedback}
          className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Feedback (CSV)</span>
        </button>
      </div>

      {/* SUBTAB 1: USER FEEDBACK */}
      {activeSub === 'feedback' && (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Feedback Type</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {feedbackList.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-500 text-[11px] whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-900">
                      {item.userName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-700 font-bold uppercase text-[10px] rounded">
                        {item.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-700 max-w-sm truncate">
                      {item.message}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setNewStatus(item.status);
                          setAdminNotes(item.adminNotes || '');
                        }}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded font-bold text-xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: AI QUALITY */}
      {activeSub === 'quality' && qualityStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-bold text-stone-500 uppercase">Overall Satisfaction</span>
              <div className="text-3xl font-black text-emerald-700">
                {qualityStats.satisfactionRate}%
              </div>
              <span className="text-xs text-stone-500">Based on user ratings</span>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-bold text-stone-500 uppercase">Positive Ratings</span>
              <div className="text-3xl font-black text-stone-900 flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-emerald-600" />
                <span>{qualityStats.helpfulCount}</span>
              </div>
              <span className="text-xs text-emerald-700 font-semibold">Helpful feedback marks</span>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-bold text-stone-500 uppercase">Negative Marks</span>
              <div className="text-3xl font-black text-rose-700 flex items-center gap-2">
                <ThumbsDown className="w-5 h-5 text-rose-600" />
                <span>{qualityStats.notHelpfulCount}</span>
              </div>
              <span className="text-xs text-stone-500">Candidates for rule refinement</span>
            </div>
          </div>

          {/* Recent Quality Logs */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900">Recent User Feedback Audit Log</h3>
            <div className="divide-y divide-stone-100">
              {(qualityStats.recentFeedback || []).map((item: any) => (
                <div key={item.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {item.rating === 'helpful' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> Helpful
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full font-bold text-[10px] flex items-center gap-1">
                          <ThumbsDown className="w-3 h-3" /> Needs Improvement
                        </span>
                      )}
                      <span className="font-bold text-stone-800">{item.category}</span>
                      <span className="text-stone-400 text-[11px]">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-stone-700 font-medium italic">"{item.query}"</div>
                    {item.comment && (
                      <div className="text-stone-500 text-[11px] bg-stone-50 p-2 rounded-lg">
                        <strong>User comment:</strong> {item.comment}
                      </div>
                    )}
                  </div>

                  {item.rating !== 'helpful' && onNavigate && (
                    <button
                      onClick={() => onNavigate('knowledge')}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1"
                    >
                      <span>Add Knowledge Rule</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inspect Feedback Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h4 className="text-base font-black text-stone-900">Inspect User Feedback</h4>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
              <div>
                <span className="text-stone-400 font-bold block">User & Type:</span>
                <div className="font-bold text-stone-900">
                  {selectedItem.userName} • {selectedItem.type}
                </div>
              </div>

              <div>
                <span className="text-stone-400 font-bold block">Message:</span>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-800 leading-relaxed">
                  {selectedItem.message}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Resolution Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                >
                  <option value="open">Open (Unreviewed)</option>
                  <option value="in_progress">In Progress (Investigating)</option>
                  <option value="resolved">Resolved (Closed)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Internal Team Notes</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notes on resolution, bug fix version, or rule added..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-stone-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-stone-900 text-amber-400 font-bold rounded-xl"
                >
                  {updating ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
