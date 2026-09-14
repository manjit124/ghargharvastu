import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Ticket,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Percent,
  Calendar,
  DollarSign,
  Download,
  Ban,
  Gift,
  RefreshCw,
  Clock,
  UserCheck,
} from 'lucide-react';
import { adminFetch } from '../adminApi';
import { SubscriptionRecord, CouponRecord, PaymentOrderRecord } from '../types';

export const SubscriptionsTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'subscriptions' | 'orders' | 'coupons'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [orders, setOrders] = useState<PaymentOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Manual Grant Modal
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [grantData, setGrantData] = useState({
    targetUserId: '',
    planId: 'pro' as 'pro' | 'expert',
    durationMonths: 1,
    reason: 'Complimentary grant for customer satisfaction',
  });

  // Cancel Modal
  const [cancelModalSubId, setCancelModalSubId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Cancelled by admin request');

  // New Coupon modal
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState<Partial<CouponRecord>>({
    code: '',
    discountType: 'percentage',
    discountAmount: 20,
    maxUses: 100,
    usedCount: 0,
    perUserLimit: 1,
    startDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    applicablePlan: 'all',
    active: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subRes, cpnRes, ordRes] = await Promise.all([
        adminFetch<{ subscriptions: SubscriptionRecord[] }>('/api/admin/subscriptions'),
        adminFetch<{ coupons: CouponRecord[] }>('/api/admin/coupons'),
        adminFetch<{ orders: PaymentOrderRecord[] }>('/api/admin/payments/orders').catch(() => ({ orders: [] })),
      ]);
      setSubscriptions(subRes.subscriptions || []);
      setCoupons(cpnRes.coupons || []);
      setOrders(ordRes.orders || []);
    } catch (err) {
      console.error('Error loading subscription data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGrantSubscription = async () => {
    if (!grantData.targetUserId.trim()) {
      alert('Please enter a target User ID');
      return;
    }
    try {
      const res = await adminFetch<{ success: boolean; subscription?: SubscriptionRecord; message?: string }>(
        '/api/admin/subscriptions/grant',
        {
          method: 'POST',
          body: JSON.stringify(grantData),
        }
      );
      if (res.success) {
        setIsGrantModalOpen(false);
        setSuccessMessage(`Plan granted successfully to ${grantData.targetUserId}!`);
        await loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        alert(res.message || 'Failed to grant plan');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to grant subscription');
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelModalSubId) return;
    try {
      const res = await adminFetch<{ success: boolean; message?: string }>(
        `/api/admin/subscriptions/${cancelModalSubId}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: cancelReason }),
        }
      );
      if (res.success) {
        setCancelModalSubId(null);
        setSuccessMessage('Subscription successfully cancelled');
        await loadData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        alert(res.message || 'Failed to cancel subscription');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription');
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discountAmount) {
      alert('Please provide coupon code and discount amount');
      return;
    }

    try {
      const res = await adminFetch<{ success: boolean; coupon: CouponRecord }>('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(newCoupon),
      });
      setCoupons((prev) => [res.coupon, ...prev]);
      setIsCouponModalOpen(false);
      setSuccessMessage(`Coupon ${res.coupon.code} created successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon');
    }
  };

  const handleToggleCoupon = async (coupon: CouponRecord) => {
    try {
      const res = await adminFetch<{ success: boolean; coupon: CouponRecord }>(
        `/api/admin/coupons/${coupon.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ active: !coupon.active }),
        }
      );
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? res.coupon : c)));
    } catch (err: any) {
      alert(err.message || 'Failed to toggle coupon status');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await adminFetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      setSuccessMessage('Coupon deleted');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-stone-900">
            Subscriptions & Coupon Management
          </h1>
          <p className="text-xs text-stone-500">
            Real-time subscriber ledger, payment status tracking, and promotional discount vouchers
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsGrantModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors shadow-2xs"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Grant Plan</span>
          </button>
          <button
            onClick={() => window.open('/api/admin/export/subscriptions', '_blank')}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setSubTab('subscriptions')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'subscriptions'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Active Subscriptions ({subscriptions.length})
        </button>

        <button
          onClick={() => setSubTab('orders')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'orders'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Payment Orders ({orders.length})
        </button>

        <button
          onClick={() => setSubTab('coupons')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'coupons'
              ? 'bg-stone-900 text-amber-400 shadow-2xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Promo Coupons ({coupons.length})
        </button>
      </div>

      {/* Subscriptions Table */}
      {subTab === 'subscriptions' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Plan Name</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Renewal / Expiry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    No active subscriptions recorded.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const isActive = sub.status === 'active' || sub.status === 'ACTIVE';
                  return (
                    <tr key={sub.id} className="hover:bg-stone-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900">{sub.userName}</div>
                        <div className="text-[11px] text-stone-400 font-mono">{sub.userEmail}</div>
                        <div className="text-[9px] text-stone-400 font-mono">ID: {sub.userId}</div>
                      </td>
                      <td className="py-3 px-4 font-medium">{sub.planName}</td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">
                        {sub.currency} {sub.amount}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : sub.status === 'cancelled' || sub.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {sub.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700">
                          {sub.paymentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                        {new Date(sub.expiryDate).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isActive && (
                          <button
                            onClick={() => setCancelModalSubId(sub.id)}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold inline-flex items-center gap-1"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders Table */}
      {subTab === 'orders' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment ID</th>
                <th className="py-3 px-4">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    No payment orders recorded yet.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-stone-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-stone-800">
                      {ord.orderId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-900">{ord.userEmail}</div>
                      <div className="text-[10px] text-stone-400 font-mono">User: {ord.userId}</div>
                    </td>
                    <td className="py-3 px-4 uppercase font-bold text-amber-700">
                      {ord.planId}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">
                      {ord.currency} {ord.amount}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          ord.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : ord.status === 'failed'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {ord.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-500">
                      {ord.paymentId || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-400">
                      {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Coupons View */}
      {subTab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">
              Discount voucher codes applicable during checkout
            </span>
            <button
              onClick={() => setIsCouponModalOpen(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Coupon</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-base px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-950 rounded-lg">
                      {c.code}
                    </span>
                    <button
                      onClick={() => handleToggleCoupon(c)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      {c.active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>

                  <div className="text-xs font-semibold text-stone-800">
                    {c.discountType === 'percentage'
                      ? `${c.discountAmount}% Off`
                      : `₹${c.discountAmount} Flat Discount`}
                  </div>

                  <div className="text-[11px] text-stone-500 space-y-1">
                    <div>
                      Redeemed: <span className="font-mono font-bold text-stone-800">{c.usedCount}</span> /{' '}
                      {c.maxUses} uses
                    </div>
                    <div>
                      Expires:{' '}
                      {new Date(c.expiryDate).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-stone-400 uppercase">Tier: {c.applicablePlan}</span>
                  <button
                    onClick={() => handleDeleteCoupon(c.id)}
                    className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900">Create Discount Coupon</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. FESTIVE30"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Discount Type</label>
                  <select
                    value={newCoupon.discountType}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, discountType: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed INR (₹)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Amount</label>
                  <input
                    type="number"
                    value={newCoupon.discountAmount}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, discountAmount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Max Uses</label>
                  <input
                    type="number"
                    value={newCoupon.maxUses}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, maxUses: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Applicable Plan</label>
                  <select
                    value={newCoupon.applicablePlan}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, applicablePlan: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="all">All Plans</option>
                    <option value="pro">Pro Advisor</option>
                    <option value="expert">Home Expert</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCoupon}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs"
              >
                Create Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Grant Modal */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-stone-900">Grant Subscription Plan</h3>
            </div>
            <p className="text-xs text-stone-500">
              Administer a complimentary PRO or HOME EXPERT entitlement directly to a user account.
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Target User ID or Email</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. usr_123 or client@example.com"
                  value={grantData.targetUserId}
                  onChange={(e) => setGrantData({ ...grantData, targetUserId: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Plan Tier</label>
                  <select
                    value={grantData.planId}
                    onChange={(e) => setGrantData({ ...grantData, planId: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="pro">Pro Home (25 Cr)</option>
                    <option value="expert">Home Expert (Unlimited*)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Duration (Months)</label>
                  <input
                    type="number"
                    min={1}
                    max={36}
                    value={grantData.durationMonths}
                    onChange={(e) => setGrantData({ ...grantData, durationMonths: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Reason / Admin Note</label>
                <input
                  type="text"
                  value={grantData.reason}
                  onChange={(e) => setGrantData({ ...grantData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
              <button
                onClick={() => setIsGrantModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantSubscription}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
              >
                Confirm Grant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {cancelModalSubId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600">
              <Ban className="w-5 h-5" />
              <h3 className="text-base font-bold text-stone-900">Cancel Subscription</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to cancel this user subscription? The user will immediately be downgraded to the FREE tier with zero active paid entitlements.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-stone-700">Cancellation Reason</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setCancelModalSubId(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
              >
                Back
              </button>
              <button
                onClick={handleCancelSubscription}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
