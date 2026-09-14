import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Tag,
  TrendingUp,
  Search,
  Plus,
  Trash2,
  Edit2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';

export const SubscriptionsCouponsTab: React.FC<{ initialSection?: string }> = ({
  initialSection = 'subscriptions',
}) => {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'coupons'>(
    initialSection === 'coupons' ? 'coupons' : 'subscriptions'
  );

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Status Change Modal (requires note)
  const [statusModal, setStatusModal] = useState<{
    sub: any;
    newStatus: string;
    notes: string;
  } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Coupon Edit Modal
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<any | null>(null);
  const [savingCoupon, setSavingCoupon] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsRes, coupsRes] = await Promise.all([
        adminService.getSubscriptions(),
        adminService.getCoupons(),
      ]);
      setSubscriptions(subsRes || []);
      setCoupons(coupsRes || []);
    } catch (err) {
      console.error('Failed to load subscriptions & coupons', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateSubStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModal?.notes.trim()) {
      alert('An audit reason/note is required when modifying subscription status.');
      return;
    }

    setUpdatingStatus(true);
    try {
      await adminService.updateSubscriptionStatus(
        statusModal.sub.id,
        statusModal.newStatus,
        statusModal.notes
      );
      setStatusModal(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update subscription status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCoupon.code) {
      alert('Coupon code is required.');
      return;
    }

    setSavingCoupon(true);
    try {
      if (editCoupon.id) {
        await adminService.updateCoupon(editCoupon.id, editCoupon);
      } else {
        await adminService.createCoupon(editCoupon);
      }
      setCouponModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save coupon');
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Permanently remove this coupon?')) return;
    try {
      await adminService.deleteCoupon(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  const handleExportSubs = async () => {
    try {
      await adminService.downloadExport('subscriptions');
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  // Quick Revenue metrics
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const totalMRR = activeSubs.reduce((acc, s) => acc + (s.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Switcher */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Subscribers & Orders ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'coupons'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Promo Codes & Discounts ({coupons.length})
          </button>
        </div>

        <div>
          {activeTab === 'subscriptions' ? (
            <button
              onClick={handleExportSubs}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Orders (CSV)</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditCoupon({
                  code: '',
                  discountType: 'percentage',
                  discountAmount: 20,
                  applicablePlan: 'all',
                  maxUses: 100,
                  active: true,
                  startDate: new Date().toISOString().split('T')[0],
                  expiryDate: '2026-12-31',
                });
                setCouponModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Coupon</span>
            </button>
          )}
        </div>
      </div>

      {/* SUBTAB 1: SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-5">
          {/* Revenue KPI Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-1">
              <span className="text-xs font-bold text-stone-500 uppercase">Monthly Active MRR</span>
              <div className="text-2xl font-black text-stone-900">₹{totalMRR.toLocaleString('en-IN')}</div>
              <span className="text-[11px] text-emerald-700 font-semibold">Active recurring book</span>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-1">
              <span className="text-xs font-bold text-stone-500 uppercase">Paid Subscriptions</span>
              <div className="text-2xl font-black text-stone-900">{activeSubs.length} Active</div>
              <span className="text-[11px] text-stone-500 font-medium">{subscriptions.length} total orders recorded</span>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-1">
              <span className="text-xs font-bold text-stone-500 uppercase">Average Order Value</span>
              <div className="text-2xl font-black text-stone-900">
                ₹{subscriptions.length > 0 ? Math.round(totalMRR / Math.max(1, activeSubs.length)) : 0}
              </div>
              <span className="text-[11px] text-stone-500 font-medium">Blended Pro & Expert tier</span>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Order / User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-stone-900">{sub.userName || 'Subscriber'}</div>
                      <div className="text-[11px] text-stone-500">{sub.userEmail}</div>
                      <div className="text-[10px] font-mono text-stone-400">{sub.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded font-bold uppercase text-[10px]">
                        {sub.planId}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-900">
                      ₹{sub.amount} <span className="text-stone-400 font-normal">/{sub.billingPeriod}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          sub.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : sub.status === 'canceled'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-[11px]">
                      <div>Start: {new Date(sub.startDate).toLocaleDateString()}</div>
                      <div>End: {new Date(sub.expiryDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          setStatusModal({
                            sub,
                            newStatus: sub.status === 'active' ? 'canceled' : 'active',
                            notes: '',
                          })
                        }
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold transition-colors"
                      >
                        Override Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {coupons.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="px-3 py-1 bg-amber-50 border border-amber-300/80 rounded-xl font-mono font-black text-amber-900 text-sm tracking-wider">
                    {c.code}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {c.active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="text-xl font-black text-stone-900">
                  {c.discountType === 'percentage' ? `${c.discountAmount}% OFF` : `₹${c.discountAmount} FLAT OFF`}
                </div>

                <div className="text-xs text-stone-600 space-y-1">
                  <div>
                    Applies to: <strong className="capitalize">{c.applicablePlan} Plans</strong>
                  </div>
                  <div>
                    Usage: <strong>{c.usedCount}</strong> / {c.maxUses} claims
                  </div>
                  <div>
                    Valid: {c.startDate} to {c.expiryDate}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-stone-100">
                <button
                  onClick={() => {
                    setEditCoupon({ ...c });
                    setCouponModalOpen(true);
                  }}
                  className="p-1.5 text-stone-500 hover:text-stone-900 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteCoupon(c.id)}
                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subscription Status Override Modal (Section 15 audit requirement) */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h4 className="text-base font-black text-stone-900">Override Subscription Status</h4>
              <button
                onClick={() => setStatusModal(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubStatus} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block">Target Subscriber</label>
                <div className="font-semibold text-stone-900">{statusModal.sub.userEmail}</div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">New Status</label>
                <select
                  value={statusModal.newStatus}
                  onChange={(e) =>
                    setStatusModal({ ...statusModal, newStatus: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                >
                  <option value="active">Active (Granted Access)</option>
                  <option value="canceled">Canceled (User requested)</option>
                  <option value="expired">Expired (Grace period end)</option>
                  <option value="past_due">Past Due (Payment retry)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">
                  Mandatory Audit Trail Reason / Note
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this status is being manually altered (e.g. Offline bank transfer confirmation)..."
                  value={statusModal.notes}
                  onChange={(e) => setStatusModal({ ...statusModal, notes: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setStatusModal(null)}
                  className="px-4 py-2 bg-stone-100 text-stone-800 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 bg-stone-900 text-amber-400 font-bold rounded-xl"
                >
                  {updatingStatus ? 'Updating...' : 'Commit Status Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Add / Edit Modal */}
      {couponModalOpen && editCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h4 className="text-base font-black text-stone-900">
                {editCoupon.id ? 'Edit Coupon' : 'Create Promotional Coupon'}
              </h4>
              <button
                onClick={() => setCouponModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={editCoupon.code}
                  onChange={(e) =>
                    setEditCoupon({ ...editCoupon, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. VASTU50"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-stone-900 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Discount Type</label>
                  <select
                    value={editCoupon.discountType}
                    onChange={(e) =>
                      setEditCoupon({ ...editCoupon, discountType: e.target.value })
                    }
                    className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={editCoupon.discountAmount}
                    onChange={(e) =>
                      setEditCoupon({ ...editCoupon, discountAmount: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Applicable Plan</label>
                  <select
                    value={editCoupon.applicablePlan}
                    onChange={(e) =>
                      setEditCoupon({ ...editCoupon, applicablePlan: e.target.value })
                    }
                    className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  >
                    <option value="all">All Plans</option>
                    <option value="pro">Pro Advisor Only</option>
                    <option value="expert">Home Expert Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Max Uses</label>
                  <input
                    type="number"
                    value={editCoupon.maxUses}
                    onChange={(e) =>
                      setEditCoupon({ ...editCoupon, maxUses: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Start Date</label>
                  <input
                    type="date"
                    value={editCoupon.startDate}
                    onChange={(e) => setEditCoupon({ ...editCoupon, startDate: e.target.value })}
                    className="w-full px-2 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Expiry Date</label>
                  <input
                    type="date"
                    value={editCoupon.expiryDate}
                    onChange={(e) => setEditCoupon({ ...editCoupon, expiryDate: e.target.value })}
                    className="w-full px-2 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-2 cursor-pointer font-bold text-stone-700">
                <input
                  type="checkbox"
                  checked={editCoupon.active}
                  onChange={(e) => setEditCoupon({ ...editCoupon, active: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600"
                />
                <span>Active Coupon</span>
              </label>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 rounded-xl font-bold text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCoupon}
                  className="px-5 py-2 bg-stone-900 text-amber-400 font-bold rounded-xl"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
