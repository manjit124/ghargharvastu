import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  HelpCircle,
  Eye,
  RotateCcw,
  Zap,
  ListFilter,
  Sliders,
  UserCheck,
  RefreshCw,
  FileSpreadsheet,
  X,
  History,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowRight,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { useAppConfig } from '../../../context/AppConfigContext';
import { CreditSettingsConfig, CreditLedgerRecord } from '../types';

export const PricingTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'credits' | 'ledger' | 'adjust'>('plans');
  const [plans, setPlans] = useState<any[]>([]);
  const [serverPlans, setServerPlans] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [editingReason, setEditingReason] = useState<{ [planId: string]: string }>({});
  const [expandedFairUse, setExpandedFairUse] = useState<{ [planId: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const { refreshConfig } = useAppConfig();

  // Credit Economics state
  const [creditSettings, setCreditSettings] = useState<CreditSettingsConfig | null>(null);
  const [savingCredits, setSavingCredits] = useState(false);
  const [creditSaveSuccess, setCreditSaveSuccess] = useState(false);

  // Credit Ledger state
  const [ledger, setLedger] = useState<CreditLedgerRecord[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<string>('ALL');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Manual Adjust state
  const [adjustUserId, setAdjustUserId] = useState<string>('');
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('Goodwill customer bonus');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustResult, setAdjustResult] = useState<string | null>(null);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const data = await adminService.getPricingFull();
      const loadedPlans = data.plans || [];
      setPlans(JSON.parse(JSON.stringify(loadedPlans)));
      setServerPlans(JSON.parse(JSON.stringify(loadedPlans)));
      setPriceHistory(data.priceHistory || []);
    } catch (err) {
      console.error('Failed to load pricing plans', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditSettings = async () => {
    try {
      const res: any = await adminService.getCreditSettings();
      if (res?.settings) setCreditSettings(res.settings);
    } catch (err) {
      console.error('Failed to load credit settings', err);
    }
  };

  const fetchLedger = async () => {
    setLedgerLoading(true);
    try {
      const res: any = await adminService.getCreditLedger(ledgerSearch);
      if (res?.ledger) setLedger(res.ledger);
    } catch (err) {
      console.error('Failed to load credit ledger', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
    fetchCreditSettings();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'ledger') {
      fetchLedger();
    }
  }, [activeSubTab]);

  const handlePlanChange = (idx: number, field: string, value: any) => {
    const updated = [...plans];
    updated[idx] = { ...updated[idx], [field]: value };
    setPlans(updated);
  };

  const handleLimitChange = (idx: number, field: string, value: any) => {
    const updated = [...plans];
    updated[idx] = {
      ...updated[idx],
      limits: {
        ...updated[idx].limits,
        [field]: value,
      },
    };
    setPlans(updated);
  };

  const handleFeatureChange = (planIdx: number, featIdx: number, value: string) => {
    const updated = [...plans];
    const feats = [...updated[planIdx].features];
    feats[featIdx] = value;
    updated[planIdx] = { ...updated[planIdx], features: feats };
    setPlans(updated);
  };

  const handleAddFeature = (planIdx: number) => {
    const updated = [...plans];
    const feats = [...(updated[planIdx].features || []), 'New feature entitlement'];
    updated[planIdx] = { ...updated[planIdx], features: feats };
    setPlans(updated);
  };

  const handleRemoveFeature = (planIdx: number, featIdx: number) => {
    const updated = [...plans];
    const feats = updated[planIdx].features.filter((_: any, i: number) => i !== featIdx);
    updated[planIdx] = { ...updated[planIdx], features: feats };
    setPlans(updated);
  };

  const handleSavePlan = async (plan: any) => {
    if (plan.price === undefined || plan.price === null || isNaN(Number(plan.price)) || Number(plan.price) < 0) {
      alert('Plan price must be a valid non-negative number.');
      return;
    }
    if (plan.promotionalPrice !== undefined && plan.promotionalPrice !== null && plan.promotionalPrice !== '') {
      if (isNaN(Number(plan.promotionalPrice)) || Number(plan.promotionalPrice) < 0) {
        alert('Promotional price must be a valid non-negative number.');
        return;
      }
    }
    if (!plan.currency || !String(plan.currency).trim()) {
      alert('Currency symbol is required (e.g. ₹).');
      return;
    }

    setSavingId(plan.id);
    setSaveSuccess(null);
    try {
      const reason = editingReason[plan.id];
      const payload = {
        ...plan,
        price: Number(plan.price),
        promotionalPrice: plan.promotionalPrice !== undefined && plan.promotionalPrice !== '' ? Number(plan.promotionalPrice) : undefined,
        changeReason: reason || undefined,
      };

      const res: any = await adminService.updatePricingPlan(plan.id, payload);
      setSaveSuccess(plan.id);
      if (res?.priceHistory) {
        setPriceHistory(res.priceHistory);
      }
      await refreshConfig();
      // Update local server backup
      setServerPlans((prev) => prev.map((p) => (p.id === plan.id ? JSON.parse(JSON.stringify(plan)) : p)));
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save plan changes');
    } finally {
      setSavingId(null);
    }
  };

  const handleCancelPlan = (planId: string, pIdx: number) => {
    const original = serverPlans.find((p) => p.id === planId);
    if (original) {
      const updated = [...plans];
      updated[pIdx] = JSON.parse(JSON.stringify(original));
      setPlans(updated);
    }
  };

  const handleResetPlan = async (planId: string) => {
    if (!confirm(`Are you sure you want to reset plan "${planId}" to factory default pricing and quotas?`)) {
      return;
    }
    setSavingId(planId);
    try {
      const res: any = await adminService.resetPricingPlan(planId);
      if (res?.success) {
        await fetchPricing();
        await refreshConfig();
        setSaveSuccess(planId);
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reset plan');
    } finally {
      setSavingId(null);
    }
  };

  const toggleFairUse = (planId: string) => {
    setExpandedFairUse((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };

  const handleSaveCreditSettings = async () => {
    if (!creditSettings) return;
    setSavingCredits(true);
    setCreditSaveSuccess(false);
    try {
      await adminService.updateCreditSettings(creditSettings);
      setCreditSaveSuccess(true);
      setTimeout(() => setCreditSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save credit economics');
    } finally {
      setSavingCredits(false);
    }
  };

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUserId.trim()) {
      alert('Please enter a target User ID');
      return;
    }
    setAdjustLoading(true);
    setAdjustResult(null);
    try {
      const res: any = await adminService.adjustUserCredits(
        adjustUserId.trim(),
        Number(adjustAmount),
        adjustReason.trim()
      );
      setAdjustResult(`Success! User ${adjustUserId} updated. New Balance: ${res.newBalance} credits.`);
      setAdjustUserId('');
      if (activeSubTab === 'ledger') fetchLedger();
    } catch (err: any) {
      setAdjustResult(`Error: ${err.message || 'Failed to adjust credits'}`);
    } finally {
      setAdjustLoading(false);
    }
  };

  const filteredLedger = ledger.filter((rec) => {
    if (ledgerFilter !== 'ALL' && rec.type !== ledgerFilter) return false;
    if (ledgerSearch.trim()) {
      const s = ledgerSearch.toLowerCase();
      return (
        rec.userId?.toLowerCase().includes(s) ||
        rec.userName?.toLowerCase().includes(s) ||
        rec.reason?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  if (loading) {
    return <div className="p-8 text-center text-stone-500 font-semibold text-xs">Loading plans and pricing configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600 fill-amber-600" />
            <span>Monetization & Credit Architecture</span>
          </h2>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Configure subscription tiers, consumption credits, rewarded ads engine, audit ledger, and user adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/60 font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Real-Time System Active</span>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex border-b border-stone-200 gap-2 overflow-x-auto text-xs font-bold text-stone-600">
        <button
          type="button"
          onClick={() => setActiveSubTab('plans')}
          className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'plans'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <DollarSign className="w-4 h-4 text-amber-600" />
          <span>Subscription Plans (₹0, ₹99, ₹299)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('credits')}
          className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'credits'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-600" />
          <span>Credit Costs & Free Quotas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ledger')}
          className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'ledger'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <ListFilter className="w-4 h-4 text-amber-600" />
          <span>Live Credit Ledger ({ledger.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('adjust')}
          className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'adjust'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-600" />
          <span>Manual User Credit Adjustment</span>
        </button>
      </div>

      {activeSubTab === 'plans' && (
        <div className="space-y-8">
          {/* Price Change Safety & Architecture Notice */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-black text-amber-900 block">
                Authoritative Server-Side Pricing & Subscription Protection
              </span>
              <p className="text-amber-800 leading-relaxed">
                Changes made here take effect immediately on backend order validation and public pricing APIs without any code redeployment.
                <strong> Existing active subscriber billing is safely grandfathered</strong>; updating a plan price only affects future new checkout sessions. All price adjustments are immutably logged below.
              </p>
            </div>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {plans.map((plan, pIdx) => {
              const isDirty = JSON.stringify(plan) !== JSON.stringify(serverPlans.find((p) => p.id === plan.id));
              const isSaving = savingId === plan.id;
              const isSuccess = saveSuccess === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`bg-white border rounded-3xl p-6 space-y-5 shadow-xs flex flex-col justify-between transition-all ${
                    plan.featured
                      ? 'border-amber-400 ring-2 ring-amber-400/25'
                      : plan.enabled
                      ? 'border-stone-200'
                      : 'border-stone-200 opacity-80 bg-stone-50/50'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: ID, Active Badge, and Status Toggle */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-black text-stone-500 uppercase px-2 py-0.5 bg-stone-100 rounded-md">
                          {plan.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            plan.enabled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {plan.enabled ? 'ACTIVE STOREFRONT' : 'INACTIVE'}
                        </span>
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="checkbox"
                          checked={plan.enabled}
                          onChange={(e) => handlePlanChange(pIdx, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>Enabled</span>
                      </label>
                    </div>

                    {/* Plan Name & Featured Pill */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">Plan Display Name</label>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => handlePlanChange(pIdx, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white"
                        placeholder="e.g. Free, Pro, Home Expert"
                      />
                    </div>

                    {/* Pricing, Currency & Billing Period */}
                    <div className="p-3.5 bg-stone-50/80 border border-stone-200 rounded-2xl space-y-3">
                      <div className="text-[11px] font-bold text-stone-700 flex items-center justify-between">
                        <span>Price & Currency</span>
                        <span className="text-stone-400 font-normal text-[10px]">Authoritative Rate</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 block">Currency</label>
                          <input
                            type="text"
                            value={plan.currency || '₹'}
                            onChange={(e) => handlePlanChange(pIdx, 'currency', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-black text-center text-stone-900"
                            placeholder="₹"
                          />
                        </div>

                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-bold text-stone-500 block">
                            Price ({plan.currency || '₹'})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={plan.price}
                            onChange={(e) =>
                              handlePlanChange(pIdx, 'price', Math.max(0, Number(e.target.value)))
                            }
                            className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-sm font-black text-stone-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 block">
                            Promo Price ({plan.currency || '₹'})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={plan.promotionalPrice !== undefined ? plan.promotionalPrice : ''}
                            onChange={(e) =>
                              handlePlanChange(
                                pIdx,
                                'promotionalPrice',
                                e.target.value === '' ? undefined : Math.max(0, Number(e.target.value))
                              )
                            }
                            placeholder="Optional sale"
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 block">Billing Period</label>
                          <select
                            value={plan.billingPeriod}
                            onChange={(e) => handlePlanChange(pIdx, 'billingPeriod', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                          >
                            <option value="forever">Forever / Free</option>
                            <option value="month">Per Month</option>
                            <option value="year">Per Year</option>
                            <option value="one_time">One-Time</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Badge & Featured Card Toggle */}
                    <div className="grid grid-cols-2 gap-2.5 items-center">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-stone-600 block">Card Badge</label>
                        <input
                          type="text"
                          value={plan.badge || ''}
                          onChange={(e) => handlePlanChange(pIdx, 'badge', e.target.value)}
                          placeholder="e.g. Best Value"
                          className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900"
                        />
                      </div>
                      <div className="pt-4">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-stone-700">
                          <input
                            type="checkbox"
                            checked={plan.featured}
                            onChange={(e) => handlePlanChange(pIdx, 'featured', e.target.checked)}
                            className="w-4 h-4 rounded text-amber-600"
                          />
                          <span>Recommended Plan</span>
                        </label>
                      </div>
                    </div>

                    {/* Description Hook */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-600 block">Description Hook</label>
                      <textarea
                        rows={2}
                        value={plan.description || ''}
                        onChange={(e) => handlePlanChange(pIdx, 'description', e.target.value)}
                        placeholder="Brief summary of target user and value..."
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900"
                      />
                    </div>

                    {/* Credits & Usage Limits */}
                    <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-stone-800">
                          Monthly Credits & Quotas
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-stone-500 font-bold">Monthly Credits:</span>
                          <input
                            type="number"
                            min="0"
                            value={plan.credits || 0}
                            onChange={(e) =>
                              handlePlanChange(pIdx, 'credits', Math.max(0, Number(e.target.value)))
                            }
                            className="w-14 px-1.5 py-0.5 bg-white border border-stone-300 rounded-md text-center text-xs font-black text-amber-700"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-stone-500 block">AI Qs</span>
                          <input
                            type="number"
                            min="0"
                            value={plan.limits?.questionsPerMonth || 0}
                            onChange={(e) =>
                              handleLimitChange(pIdx, 'questionsPerMonth', Math.max(0, Number(e.target.value)))
                            }
                            className="w-full p-1 bg-white border border-stone-200 rounded-lg text-center font-bold text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-stone-500 block">Photos</span>
                          <input
                            type="number"
                            min="0"
                            value={plan.limits?.photosPerMonth || 0}
                            onChange={(e) =>
                              handleLimitChange(pIdx, 'photosPerMonth', Math.max(0, Number(e.target.value)))
                            }
                            className="w-full p-1 bg-white border border-stone-200 rounded-lg text-center font-bold text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-stone-500 block">Room Scans</span>
                          <input
                            type="number"
                            min="0"
                            value={plan.limits?.roomScansPerMonth || 0}
                            onChange={(e) =>
                              handleLimitChange(pIdx, 'roomScansPerMonth', Math.max(0, Number(e.target.value)))
                            }
                            className="w-full p-1 bg-white border border-stone-200 rounded-lg text-center font-bold text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-stone-500 block">Voice Mins</span>
                          <input
                            type="number"
                            min="0"
                            value={plan.limits?.voiceMinutesPerMonth ?? 10}
                            onChange={(e) =>
                              handleLimitChange(pIdx, 'voiceMinutesPerMonth', Math.max(0, Number(e.target.value)))
                            }
                            className="w-full p-1 bg-white border border-stone-200 rounded-lg text-center font-bold text-xs"
                          />
                        </div>
                      </div>

                      {/* Capabilities checkboxes */}
                      <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-stone-700 pt-1 border-t border-stone-200/60">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(plan.limits?.completeHomeScan)}
                            onChange={(e) => handleLimitChange(pIdx, 'completeHomeScan', e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-amber-600"
                          />
                          <span>Full Home</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(plan.limits?.pdfReports)}
                            onChange={(e) => handleLimitChange(pIdx, 'pdfReports', e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-amber-600"
                          />
                          <span>PDF Report</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(plan.limits?.priorityAi)}
                            onChange={(e) => handleLimitChange(pIdx, 'priorityAi', e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-amber-600"
                          />
                          <span>Priority AI</span>
                        </label>
                      </div>
                    </div>

                    {/* Fair-Use Limits (Collapsible) */}
                    <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => toggleFairUse(plan.id)}
                        className="w-full px-3 py-2 bg-stone-50 hover:bg-stone-100 flex items-center justify-between text-[11px] font-bold text-stone-700"
                      >
                        <span>Daily Fair-Use Protections</span>
                        {expandedFairUse[plan.id] ? (
                          <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                        )}
                      </button>

                      {expandedFairUse[plan.id] && (
                        <div className="p-3 bg-white space-y-2 border-t border-stone-200">
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <span className="text-stone-500 block">Max AI Requests/Day:</span>
                              <input
                                type="number"
                                value={plan.fairUseLimits?.maxAiRequestsPerDay ?? 40}
                                onChange={(e) =>
                                  handlePlanChange(pIdx, 'fairUseLimits', {
                                    ...(plan.fairUseLimits || {}),
                                    maxAiRequestsPerDay: Number(e.target.value),
                                  })
                                }
                                className="w-full p-1 bg-stone-50 border border-stone-200 rounded font-bold"
                              />
                            </div>
                            <div>
                              <span className="text-stone-500 block">Max Photos/Day:</span>
                              <input
                                type="number"
                                value={plan.fairUseLimits?.maxImageAnalysesPerDay ?? 15}
                                onChange={(e) =>
                                  handlePlanChange(pIdx, 'fairUseLimits', {
                                    ...(plan.fairUseLimits || {}),
                                    maxImageAnalysesPerDay: Number(e.target.value),
                                  })
                                }
                                className="w-full p-1 bg-stone-50 border border-stone-200 rounded font-bold"
                              />
                            </div>
                            <div>
                              <span className="text-stone-500 block">Max Home Scans/Day:</span>
                              <input
                                type="number"
                                value={plan.fairUseLimits?.maxHomeScansPerDay ?? 3}
                                onChange={(e) =>
                                  handlePlanChange(pIdx, 'fairUseLimits', {
                                    ...(plan.fairUseLimits || {}),
                                    maxHomeScansPerDay: Number(e.target.value),
                                  })
                                }
                                className="w-full p-1 bg-stone-50 border border-stone-200 rounded font-bold"
                              />
                            </div>
                            <div>
                              <span className="text-stone-500 block">Max Voice Mins/Day:</span>
                              <input
                                type="number"
                                value={plan.fairUseLimits?.maxVoiceMinutesPerDay ?? 20}
                                onChange={(e) =>
                                  handlePlanChange(pIdx, 'fairUseLimits', {
                                    ...(plan.fairUseLimits || {}),
                                    maxVoiceMinutesPerDay: Number(e.target.value),
                                  })
                                }
                                className="w-full p-1 bg-stone-50 border border-stone-200 rounded font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Features List Editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-700">Feature Bullet Points</span>
                        <button
                          onClick={() => handleAddFeature(pIdx)}
                          className="text-[11px] text-amber-700 font-bold flex items-center gap-0.5 hover:underline"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Item</span>
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {(plan.features || []).map((feat: string, fIdx: number) => (
                          <div key={fIdx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={feat}
                              onChange={(e) => handleFeatureChange(pIdx, fIdx, e.target.value)}
                              className="flex-1 px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFeature(pIdx, fIdx)}
                              className="p-1 text-stone-400 hover:text-rose-600 rounded-md"
                              title="Remove feature bullet point"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Change Reason Note */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] font-bold text-stone-500 block">
                        Price Change Audit Reason (Optional)
                      </label>
                      <input
                        type="text"
                        value={editingReason[plan.id] || ''}
                        onChange={(e) =>
                          setEditingReason((prev) => ({ ...prev, [plan.id]: e.target.value }))
                        }
                        placeholder="e.g. Festive discount launch"
                        className="w-full px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700"
                      />
                    </div>
                  </div>

                  {/* Actions Footer: Save, Cancel, Reset to Default */}
                  <div className="pt-4 border-t border-stone-100 space-y-2">
                    <button
                      onClick={() => handleSavePlan(plan)}
                      disabled={isSaving}
                      className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isSaving ? (
                        <span>Saving Changes...</span>
                      ) : isSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Saved to Server!</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save {plan.name}</span>
                        </>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCancelPlan(plan.id, pIdx)}
                        disabled={!isDirty || isSaving}
                        className="py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel Edits</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResetPlan(plan.id)}
                        disabled={isSaving}
                        className="py-1.5 px-2 border border-stone-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-stone-600 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Default</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visible Price Comparison Matrix */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Live Storefront Pricing & Entitlement Matrix</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Side-by-side comparison of active subscription parameters as presented to users.
                </p>
              </div>
              <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                {plans.filter((p) => p.enabled).length} Active Plans
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/60 text-stone-600 font-bold uppercase text-[10px]">
                    <th className="p-3">Plan</th>
                    <th className="p-3">Price / Period</th>
                    <th className="p-3">Promo</th>
                    <th className="p-3">Credits</th>
                    <th className="p-3">AI Qs</th>
                    <th className="p-3">Photos</th>
                    <th className="p-3">Room Scans</th>
                    <th className="p-3">Voice Mins</th>
                    <th className="p-3">Home Scan</th>
                    <th className="p-3">PDF Reports</th>
                    <th className="p-3">Ads Policy</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {plans.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/50">
                      <td className="p-3 font-bold text-stone-900">
                        {p.name}
                        {p.featured && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-900 text-[9px] rounded font-bold">
                            Featured
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-black text-stone-900">
                        {p.currency || '₹'}{p.price}/{p.billingPeriod}
                      </td>
                      <td className="p-3 text-stone-600">
                        {p.promotionalPrice !== undefined ? `${p.currency || '₹'}${p.promotionalPrice}` : '—'}
                      </td>
                      <td className="p-3 font-bold text-amber-700">
                        {p.credits || 0}
                      </td>
                      <td className="p-3 text-stone-700">{p.limits?.questionsPerMonth || 0}/mo</td>
                      <td className="p-3 text-stone-700">{p.limits?.photosPerMonth || 0}/mo</td>
                      <td className="p-3 text-stone-700">{p.limits?.roomScansPerMonth || 0}/mo</td>
                      <td className="p-3 text-stone-700">{p.limits?.voiceMinutesPerMonth ?? 10} mins</td>
                      <td className="p-3">
                        {p.limits?.completeHomeScan ? (
                          <span className="text-emerald-700 font-bold">Included</span>
                        ) : (
                          <span className="text-stone-400">Locked</span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.limits?.pdfReports ? (
                          <span className="text-emerald-700 font-bold">Included</span>
                        ) : (
                          <span className="text-stone-400">Locked</span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.showAds ? (
                          <span className="text-amber-700 font-bold">Ads Enabled</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Ad-Free</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.enabled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {p.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Price Change Audit Log */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Pricing Audit & History Log ({priceHistory.length})
                  </h3>
                  <p className="text-xs text-stone-500">
                    Timestamped audit trail tracking every price and promotional adjustment with administrator attribution.
                  </p>
                </div>
              </div>
            </div>

            {priceHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                No price modifications recorded yet. Any price updates will be logged here with Admin ID and timestamps.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50/60 text-stone-600 font-bold uppercase text-[10px]">
                      <th className="p-2.5">Date & Time</th>
                      <th className="p-2.5">Plan</th>
                      <th className="p-2.5">Previous Price</th>
                      <th className="p-2.5">New Price</th>
                      <th className="p-2.5">Admin</th>
                      <th className="p-2.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {priceHistory.slice(0, 10).map((record) => (
                      <tr key={record.id} className="hover:bg-stone-50/50">
                        <td className="p-2.5 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                        <td className="p-2.5 font-bold text-stone-900">{record.planName}</td>
                        <td className="p-2.5 text-stone-500 font-bold">
                          {record.currency}{record.oldPrice}
                          {record.oldPromotionalPrice !== undefined && (
                            <span className="text-[10px] text-stone-400 ml-1">
                              (Promo: {record.currency}{record.oldPromotionalPrice})
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-emerald-700 font-black">
                          {record.currency}{record.newPrice}
                          {record.newPromotionalPrice !== undefined && (
                            <span className="text-[10px] text-amber-700 ml-1">
                              (Promo: {record.currency}{record.newPromotionalPrice})
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-stone-700">
                          <span className="font-bold">{record.adminName}</span>{' '}
                          <span className="text-[10px] text-stone-400">({record.adminId})</span>
                        </td>
                        <td className="p-2.5 text-stone-600 italic max-w-xs truncate">
                          {record.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Credit Economics & Action Costs */}
      {activeSubTab === 'credits' && creditSettings && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-6 max-w-4xl">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-base font-black text-stone-900">Per-Action AI Credit Consumption Rates</h3>
            <p className="text-xs text-stone-500">
              When users call the Gemini models for chat, photos, or full house scans, the backend deducts credits according to these rates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
              <div className="text-xs font-bold text-stone-800">Action Costs (Credits Deducted)</div>
              
              <div className="flex items-center justify-between text-xs">
                <span>AI Chat Query Cost:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={creditSettings.textQuestionCost}
                    onChange={(e) =>
                      setCreditSettings({ ...creditSettings, textQuestionCost: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-right font-mono font-bold bg-white border border-stone-200 rounded-lg text-xs"
                  />
                  <span className="text-stone-400">credits</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>Photo Analysis Cost:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={creditSettings.imageAnalysisCost}
                    onChange={(e) =>
                      setCreditSettings({ ...creditSettings, imageAnalysisCost: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-right font-mono font-bold bg-white border border-stone-200 rounded-lg text-xs"
                  />
                  <span className="text-stone-400">credits</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>Room Scan 360° Cost:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={creditSettings.roomScanCost}
                    onChange={(e) =>
                      setCreditSettings({ ...creditSettings, roomScanCost: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-right font-mono font-bold bg-white border border-stone-200 rounded-lg text-xs"
                  />
                  <span className="text-stone-400">credits</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>Complete Home Audit Cost:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={creditSettings.completeHomeScanCost}
                    onChange={(e) =>
                      setCreditSettings({ ...creditSettings, completeHomeScanCost: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-right font-mono font-bold bg-white border border-stone-200 rounded-lg text-xs"
                  />
                  <span className="text-stone-400">credits</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>PDF Report Export Cost:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={creditSettings.pdfReportCost}
                    onChange={(e) =>
                      setCreditSettings({ ...creditSettings, pdfReportCost: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-right font-mono font-bold bg-white border border-stone-200 rounded-lg text-xs"
                  />
                  <span className="text-stone-400">credits</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
              <div className="text-xs font-bold text-amber-950">Free User Welcome Allowances</div>
              
              <div className="flex items-center justify-between text-xs">
                <span>Free Chat Minutes (New User):</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={creditSettings.newUserFreeChatMinutes}
                    onChange={(e) =>
                      setCreditSettings({ ...creditSettings, newUserFreeChatMinutes: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-right font-mono font-bold bg-white border border-stone-200 rounded-lg text-xs"
                  />
                  <span className="text-amber-800">mins</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>Free Photo Analyses (New User):</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={creditSettings.newUserFreePhotos}
                    onChange={(e) =>
                      setCreditSettings({ ...creditSettings, newUserFreePhotos: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-right font-mono font-bold bg-white border border-stone-200 rounded-lg text-xs"
                  />
                  <span className="text-amber-800">photos</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>Pro Plan Monthly Credits:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={creditSettings.proCreditsPerMonth}
                    onChange={(e) =>
                      setCreditSettings({ ...creditSettings, proCreditsPerMonth: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-right font-mono font-bold bg-white border border-stone-200 rounded-lg text-xs"
                  />
                  <span className="text-amber-800">credits</span>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                <span className="text-stone-700">Pro Credits Monthly Rollover:</span>
                <label className="flex items-center gap-1 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={creditSettings.proCreditsRollover}
                    onChange={(e) =>
                      setCreditSettings({ ...creditSettings, proCreditsRollover: e.target.checked })
                    }
                    className="rounded text-amber-600"
                  />
                  <span>Enabled</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
            {creditSaveSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Credit economics saved and applied live!
              </span>
            )}
            <div className="ml-auto">
              <button
                type="button"
                onClick={handleSaveCreditSettings}
                disabled={savingCredits}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>{savingCredits ? 'Saving...' : 'Save Credit Economics'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Live Credit Ledger & Audit Log */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-base font-black text-stone-900">Global Credit Ledger & Audit Trail</h3>
              <p className="text-xs text-stone-500">
                Immutable record of every credit grant, deduction, rewarded ad view, and refund across the platform.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchLedger}
                className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold flex items-center gap-1"
                title="Refresh Ledger"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ledgerLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => adminService.downloadExport('credit-ledger').catch(() => {})}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <input
              type="text"
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              placeholder="Search by User ID, Name, or Reason..."
              className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs flex-1 min-w-0 w-full sm:w-auto sm:min-w-[200px]"
            />

            <select
              value={ledgerFilter}
              onChange={(e) => setLedgerFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-700"
            >
              <option value="ALL">All Transaction Types</option>
              <option value="REWARDED_AD">Rewarded Ad (+)</option>
              <option value="AI_CHAT">AI Chat (-)</option>
              <option value="IMAGE_ANALYSIS">Photo Analysis (-)</option>
              <option value="SUBSCRIPTION">Subscription (+)</option>
              <option value="ADMIN_ADJUSTMENT">Admin Adjustment</option>
              <option value="REFUND">Refund (+)</option>
            </select>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-50 text-stone-500 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Balance</th>
                  <th className="p-3">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-stone-400">
                      No ledger transactions found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((rec) => {
                    const isCredit = rec.amount > 0;
                    return (
                      <tr key={rec.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="p-3 whitespace-nowrap text-stone-400 font-mono text-[11px]">
                          {new Date(rec.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-stone-900">{rec.userName || 'Anonymous'}</div>
                          <div className="text-[10px] text-stone-400 font-mono">{rec.userId}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              rec.type === 'REWARDED_AD'
                                ? 'bg-amber-100 text-amber-900'
                                : rec.type === 'SUBSCRIPTION'
                                ? 'bg-emerald-100 text-emerald-900'
                                : rec.type === 'ADMIN_ADJUSTMENT'
                                ? 'bg-purple-100 text-purple-900'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {rec.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-mono font-black ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isCredit ? `+${rec.amount}` : rec.amount}
                        </td>
                        <td className="p-3 text-right font-mono text-stone-600 font-bold">
                          {rec.balanceAfter} Cr
                        </td>
                        <td className="p-3 text-stone-600 text-[11px] max-w-xs truncate">
                          {rec.reason}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Manual Credit Adjustment */}
      {activeSubTab === 'adjust' && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-6 max-w-2xl">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-600" />
              <span>Administrative Credit Grant & Revocation</span>
            </h3>
            <p className="text-xs text-stone-500">
              Grant compensation credits to resolve a user complaint, reward a loyal tester, or manually correct a balance.
            </p>
          </div>

          <form onSubmit={handleAdjustCredits} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-stone-800 block">Target User ID:</label>
              <input
                type="text"
                value={adjustUserId}
                onChange={(e) => setAdjustUserId(e.target.value)}
                placeholder="e.g. usr_default or user uuid"
                required
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-stone-800 block">Credit Delta (+ to add, - to deduct):</label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-xs"
              />
              <span className="text-[11px] text-stone-400">Use positive numbers (+10) to grant credits, negative (-5) to revoke.</span>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-stone-800 block">Audit Reason / Justification:</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                required
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            {adjustResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold ${
                  adjustResult.startsWith('Success')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {adjustResult}
              </div>
            )}

            <button
              type="submit"
              disabled={adjustLoading}
              className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {adjustLoading ? 'Processing Adjustment...' : 'Apply Credit Adjustment'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
