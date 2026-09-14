import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  CreditCard,
  Gift,
} from 'lucide-react';
import { creditService } from '../services/creditService';
import { UserCreditAccount } from '../types';
import { authService } from '../services/authService';

interface StandaloneCheckoutPageProps {
  onBackToApp: () => void;
}

export const StandaloneCheckoutPage: React.FC<StandaloneCheckoutPageProps> = ({ onBackToApp }) => {
  const [planId, setPlanId] = useState<'pro' | 'expert'>('pro');
  const [account, setAccount] = useState<UserCreditAccount | null>(null);
  const [orderData, setOrderData] = useState<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    planName: string;
  } | null>(null);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating_order' | 'ready' | 'processing' | 'success' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedSub, setVerifiedSub] = useState<any>(null);

  // Read URL query params on mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPlan = urlParams.get('plan') || urlParams.get('planId');
      if (urlPlan === 'expert') {
        setPlanId('expert');
      } else {
        setPlanId('pro');
      }
      const urlCoupon = urlParams.get('coupon') || urlParams.get('couponCode');
      if (urlCoupon) {
        setCouponCode(urlCoupon.toUpperCase());
      }
    } catch {
      // Ignore URL parsing errors
    }

    // Load user credit data
    creditService
      .fetchCredits()
      .then((data) => setAccount(data?.account || (data as any)))
      .catch((err) => console.warn('[StandaloneCheckout] Failed to load credits:', err));

    // Preload Razorpay SDK script
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        return resolve(true);
      }
      const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('[StandaloneCheckout] Failed to load Razorpay SDK');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const planInfo = planId === 'expert'
    ? {
        name: 'Home Expert Plan',
        price: 299,
        credits: 'Unlimited* Fair-Use',
        features: [
          'Unlimited* Vedic Vastu Queries',
          'Whole-Home Multi-Room Audit',
          'Downloadable PDF Architectural Dossier',
          'Vedic Non-Structural Remedies (Color, Crystals, Elements)',
          '100% Ad-Free Experience',
        ],
      }
    : {
        name: 'Pro Advisor Plan',
        price: 99,
        credits: '25 AI Credits',
        features: [
          '25 AI Consultation Credits (Allocated Instantly)',
          'Full Multimodal Room Photo Analysis',
          'Non-Structural Vastu Remedies (No Demolition Needed)',
          'High-Precision Compass Guidance',
          'Priority AI Response Speed',
        ],
      };

  const discountPercent = appliedCoupon?.discountPercent || 0;
  const finalPrice = discountPercent > 0
    ? Math.max(0, Math.round(planInfo.price * (1 - discountPercent / 100)))
    : planInfo.price;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), planId }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.coupon) {
        const pct = data.coupon.discountPercent ?? data.coupon.discountPercentage ?? data.coupon.discountAmount ?? 20;
        setAppliedCoupon({
          code: data.coupon.code || couponCode.toUpperCase(),
          discountPercent: pct,
        });
        setCouponError(null);
      } else {
        setCouponError(data.message || 'Invalid or expired coupon code.');
      }
    } catch {
      setCouponError('Failed to validate coupon. Please check connection.');
    }
  };

  const handleLaunchPayment = useCallback(async () => {
    setErrorMessage(null);
    setStatus('creating_order');
    setStatusMessage('Generating secure Razorpay order...');

    const sdkLoaded = await loadRazorpayScript();
    if (!sdkLoaded || !(window as any).Razorpay) {
      setStatus('failed');
      setErrorMessage('Razorpay SDK failed to load. Please check your internet connection.');
      return;
    }

    try {
      const orderRes = await creditService.createPaymentOrder(
        planId,
        appliedCoupon?.code || couponCode.trim() || undefined
      );

      if (!orderRes.success || !orderRes.orderId || !orderRes.keyId) {
        setStatus('failed');
        setErrorMessage(orderRes.message || orderRes.error || 'Failed to create payment order.');
        return;
      }

      setOrderData({
        orderId: orderRes.orderId,
        amount: orderRes.amount || finalPrice * 100,
        currency: orderRes.currency || 'INR',
        keyId: orderRes.keyId,
        planName: orderRes.planName || planInfo.name,
      });

      setStatus('ready');
      setStatusMessage('Opening Razorpay Checkout...');

      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: 'VastuVision AI',
        description: `${planInfo.name} Subscription`,
        order_id: orderRes.orderId,
        handler: async (response: any) => {
          console.log('[StandaloneCheckout] Payment response received from Razorpay:', response);
          setStatus('processing');
          setStatusMessage('Verifying cryptographic payment signature with server...');

          try {
            const verifyRes = await creditService.verifyPayment({
              orderId: response.razorpay_order_id || orderRes.orderId!,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              console.log('[StandaloneCheckout] Payment verified successfully on server!');
              setStatus('success');
              setStatusMessage('Payment verified! Plan activated.');
              setVerifiedSub(verifyRes);

              // Broadcast update so open app tabs reload credit balance
              try {
                localStorage.setItem('vastuvision_payment_completed', Date.now().toString());
              } catch {
                // Ignore storage error
              }

              // Fetch updated account state
              creditService.fetchCredits().then((data) => setAccount(data?.account || (data as any)));
            } else {
              setStatus('failed');
              setErrorMessage(
                verifyRes.message ||
                verifyRes.error ||
                'Cryptographic verification failed. Your card was not charged.'
              );
            }
          } catch (vErr: any) {
            console.error('[StandaloneCheckout] Verification error:', vErr);
            setStatus('failed');
            setErrorMessage(vErr.message || 'Payment verification failed on server.');
          }
        },
        prefill: {
          name: account?.userName || 'Vastu Homeowner',
          email: account?.userEmail || 'user@vastuvision.ai',
          contact: account?.mobile || '9999999999',
        },
        notes: {
          planId,
          planName: planInfo.name,
        },
        theme: {
          color: '#0F766E',
        },
        modal: {
          ondismiss: () => {
            console.log('[StandaloneCheckout] Razorpay modal dismissed by user');
            if (status !== 'success') {
              setStatus('idle');
              setStatusMessage('');
            }
          },
          escape: true,
          backdropclose: false,
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        console.error('[StandaloneCheckout] Payment failed callback:', resp);
        setStatus('failed');
        setErrorMessage(
          resp.error?.description ||
          resp.error?.reason ||
          'Payment declined or cancelled by bank.'
        );
      });

      // Synchronous open
      rzp.open();
    } catch (err: any) {
      console.error('[StandaloneCheckout] Execution error:', err);
      setStatus('failed');
      setErrorMessage(err.message || 'Payment gateway failed to launch.');
    }
  }, [planId, appliedCoupon, couponCode, finalPrice, planInfo.name, account, status]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4 sm:p-6 antialiased">
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToApp}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to App</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
              Razorpay Secure Checkout
            </span>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10 mb-1">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            VastuVision AI Subscription
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto">
            Authentic Vedic architectural guidance backed by computational intelligence
          </p>
        </div>

        {/* Success State Celebration Screen */}
        {status === 'success' ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-stone-900 border border-emerald-500/40 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                Cryptographically Verified
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Payment Successful!
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto">
                Welcome to the <strong className="text-amber-400">{planInfo.name}</strong>.
                {planId === 'pro' && ' 25 AI Consultation Credits have been allocated to your account.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-left space-y-2 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Plan</span>
                <span className="font-bold text-white">{planInfo.name}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Amount Paid</span>
                <span className="font-bold text-emerald-400">₹{finalPrice} INR</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Status</span>
                <span className="font-bold text-emerald-400 uppercase">Active (30 Days)</span>
              </div>
              {orderData?.orderId && (
                <div className="flex justify-between text-stone-500 font-mono text-[10px] pt-1 border-t border-stone-800">
                  <span>Order ID</span>
                  <span>{orderData.orderId}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onBackToApp}
              className="w-full py-3.5 px-6 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 fill-stone-950" />
              <span>Enter VastuVision AI Dashboard</span>
            </button>
          </div>
        ) : (
          /* Checkout Card */
          <div className="p-5 sm:p-7 rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl space-y-6">
            {/* Plan Selector Pills */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-950 rounded-2xl border border-stone-800">
              <button
                type="button"
                onClick={() => setPlanId('pro')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  planId === 'pro'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="whitespace-nowrap">PRO Plan (₹99)</span>
              </button>
              <button
                type="button"
                onClick={() => setPlanId('expert')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  planId === 'expert'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">HOME EXPERT (₹299)</span>
              </button>
            </div>

            {/* Test Mode Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1 min-w-0">
                <span className="font-bold block text-amber-200">Razorpay Test Mode Active</span>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  You are testing in Sandbox Mode. No real money will be charged. Use test UPI or card{' '}
                  <code className="font-mono bg-stone-950/60 px-1 py-0.5 rounded text-white">4111 1111 1111 1111</code>.
                </p>
              </div>
            </div>

            {/* Plan Details & Pricing */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
              <div className="flex items-baseline justify-between border-b border-stone-800/80 pb-3">
                <div>
                  <span className="text-xs uppercase font-bold text-amber-400 block">Selected Tier</span>
                  <h3 className="text-lg font-black text-white">{planInfo.name}</h3>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1.5 justify-end">
                    {discountPercent > 0 && (
                      <span className="text-xs line-through text-stone-500">₹{planInfo.price}</span>
                    )}
                    <span className="text-2xl sm:text-3xl font-black text-white">₹{finalPrice}</span>
                    <span className="text-xs text-stone-400">/ mo</span>
                  </div>
                  {discountPercent > 0 && (
                    <span className="text-[10px] font-bold text-emerald-400 block">
                      {discountPercent}% Discount Applied
                    </span>
                  )}
                </div>
              </div>

              {/* Features List */}
              <ul className="space-y-2 text-xs text-stone-300">
                {planInfo.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Promo Code (e.g. VASTU20)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs font-mono uppercase text-white placeholder-stone-500 focus:outline-hidden focus:border-amber-500 min-w-0"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-w-[76px] text-center"
                >
                  Apply
                </button>
              </div>
              {couponError && (
                <p className="text-xs text-rose-400 px-1 font-medium">{couponError}</p>
              )}
              {appliedCoupon && (
                <div className="flex items-center justify-between text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                  <span>Coupon {appliedCoupon.code} applied! {appliedCoupon.discountPercent}% off</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode('');
                    }}
                    className="text-stone-400 hover:text-rose-400 underline text-[11px] cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1 min-w-0">
                  <span className="font-bold text-rose-200 block">Payment Error</span>
                  <p className="text-[11px] leading-relaxed break-words">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Primary Action Button: User-Gesture Safe */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={status === 'creating_order' || status === 'processing'}
                onClick={handleLaunchPayment}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:brightness-95 text-stone-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {status === 'creating_order'
                    ? 'Creating Secure Order...'
                    : status === 'processing'
                    ? 'Verifying Payment...'
                    : `Pay ₹${finalPrice} via Razorpay`}
                </span>
              </button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-bit SSL Encrypted • Direct Bank/UPI via Razorpay</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center text-xs text-stone-500 space-y-1">
          <p>© VastuVision AI. Indian Architectural Intelligence.</p>
          <p className="text-[10px]">Razorpay Payment Gateway Integration with Backend Cryptographic Verification</p>
        </div>
      </div>
    </div>
  );
};
