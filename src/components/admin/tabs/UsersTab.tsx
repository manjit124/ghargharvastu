import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Users,
  MoreVertical,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Shield,
  Trash2,
  Edit3,
  Download,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
} from 'lucide-react';
import { adminFetch } from '../adminApi';
import { AppUser, AdminRole } from '../types';

interface UsersTabProps {
  currentUserRole: AdminRole;
}

export const UsersTab: React.FC<UsersTabProps> = ({ currentUserRole }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(false);

  // User detail / edit modal state
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [editPlan, setEditPlan] = useState<'free' | 'pro' | 'expert'>('free');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editNotes, setEditNotes] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        plan: planFilter,
        status: statusFilter,
        sort: sortBy,
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      const res = await adminFetch<{ users: AppUser[]; pagination: any }>(`/api/admin/users?${query}`);
      setUsers(res.users);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, planFilter, statusFilter, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const handleOpenUserModal = (u: AppUser) => {
    setSelectedUser(u);
    setEditPlan(u.plan);
    setEditStatus(u.status);
    setEditNotes(u.adminNotes || '');
    setActionSuccessMessage(null);
  };

  const handleSaveUserDetails = async () => {
    if (!selectedUser) return;
    try {
      const res = await adminFetch<{ success: boolean; user: AppUser }>(
        `/api/admin/users/${selectedUser.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            plan: editPlan,
            status: editStatus,
            adminNotes: editNotes,
          }),
        }
      );

      setActionSuccessMessage('User updated successfully');
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? res.user : u)));
      setSelectedUser(res.user);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  };

  const handleResetUsage = async (userId: string) => {
    if (!confirm('Are you sure you want to reset all AI query and photo scan counters for this user?')) return;

    try {
      const res = await adminFetch<{ success: boolean; user: AppUser }>(
        `/api/admin/users/${userId}/reset-usage`,
        { method: 'POST' }
      );
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
      if (selectedUser?.id === userId) setSelectedUser(res.user);
      setActionSuccessMessage('Usage counters reset to 0');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to reset usage');
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    const isSuspend = user.status === 'active';
    const action = isSuspend ? 'suspend' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} user ${user?.name || 'User'}?`)) return;

    try {
      const res = await adminFetch<{ success: boolean; user: AppUser }>(
        `/api/admin/users/${user.id}/${action}`,
        { method: 'POST' }
      );
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.user : u)));
      if (selectedUser?.id === user.id) setSelectedUser(res.user);
    } catch (err: any) {
      alert(err.message || 'Failed to change status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (currentUserRole !== 'SUPER_ADMIN') {
      alert('Only SUPER_ADMIN can permanently delete user accounts.');
      return;
    }

    if (!confirm('CRITICAL ACTION: Permanently delete this user record? This action cannot be undone.')) return;

    try {
      await adminFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleExportCSV = () => {
    window.open('/api/admin/export/users', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-stone-900">User Management Directory</h1>
          <p className="text-xs text-stone-500">
            Search, filter, adjust subscription tiers, reset usage quotas, and audit user activity
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Export Users CSV</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email address, or user ID..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs shadow-2xs transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-1.5 text-stone-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Starter</option>
            <option value="pro">Pro Advisor</option>
            <option value="expert">Home Expert</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
            <option value="high_usage">High AI Usage (&gt;30 queries)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium ml-auto"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="highest_usage">Sort: Highest AI Usage</option>
            <option value="name">Sort: Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-stone-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">AI Queries</th>
                <th className="py-3 px-4">Photos</th>
                <th className="py-3 px-4">Scans / Reports</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-400">
                    No users match the search criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs uppercase">
                          {u?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900">{u?.name || 'User'}</div>
                          <div className="text-[11px] text-stone-400 font-mono">{u?.email || ''}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          u.plan === 'expert'
                            ? 'bg-purple-100 text-purple-800'
                            : u.plan === 'pro'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {u.plan.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium">{u.questionsAsked || 0}</td>
                    <td className="py-3 px-4 font-mono font-medium">{u.photosAnalyzed || 0}</td>
                    <td className="py-3 px-4 font-mono text-stone-500">
                      {u.roomScansCompleted || 0} / {u.savedReportsCount || 0}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          u.status === 'active' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {u.status === 'active' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            Suspended
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-stone-400 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenUserModal(u)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                          title="View / Edit User"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleResetUsage(u.id)}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors"
                          title="Reset Usage Quotas"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.status === 'active'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          }`}
                          title={u.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                        >
                          {u.status === 'active' ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-stone-200/80 bg-stone-50 flex items-center justify-between text-xs text-stone-600">
          <div>
            Showing <span className="font-semibold">{users.length}</span> of{' '}
            <span className="font-semibold">{pagination.total}</span> users
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs">
              Page {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Details & Edit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">{selectedUser?.name || 'User Details'}</h3>
                <p className="text-xs text-stone-500 font-mono">{selectedUser?.email || ''}</p>
                <div className="text-[11px] text-stone-400 mt-1">ID: {selectedUser?.id}</div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            {actionSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionSuccessMessage}</span>
              </div>
            )}

            {/* Usage Summary Grid */}
            <div className="grid grid-cols-3 gap-2 bg-stone-50 p-3 rounded-2xl text-center border border-stone-200/70">
              <div>
                <div className="text-[10px] text-stone-500 uppercase">AI Queries</div>
                <div className="text-base font-bold text-stone-900 font-mono">
                  {selectedUser.questionsAsked || 0}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-stone-500 uppercase">Photo Audits</div>
                <div className="text-base font-bold text-stone-900 font-mono">
                  {selectedUser.photosAnalyzed || 0}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-stone-500 uppercase">Room Scans</div>
                <div className="text-base font-bold text-stone-900 font-mono">
                  {selectedUser.roomScansCompleted || 0}
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 block">Subscription Tier</label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
                  >
                    <option value="free">Free Starter (₹0)</option>
                    <option value="pro">Pro Advisor (₹99/mo)</option>
                    <option value="expert">Home Expert Suite (₹299/mo)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 block">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
                  >
                    <option value="active">Active (Access Granted)</option>
                    <option value="suspended">Suspended (Access Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 block">
                  Internal Administrative Notes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record customer history, special plan overrides, or support correspondence..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResetUsage(selectedUser.id)}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Counters</span>
                </button>

                {currentUserRole === 'SUPER_ADMIN' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete User</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserDetails}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-sm transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
