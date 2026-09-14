import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  Shield,
  UserCheck,
  UserX,
  RotateCcw,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Camera,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';

export const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  // Selected User Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editPlan, setEditPlan] = useState<string>('free');
  const [actionLoading, setActionLoading] = useState(false);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'suspend' | 'reset';
    user: any;
  } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({
        search,
        plan: planFilter,
        status: statusFilter,
        sort,
        page,
        limit,
      });
      setUsers(res.users || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, planFilter, statusFilter, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleOpenUser = (u: any) => {
    setSelectedUser(u);
    setEditPlan(u.plan || 'free');
  };

  const handleUpdatePlan = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adminService.updateUser(selectedUser.id, { plan: editPlan });
      setSelectedUser({ ...selectedUser, plan: editPlan });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update plan');
    } finally {
      setActionLoading(false);
    }
  };

  const executeConfirmAction = async () => {
    if (!confirmModal) return;
    const { type, user } = confirmModal;
    setActionLoading(true);
    try {
      if (type === 'delete') {
        await adminService.deleteUser(user.id);
        if (selectedUser?.id === user.id) setSelectedUser(null);
      } else if (type === 'suspend') {
        if (user.status === 'suspended') {
          await adminService.reactivateUser(user.id);
        } else {
          await adminService.suspendUser(user.id);
        }
      } else if (type === 'reset') {
        await adminService.resetUserUsage(user.id);
      }
      setConfirmModal(null);
      fetchUsers();
      if (selectedUser?.id === user.id) {
        const refreshed = await adminService.getUser(user.id);
        setSelectedUser(refreshed);
      }
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      await adminService.downloadExport('users');
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">User Operations & Accounts</h2>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              Manage accounts, usage limits, subscriptions, and access states ({total} users indexed).
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-2 self-start sm:self-auto transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export User Directory (CSV)</span>
          </button>
        </div>

        {/* Search Bar + Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 w-full sm:min-w-[220px] relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or user ID..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </form>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Starter</option>
            <option value="pro">Pro Advisor</option>
            <option value="expert">Home Expert</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="most_active">Most Active</option>
            <option value="highest_usage">Highest Usage</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3.5">User Details</th>
                <th className="px-4 py-3.5">Plan / Status</th>
                <th className="px-4 py-3.5 text-center">AI Inquiries</th>
                <th className="px-4 py-3.5 text-center">Photos</th>
                <th className="px-4 py-3.5 text-center">Home Scans</th>
                <th className="px-4 py-3.5">Last Active</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-stone-500 font-semibold">
                    Loading users database...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-stone-500 font-semibold">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-stone-900">{u?.name || 'User'}</div>
                      <div className="text-[11px] text-stone-500">{u?.email || ''}</div>
                      <div className="text-[10px] text-stone-400 font-mono">ID: {u?.id}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.plan === 'expert'
                              ? 'bg-amber-100 text-amber-900'
                              : u.plan === 'pro'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {u.plan}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-stone-800">
                      {u.questionsAsked || 0}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-stone-800">
                      {u.photosAnalyzed || 0}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-stone-800">
                      {u.roomScansCompleted || 0}
                    </td>
                    <td className="px-4 py-3.5 text-stone-600 text-[11px]">
                      {new Date(u.lastActiveAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenUser(u)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold transition-colors"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              type: 'suspend',
                              user: u,
                            })
                          }
                          title={u.status === 'suspended' ? 'Reactivate User' : 'Suspend User'}
                          className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100"
                        >
                          {u.status === 'suspended' ? (
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <UserX className="w-4 h-4 text-amber-600" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              type: 'delete',
                              user: u,
                            })
                          }
                          title="Delete User"
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
          <div>
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} accounts)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 bg-white border border-stone-200 rounded-lg disabled:opacity-40 hover:bg-stone-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-white border border-stone-200 rounded-lg disabled:opacity-40 hover:bg-stone-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Inspection Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-stone-900">{selectedUser.name}</h3>
                <p className="text-xs text-stone-500 font-mono">{selectedUser.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-stone-400">ID: {selectedUser.id}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedUser.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {selectedUser.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Plan Modification */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
              <label className="text-xs font-bold text-stone-700 block">Subscription Tier & Overrides</label>
              <div className="flex items-center gap-2">
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800"
                >
                  <option value="free">Free Starter Plan</option>
                  <option value="pro">Pro Advisor (₹99/mo)</option>
                  <option value="expert">Home Expert Suite (₹299/mo)</option>
                </select>
                <button
                  onClick={handleUpdatePlan}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Save Tier
                </button>
              </div>
            </div>

            {/* Usage Gauges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">Account Consumption Meters</span>
                <button
                  onClick={() =>
                    setConfirmModal({
                      isOpen: true,
                      type: 'reset',
                      user: selectedUser,
                    })
                  }
                  className="text-[11px] text-amber-700 font-bold flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All Usage</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
                  <Sparkles className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                  <div className="text-lg font-black text-stone-900">{selectedUser.questionsAsked || 0}</div>
                  <div className="text-[10px] font-bold text-stone-500 uppercase">AI Queries</div>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
                  <Camera className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <div className="text-lg font-black text-stone-900">{selectedUser.photosAnalyzed || 0}</div>
                  <div className="text-[10px] font-bold text-stone-500 uppercase">Photos</div>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
                  <Layers className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-black text-stone-900">{selectedUser.roomScansCompleted || 0}</div>
                  <div className="text-[10px] font-bold text-stone-500 uppercase">Scans</div>
                </div>
              </div>
            </div>

            {/* Timestamps & Info */}
            <div className="text-[11px] text-stone-500 space-y-1 bg-stone-50 p-3 rounded-xl">
              <div>
                Account Registered: <strong>{new Date(selectedUser.createdAt).toLocaleString()}</strong>
              </div>
              <div>
                Last Session Activity: <strong>{new Date(selectedUser.lastActiveAt).toLocaleString()}</strong>
              </div>
              <div>
                Saved Reports: <strong>{selectedUser.savedReportsCount || 0}</strong>
              </div>
            </div>

            {/* Footer Operations */}
            <div className="flex items-center justify-between border-t border-stone-100 pt-4">
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    type: 'delete',
                    user: selectedUser,
                  })
                }
                className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete Account</span>
              </button>

              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Critical Action Double Confirmation Modal (Section 35) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-lg font-black text-stone-900">
                {confirmModal.type === 'delete'
                  ? 'Permanently Delete User?'
                  : confirmModal.type === 'suspend'
                  ? confirmModal.user.status === 'suspended'
                    ? 'Reactivate Account?'
                    : 'Suspend Account Access?'
                  : 'Reset User Consumption Counters?'}
              </h4>
              <p className="text-xs text-stone-500">
                {confirmModal.type === 'delete'
                  ? `This will completely purge all session and historical data for ${confirmModal.user?.name || 'User'} (${confirmModal.user?.email || ''}). This cannot be undone.`
                  : confirmModal.type === 'suspend'
                  ? `User ${confirmModal.user?.name || 'User'} will be immediately prevented from submitting AI queries.`
                  : `This will reset AI questions, photo analyses, and room scan meters back to 0 for ${confirmModal.user?.name || 'User'}.`}
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={executeConfirmAction}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Executing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
