import React, { useState, useEffect, useRef } from 'react';
import {
  Crown,
  Sparkles,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  ShieldCheck,
  X,
  CreditCard,
  Gift,
  ArrowRight,
  TrendingUp,
  FileText,
  RefreshCw,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { creditService, CreditStateResponse } from '../services/creditService';
import { useAppConfig } from '../context/AppConfigContext';
import { UserCreditAccount, PlanConfig, CreditLedgerRecord } from '../types';

interface MonetizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'plans' | 'packs' | 'ledger';
  highlightAction?: string; // e.g. 'ai_chat' or 'photo_analysis'
}

export const MonetizationModal: React.FC<MonetizationModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'plans',
  highlightAction,
}) => {
  const { config } = useAppConfig();
  const [activeTab, setActiveTab] = useState<'plans' | 'packs' | 'ledger'>(defaultTab === 'ads' as any ? 'packs' : defaultTab);
  const [creditData, setCreditData] = useState<CreditStateResponse | null>(null);
  const account = creditData?.account;
  const [ledger, setLedger] = useState<CreditLedgerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    percent: number;
    discountPercent?: number;
    discountPercentage?: number;
    type?: 'percentage' | 'fixed';
    amount?: number;
    applicablePlan?: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Subscribing state & Explicit Payment Transition States
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'creating_order' | 'opening_gateway' | 'processing_payment' | 'waiting_new_tab' | 'failed' | 'cancelled' | 'success'
  >('idle');
  const [paymentStatusText, setPaymentStatusText] = useState<string | null>(null);
  const [lastSelectedPlanId, setLastSelectedPlanId] = useState<'pro' | 'expert' | null>(null);
  const [preparedOrder, setPreparedOrder] = useState<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    planId: 'pro' | 'expert';
    planName: string;
  } | null>(null);
  const activeRzpRef = useRef<any>(null);
  const paymentStatusRef = useRef<string>('idle');
  const gatewayWatchdogRef = useRef<any>(null);
  const accountRef = useRef(account);
  accountRef.current = account;
  const initialPlanRef = useRef<string | undefined>(account?.plan);
  const initialCreditsRef = useRef<number>(account?.creditsBalance ?? 0);
  const activeOrderIdRef = useRef<string | null>(null);
  const pollingTimerRef = useRef<any>(null);
  const preparedOrderRef = useRef(preparedOrder);
  preparedOrderRef.current = preparedOrder;

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const handlePaymentSuccess = async (planName?: string) => {
    stopPolling();
    clearGatewayWatchdog();
    destroyPreviousRazorpayInstance();
    setActionError(null);
    setPaymentStatus('success');
    setPaymentStatusText('Payment success');
    const displayPlan = planName || (lastSelectedPlanId === 'expert' ? 'Home Expert' : 'Pro Advisor');
    setActionSuccess(`Payment successful! Welcome to the ${displayPlan} plan. Your credits have been added.`);
    setPreparedOrder(null);
    setIsSubscribing(null);
    activeOrderIdRef.current = null;
    await loadCreditData();
    creditService.fetchCredits().catch(() => {});
  };

  const startPollingOrderStatus = (orderId?: string, planId?: 'pro' | 'expert') => {
    stopPolling();
    if (orderId) {
      activeOrderIdRef.current = orderId;
    }
    let pollCount = 0;
    const maxPolls = 120; // 5 minutes at 2.5s interval

    pollingTimerRef.current = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        stopPolling();
        return;
      }

      // Check order status on server if we have an order ID
      const curOrderId = activeOrderIdRef.current || preparedOrderRef.current?.orderId;
      if (curOrderId) {
        try {
          const res = await creditService.checkOrderStatus(curOrderId);
          if (res.paid) {
            handlePaymentSuccess(res.planName || (planId === 'expert' ? 'Home Expert' : 'Pro Advisor'));
            return;
          }
        } catch {}
      }

      // Check credit balance & plan upgrade in background
      try {
        const fresh = await creditService.fetchCredits();
        const freshAcc = fresh?.account;
        if (freshAcc) {
          const planUpgraded =
            (freshAcc.plan === 'pro' || freshAcc.plan === 'expert') &&
            (initialPlanRef.current === 'free' ||
              (initialPlanRef.current === 'pro' && freshAcc.plan === 'expert'));
          const creditsAdded = freshAcc.creditsBalance > initialCreditsRef.current;
          if (planUpgraded || creditsAdded) {
            handlePaymentSuccess(freshAcc.plan === 'expert' ? 'Home Expert' : 'Pro Advisor');
          }
        }
      } catch {}
    }, 2500);
  };

  // Synchronize payment completion across tabs/windows and mobile app switches
  useEffect(() => {
    // 1. BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('vastuvision_payment_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'VASTU_PAYMENT_SUCCESS') {
          console.log('[MonetizationModal] Received cross-tab payment event via BroadcastChannel:', event.data);
          handlePaymentSuccess(event.data?.planName);
        }
      };
    } catch {}

    // 2. LocalStorage event listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'vastuvision_payment_completed') {
        console.log('[MonetizationModal] Received payment completion via localStorage event');
        let planName: string | undefined;
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            planName = parsed?.planName;
          }
        } catch {}
        handlePaymentSuccess(planName);
      }
    };

    // 3. PostMessage listener (from popup or standalone tab)
    const handleWindowMessage = (e: MessageEvent) => {
      if (e.data?.type === 'VASTU_PAYMENT_SUCCESS') {
        console.log('[MonetizationModal] Received window message payment success:', e.data);
        handlePaymentSuccess(e.data?.planName);
      }
    };

    // 4. Tab visibility, focus, and pageshow listener (critical for Chrome on Android)
    const handleVisibilityOrFocus = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && paymentStatusRef.current !== 'success') {
        const curOrderId = activeOrderIdRef.current || preparedOrderRef.current?.orderId;
        if (curOrderId) {
          try {
            const res = await creditService.checkOrderStatus(curOrderId);
            if (res.paid) {
              handlePaymentSuccess(res.planName);
              return;
            }
          } catch {}
        }

        try {
          const fresh = await creditService.fetchCredits();
          const freshAcc = fresh?.account;
          if (freshAcc && accountRef.current) {
            const planUpgraded =
              (freshAcc.plan === 'pro' || freshAcc.plan === 'expert') &&
              (accountRef.current.plan === 'free' ||
                (accountRef.current.plan === 'pro' && freshAcc.plan === 'expert'));
            const creditsIncreased = freshAcc.creditsBalance > accountRef.current.creditsBalance;
            if (planUpgraded || creditsIncreased) {
              handlePaymentSuccess(freshAcc.plan === 'expert' ? 'Home Expert' : 'Pro Advisor');
            }
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('message', handleWindowMessage);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('message', handleWindowMessage);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
      stopPolling();
    };
  }, []);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (isOpen) {
      loadRazorpayScript().catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    paymentStatusRef.current = paymentStatus;
  }, [paymentStatus]);

  const clearGatewayWatchdog = () => {
    if (gatewayWatchdogRef.current) {
      clearTimeout(gatewayWatchdogRef.current);
      gatewayWatchdogRef.current = null;
    }
  };

  const destroyPreviousRazorpayInstance = () => {
    clearGatewayWatchdog();

    // 1. Close and nullify the current Razorpay instance
    if (activeRzpRef.current) {
      try {
        if (typeof activeRzpRef.current.close === 'function') {
          activeRzpRef.current.close();
        }
      } catch (err) {
        console.warn('[MonetizationModal] Error closing previous Razorpay instance:', err);
      }
      activeRzpRef.current = null;
    }

    // 2. Hide container if currently not in use - NEVER remove .razorpay-container from the DOM!
    // Razorpay SDK binds kt.container to document.body on script initialization.
    // Removing .razorpay-container causes Razorpay to mount its checkout iframe to an orphaned DOM node.
    // In all browsers (including Android Chrome), an iframe detached from document.body has contentWindow === null,
    // which directly triggers Razorpay's alert: "This browser is not supported. Please try payment in another browser."
    try {
      const container = document.querySelector('.razorpay-container') as HTMLElement | null;
      if (container && !activeRzpRef.current) {
        container.style.display = 'none';
      }

      // 3. Reset document body styles that Razorpay might have altered
      if (document.body && document.body.style) {
        if (document.body.style.pointerEvents === 'none') {
          document.body.style.pointerEvents = 'auto';
        }
        if (document.body.style.overflow === 'hidden' && !activeRzpRef.current) {
          document.body.style.overflow = '';
        }
      }
    } catch (err) {
      console.warn('[MonetizationModal] Error resetting Razorpay styles:', err);
    }
  };

  const cleanupRazorpayInstance = destroyPreviousRazorpayInstance;

  const handleRetryPayment = (planId?: 'pro' | 'expert') => {
    const targetPlan = planId || lastSelectedPlanId || 'pro';
    // Ensure previous instance of Razorpay modal is properly destroyed before creating a new one
    destroyPreviousRazorpayInstance();
    setActionError(null);
    setPaymentStatus('idle');
    setPaymentStatusText(null);
    handleSubscribe(targetPlan);
  };

  const openCheckoutInNewTab = (planId: 'pro' | 'expert' = 'pro', orderId?: string) => {
    const targetOrderId = orderId || preparedOrder?.orderId;
    const couponParam = appliedDiscount?.code ? `&coupon=${encodeURIComponent(appliedDiscount.code)}` : '';
    const orderParam = targetOrderId ? `&orderId=${encodeURIComponent(targetOrderId)}` : '';
    const checkoutUrl = `/checkout?planId=${planId}${couponParam}${orderParam}`;

    // Requirements 12 & 13:
    // When the user chooses "Open Checkout in New Tab", clear watchdog and remove any blocked error
    clearGatewayWatchdog();
    setActionError(null);
    setPaymentStatus('waiting_new_tab');
    setPaymentStatusText('Checkout Active in New Tab');
    setIsSubscribing(null);

    // Save baseline plan and credits for change detection
    initialPlanRef.current = account?.plan;
    initialCreditsRef.current = account?.creditsBalance ?? 0;
    if (targetOrderId) {
      activeOrderIdRef.current = targetOrderId;
    }

    startPollingOrderStatus(targetOrderId, planId);

    try {
      const opened = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        window.location.href = checkoutUrl;
      }
    } catch {
      window.location.href = checkoutUrl;
    }
  };

  const triggerDirectUserGestureCheckout = (order: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    planId: 'pro' | 'expert';
    planName: string;
  }) => {
    setActionError(null);
    setPaymentStatus('opening_gateway');
    setPaymentStatusText('Opening gateway...');
    setIsSubscribing(order.planId);

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'VastuVision AI',
      description: `${order.planName} Subscription`,
      order_id: order.orderId,
      handler: async (response: any) => {
        clearGatewayWatchdog();
        try {
          setPaymentStatus('processing_payment');
          setPaymentStatusText('Processing payment...');
          const verifyRes = await creditService.verifyPayment({
            orderId: response.razorpay_order_id || order.orderId,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });

          if (verifyRes.success) {
            await handlePaymentSuccess(order.planName);
          } else {
            setPaymentStatus('failed');
            setPaymentStatusText('Payment failed');
            setActionError(verifyRes.message || verifyRes.error || 'Cryptographic payment verification failed on server.');
          }
        } catch (vErr: any) {
          setPaymentStatus('failed');
          setPaymentStatusText('Payment failed');
          setActionError(vErr.message || 'Cryptographic payment verification failed.');
        } finally {
          setIsSubscribing(null);
          cleanupRazorpayInstance();
        }
      },
      prefill: {
        name: account?.userName || 'Vastu Homeowner',
        email: account?.userEmail && account.userEmail.includes('@') ? account.userEmail : undefined,
        contact: account?.mobile && /^[6-9]\d{9}$/.test(account.mobile) ? account.mobile : undefined,
      },
      notes: {
        planId: order.planId,
        planName: order.planName,
      },
      theme: {
        color: '#0F766E',
      },
      modal: {
        ondismiss: () => {
          clearGatewayWatchdog();
          setPaymentStatus('cancelled');
          setPaymentStatusText('Payment cancelled');
          setIsSubscribing(null);
          cleanupRazorpayInstance();
        },
        escape: true,
        backdropclose: false,
      },
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      activeRzpRef.current = rzp;
      rzp.on('payment.failed', (resp: any) => {
        clearGatewayWatchdog();
        setPaymentStatus('failed');
        setPaymentStatusText('Payment failed');
        setIsSubscribing(null);
        setActionError(resp.error?.description || 'Payment failed or was declined by the bank.');
        cleanupRazorpayInstance();
      });
      rzp.open();
    } catch (e: any) {
      console.error('[MonetizationModal] Direct checkout open error:', e);
      setPaymentStatus('failed');
      setActionError(`Checkout failed to open: ${e.message || 'Please use Open in New Tab'}`);
    }
  };

  useEffect(() => {
    return () => {
      destroyPreviousRazorpayInstance();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCreditData();
      setActiveTab(defaultTab);
      setActionError(null);
      setActionSuccess(null);
      setPaymentStatus('idle');
      setPaymentStatusText(null);
      // Preload Razorpay script silently to optimize subsequent checkout initiation
      loadRazorpayScript().catch(() => {});
    } else {
      destroyPreviousRazorpayInstance();
    }
  }, [isOpen, defaultTab]);

  const loadCreditData = async () => {
    setIsLoading(true);
    try {
      const data = await creditService.fetchCredits();
      setCreditData(data);
      if (activeTab === 'ledger') {
        const history = await creditService.fetchLedger();
        setLedger(history);
      }
    } catch (err: any) {
      console.error('Failed to load credit details', err);
      setActionError(err.message || 'Unable to retrieve credit balance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCoupon = async (planId?: string) => {
    const trimmed = couponCode.trim().toUpperCase();
    if (!trimmed) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setCouponError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, planId }),
      });
      const data = await res.json();
      if (data.valid && data.coupon) {
        const c = data.coupon;
        const discountType = c.discountType || 'percentage';

        // Extract discount across all potential field aliases: discountPercent, discountPercentage, percentage, discountAmount, discount
        const rawPercent =
          c.discountPercent ??
          c.discountPercentage ??
          c.percentage ??
          (discountType === 'percentage' ? c.discountAmount ?? c.discount : undefined);

        const parsedPercent = Number(rawPercent);

        if (discountType === 'percentage') {
          if (isNaN(parsedPercent) || parsedPercent <= 0 || parsedPercent > 100) {
            setAppliedDiscount(null);
            setCouponError('Coupon has an invalid or missing discount value.');
            return;
          }

          const validPercent = Math.min(100, Math.max(1, Math.round(parsedPercent)));
          setAppliedDiscount({
            code: c.code,
            percent: validPercent,
            discountPercent: validPercent,
            discountPercentage: validPercent,
            type: 'percentage',
            amount: validPercent,
            applicablePlan: c.applicablePlan || 'all',
          });
          setActionSuccess(`Coupon ${c.code} applied! ${validPercent}% off`);
        } else {
          // Fixed discount
          const rawAmount = Number(c.discountAmount ?? c.discount);
          if (isNaN(rawAmount) || rawAmount <= 0) {
            setAppliedDiscount(null);
            setCouponError('Coupon has an invalid or missing discount value.');
            return;
          }
          const validAmount = Math.max(1, Math.round(rawAmount));
          setAppliedDiscount({
            code: c.code,
            percent: 0,
            discountPercent: 0,
            discountPercentage: 0,
            type: 'fixed',
            amount: validAmount,
            applicablePlan: c.applicablePlan || 'all',
          });
          setActionSuccess(`Coupon ${c.code} applied! ₹${validAmount} flat off`);
        }
      } else {
        setAppliedDiscount(null);
        setCouponError(data.error || 'Invalid or expired coupon code');
      }
    } catch (err: any) {
      setAppliedDiscount(null);
      setCouponError('Failed to validate coupon. Please try again.');
    }
  };

  const loadRazorpayScript = (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const hasRzp = typeof (window as any).Razorpay === 'function';
      const hasContainer = typeof document !== 'undefined' && Boolean(document.querySelector('.razorpay-container'));

      if (hasRzp && hasContainer) {
        resolve({ success: true });
        return;
      }

      let timedOut = false;
      const timeoutTimer = setTimeout(() => {
        timedOut = true;
        resolve({
          success: false,
          error:
            'Payment SDK Initialization Timeout: Razorpay checkout script took too long to load (>10s). Please check your internet connection or ad-blocker.',
        });
      }, 10000);

      const injectFreshScript = () => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
          if (timedOut) return;
          clearTimeout(timeoutTimer);
          if (typeof (window as any).Razorpay === 'function') {
            resolve({ success: true });
          } else {
            setTimeout(() => {
              if (typeof (window as any).Razorpay === 'function') {
                resolve({ success: true });
              } else {
                resolve({
                  success: false,
                  error:
                    'Payment SDK Initialization Failed: Razorpay checkout constructor was not found after script loaded.',
                });
              }
            }, 250);
          }
        };
        script.onerror = () => {
          if (timedOut) return;
          clearTimeout(timeoutTimer);
          try {
            script.remove();
          } catch {
            // ignore
          }
          resolve({
            success: false,
            error:
              'Payment SDK Network Error: Failed to load Razorpay checkout script (blocked by network, ad-blocker, or firewall).',
          });
        };
        document.body.appendChild(script);
      };

      // Check if checkout.js script already exists in document
      const existingScript = document.querySelector('script[src*="checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript && hasContainer) {
        let checkAttempts = 0;
        const interval = setInterval(() => {
          if (timedOut) {
            clearInterval(interval);
            return;
          }
          checkAttempts++;
          if (typeof (window as any).Razorpay === 'function') {
            clearTimeout(timeoutTimer);
            clearInterval(interval);
            resolve({ success: true });
          } else if (checkAttempts > 20) {
            clearInterval(interval);
            // Stale script tag present but Razorpay constructor missing; purge and reinject
            try {
              existingScript.remove();
            } catch {
              // ignore
            }
            injectFreshScript();
          }
        }, 120);
        return;
      }

      // If existing script tag exists but container was missing/detached, purge stale script tag and inject fresh
      if (existingScript && !hasContainer) {
        try {
          existingScript.remove();
        } catch {
          // ignore
        }
      }

      injectFreshScript();
    });
  };

  const handleSubscribe = async (planId: 'pro' | 'expert') => {
    // Prevent duplicate checkout instances
    if (
      isSubscribing ||
      paymentStatus === 'creating_order' ||
      paymentStatus === 'opening_gateway' ||
      paymentStatus === 'processing_payment'
    ) {
      return;
    }

    cleanupRazorpayInstance();

    setIsSubscribing(planId);
    setLastSelectedPlanId(planId);
    setPaymentStatus('creating_order');
    setPaymentStatusText('Creating order...');
    setActionError(null);
    setActionSuccess(null);

    try {
      // 1. Request authoritative server order
      const orderResult = await creditService.createPaymentOrder(
        planId,
        appliedDiscount ? appliedDiscount.code : undefined
      );

      if (!orderResult.success || !orderResult.orderId) {
        setPaymentStatus('failed');
        setPaymentStatusText('Payment failed');
        setIsSubscribing(null);
        setActionError(orderResult.message || orderResult.error || 'Failed to create payment order on server.');
        return;
      }

      if (!orderResult.keyId) {
        setPaymentStatus('failed');
        setPaymentStatusText('Payment failed');
        setIsSubscribing(null);
        setActionError('Razorpay Key ID was not returned by the server. Please verify payment configuration.');
        return;
      }

      // 2. Load official Razorpay Checkout SDK & transition to Opening gateway...
      setPaymentStatus('opening_gateway');
      setPaymentStatusText('Opening gateway...');

      const scriptResult = await loadRazorpayScript();
      if (!scriptResult.success || typeof (window as any).Razorpay !== 'function') {
        setPaymentStatus('failed');
        setPaymentStatusText('Payment failed');
        setIsSubscribing(null);
        setActionError(
          scriptResult.error ||
            'Payment SDK Initialization Failed: Could not load Razorpay Checkout SDK. Please check your network connection or ad-blocker.'
        );
        return;
      }

      // 3. Amount verification (in paise)
      // ₹99 = 9900 paise, ₹299 = 29900 paise
      const amountInPaise =
        orderResult.amount && orderResult.amount >= 100
          ? Math.round(orderResult.amount)
          : planId === 'expert'
          ? 29900
          : 9900;

      const planDisplayName = orderResult.planName || (planId === 'expert' ? 'Home Expert Suite' : 'Pro Advisor');

      const prepared = {
        orderId: orderResult.orderId,
        amount: amountInPaise,
        currency: orderResult.currency || 'INR',
        keyId: orderResult.keyId,
        planId,
        planName: planDisplayName,
      };
      setPreparedOrder(prepared);

      const options = {
        key: orderResult.keyId,
        amount: amountInPaise,
        currency: orderResult.currency || 'INR',
        name: 'VastuVision AI',
        description: `${planDisplayName} Subscription`,
        order_id: orderResult.orderId,
        handler: async (response: any) => {
          clearGatewayWatchdog();
          try {
            // Explicit transition to Processing payment...
            setPaymentStatus('processing_payment');
            setPaymentStatusText('Processing payment...');
            const verifyRes = await creditService.verifyPayment({
              orderId: response.razorpay_order_id || orderResult.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              await handlePaymentSuccess(planDisplayName);
            } else {
              setPaymentStatus('failed');
              setPaymentStatusText('Payment failed');
              setActionError(verifyRes.message || verifyRes.error || 'Cryptographic payment verification failed on server.');
            }
          } catch (vErr: any) {
            setPaymentStatus('failed');
            setPaymentStatusText('Payment failed');
            setActionError(vErr.message || 'Cryptographic payment verification failed.');
          } finally {
            setIsSubscribing(null);
            cleanupRazorpayInstance();
          }
        },
        prefill: {
          name: account?.userName || 'Vastu Homeowner',
          email: account?.userEmail && account.userEmail.includes('@') ? account.userEmail : undefined,
          contact: account?.mobile && /^[6-9]\d{9}$/.test(account.mobile) ? account.mobile : undefined,
        },
        notes: {
          planId,
          planName: planDisplayName,
        },
        theme: {
          color: '#0F766E', // Vedic Emerald / Teal
        },
        modal: {
          ondismiss: () => {
            clearGatewayWatchdog();
            setPaymentStatus('cancelled');
            setPaymentStatusText('Payment cancelled');
            setIsSubscribing(null);
            cleanupRazorpayInstance();
          },
          escape: true,
          backdropclose: false,
        },
      };

      let rzp: any = null;
      try {
        rzp = new (window as any).Razorpay(options);
        activeRzpRef.current = rzp;
      } catch (sdkInitErr: any) {
        console.error('Razorpay initialization error:', sdkInitErr);
        setPaymentStatus('failed');
        setPaymentStatusText('Payment failed');
        setIsSubscribing(null);
        setActionError(
          `Payment SDK Initialization Failed: ${sdkInitErr?.message || 'Unable to instantiate payment gateway.'}`
        );
        cleanupRazorpayInstance();
        return;
      }

      rzp.on('payment.failed', (resp: any) => {
        clearGatewayWatchdog();
        setPaymentStatus('failed');
        setPaymentStatusText('Payment failed');
        setIsSubscribing(null);
        setActionError(
          resp.error?.description ||
            resp.error?.reason ||
            'Payment failed or was declined by the bank.'
        );
        cleanupRazorpayInstance();
      });

      // Watchdog to catch popup blocked or iframe rendering failures instead of a perpetual loader
      clearGatewayWatchdog();
      gatewayWatchdogRef.current = setTimeout(() => {
        // If document is hidden (user switched tabs to external gateway/bank app), do not mark as blocked
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }

        // If user already switched to new tab or completed payment, ignore
        if (paymentStatusRef.current !== 'opening_gateway') {
          return;
        }

        // If still in 'opening_gateway', verify whether Razorpay DOM modal / iframe exists
        const frameExists = Boolean(
          document.querySelector('iframe.razorpay-checkout-frame') ||
            document.querySelector('iframe[src*="razorpay"]') ||
            document.querySelector('.razorpay-container') ||
            document.querySelector('div[class*="razorpay"]')
        );

        if (!frameExists && paymentStatusRef.current === 'opening_gateway') {
          console.warn('[MonetizationModal] Gateway frame not detected after timeout; offering new tab checkout.');
          setPaymentStatus('failed');
          setPaymentStatusText('Checkout popup blocked');
          setIsSubscribing(null);
          setActionError(
            'Payment Gateway Blocked: The checkout popup was blocked by your browser or sandbox restrictions. Please click "Open Checkout in New Tab" below to complete payment securely.'
          );
          cleanupRazorpayInstance();
        }
      }, 10000);

      // Open Razorpay Checkout modal
      try {
        rzp.open();
      } catch (openErr: any) {
        console.error('Subscription open error:', openErr);
        clearGatewayWatchdog();
        const isBlocked = /blocked|popup|denied|sandbox|security|iframe/i.test(openErr?.message || '');
        setPaymentStatus('failed');
        setPaymentStatusText('Payment failed');
        setIsSubscribing(null);
        setActionError(
          isBlocked
            ? 'Payment Gateway Blocked: The checkout popup was blocked by your browser or sandbox restrictions. Please click "Open Checkout in New Tab" below to complete payment securely.'
            : `Payment Gateway Error: ${openErr.message || 'Unable to launch checkout window.'}`
        );
        cleanupRazorpayInstance();
        return;
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      clearGatewayWatchdog();
      setPaymentStatus('failed');
      setPaymentStatusText('Payment failed');
      setIsSubscribing(null);
      setActionError(err.message || 'Payment initiation failed. Please try again.');
      cleanupRazorpayInstance();
    }
  };

  if (!isOpen) return null;

  const plans = (creditData?.pricingPlans && creditData.pricingPlans.length > 0)
    ? creditData.pricingPlans
    : (config?.plans && config.plans.length > 0)
    ? config.plans
    : [
        {
          id: 'free',
          name: 'Free Explorer',
          price: 0,
          billingPeriod: 'forever',
          description: 'Free trial allowance for Indian homeowners',
          credits: 0,
          freeChatMinutes: 5,
          freePhotos: 5,
          features: [
            '5 Minutes Free AI Vastu Chat',
            '5 Free Room Photo Analyses',
            'Live Compass Calibration',
            'Watch Ads to Earn Free Credits',
          ],
        },
        {
          id: 'pro',
          name: 'Pro Home Plan',
          price: 99,
          billingPeriod: 'monthly',
          description: 'Popular choice for complete room-by-room guidance',
          credits: 25,
          features: [
            '25 AI Consultation Credits',
            'Full Multimodal Photo Analysis',
            'Non-Structural Vastu Remedies',
            'Priority AI Response Speed',
            'Earn Bonus Credits with Ads',
          ],
        },
        {
          id: 'expert',
          name: 'Home Expert Plan',
          price: 299,
          billingPeriod: 'monthly',
          description: 'Comprehensive whole-home Vastu audit and PDF reports',
          credits: 9999,
          features: [
            'Unlimited* Vastu Consultations',
            'Complete Home Multi-Room Audit',
            'Downloadable PDF Full Vastu Dossier',
            '100% Ad-Free Experience',
            'Fair-Use Protection (40 queries, 15 photos, 3 home scans/day)',
          ],
        },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-stone-200 rounded-3xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 bg-gradient-to-r from-amber-500/10 via-amber-100/40 to-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
              <Zap className="w-5 h-5 fill-amber-200 text-amber-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-stone-900 truncate">VastuVision Credits & Plans</h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white whitespace-nowrap shrink-0">
                  {account?.plan ? account.plan.toUpperCase() : 'FREE'}
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate sm:whitespace-normal">
                Transparent credit usage for authentic Vedic architectural guidance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Credit Summary Ribbon */}
        {account && (
          <div className="px-5 py-3 bg-stone-900 text-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Available Credits</span>
                <span className="text-base font-black text-amber-400">
                  {account.plan === 'expert' ? 'Unlimited*' : `${account.creditsBalance} Cr`}
                </span>
              </div>
              <div className="h-6 w-px bg-stone-800" />
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Free Chat Remaining</span>
                <span className="font-bold text-stone-200">{account.freeChatMinutesRemaining} mins</span>
              </div>
              <div className="h-6 w-px bg-stone-800" />
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Free Photos Remaining</span>
                <span className="font-bold text-stone-200">{account.freePhotosRemaining} photos</span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('packs')}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Top-Up Credits</span>
            </button>
          </div>
        )}

        {/* Action alerts */}
        {actionError && paymentStatus !== 'waiting_new_tab' && paymentStatus !== 'success' && (
          <div className="mx-5 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <p className="font-medium leading-relaxed break-words">{actionError}</p>
                {actionError.includes('Payment Gateway Blocked') && (
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCheckoutInNewTab(lastSelectedPlanId || 'pro', preparedOrder?.orderId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Checkout in New Tab</span>
                    </button>
                    {preparedOrder && (
                      <button
                        type="button"
                        onClick={() => triggerDirectUserGestureCheckout(preparedOrder)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded-xl font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Try Direct Click</span>
                      </button>
                    )}
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-800 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
                      <span>Open App in New Tab</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                if (paymentStatus === 'failed') setPaymentStatus('idle');
              }}
              className="text-rose-500 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
              title="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {actionSuccess && (
          <div className="mx-5 mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium break-words leading-relaxed">{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-emerald-600 hover:text-emerald-800 p-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-100 text-xs font-bold text-stone-600 px-5 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('plans')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'plans'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-600" /> Plans & Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('packs')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'packs'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-600" /> Credit Top-Up Packs
          </button>
          <button
            onClick={async () => {
              setActiveTab('ledger');
              const history = await creditService.fetchLedger();
              setLedger(history);
            }}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'ledger'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Clock className="w-4 h-4 text-stone-500" /> Credit History
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: PLANS & UPGRADES */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              {/* Preview Sandbox Guidance Banner */}
              {isInIframe && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-[11px] sm:text-xs leading-relaxed">
                      <strong>Preview Sandbox Mode:</strong> If your browser blocks popups inside the preview frame, use our dedicated checkout.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCheckoutInNewTab(lastSelectedPlanId || 'pro', preparedOrder?.orderId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Dedicated Checkout</span>
                  </button>
                </div>
              )}

              {/* Coupon Bar */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-stone-700 font-bold shrink-0">
                  <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Have a promo or discount coupon?</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    id="input-coupon-code"
                    placeholder="Enter code (e.g. VASTU20)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    className="flex-1 sm:w-44 px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-mono uppercase focus:ring-1 focus:ring-amber-500 focus:outline-hidden min-w-0"
                  />
                  <button
                    type="button"
                    id="btn-apply-coupon"
                    onClick={() => handleApplyCoupon()}
                    className="whitespace-nowrap shrink-0 px-4 py-2 bg-stone-900 hover:bg-stone-800 active:bg-black text-amber-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Apply
                  </button>
                  {appliedDiscount && (
                    <button
                      type="button"
                      id="btn-remove-coupon"
                      onClick={() => {
                        setAppliedDiscount(null);
                        setCouponCode('');
                        setCouponError(null);
                        setActionSuccess(null);
                      }}
                      className="whitespace-nowrap shrink-0 px-2 py-2 text-xs text-stone-500 hover:text-rose-600 font-semibold underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              {couponError && (
                <p className="text-xs text-rose-600 px-1 font-medium">
                  {couponError}
                </p>
              )}
              {appliedDiscount && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-emerald-700 bg-emerald-50/80 p-2.5 sm:px-3 sm:py-2 rounded-xl border border-emerald-200 font-semibold">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Coupon <strong>{appliedDiscount.code}</strong> applied!{' '}
                      {appliedDiscount.type === 'fixed'
                        ? `₹${appliedDiscount.amount} flat off`
                        : `${appliedDiscount.percent}% off`}
                      {appliedDiscount.applicablePlan && appliedDiscount.applicablePlan !== 'all'
                        ? ` (${appliedDiscount.applicablePlan.toUpperCase()} plan only)`
                        : ''}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium whitespace-nowrap">
                    Discount reflected in plan prices below
                  </span>
                </div>
              )}

              {/* Visible Payment State Banner */}
              {paymentStatus !== 'idle' && (
                <div
                  id="razorpay-payment-status-banner"
                  role="status"
                  aria-live="polite"
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    paymentStatus === 'creating_order'
                      ? 'bg-blue-50/90 border-blue-200 text-blue-900'
                      : paymentStatus === 'opening_gateway'
                      ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                      : paymentStatus === 'waiting_new_tab'
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                      : paymentStatus === 'processing_payment'
                      ? 'bg-indigo-50/90 border-indigo-200 text-indigo-900'
                      : paymentStatus === 'success'
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                      : paymentStatus === 'cancelled'
                      ? 'bg-stone-100 border-stone-300 text-stone-800'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {paymentStatus === 'creating_order' ||
                    paymentStatus === 'opening_gateway' ||
                    paymentStatus === 'waiting_new_tab' ||
                    paymentStatus === 'processing_payment' ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-amber-600 shrink-0" />
                    ) : paymentStatus === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : paymentStatus === 'cancelled' ? (
                      <Clock className="w-5 h-5 text-stone-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <span>
                          {paymentStatusText ||
                            (paymentStatus === 'creating_order'
                              ? 'Creating order...'
                              : paymentStatus === 'opening_gateway'
                              ? 'Opening gateway...'
                              : paymentStatus === 'waiting_new_tab'
                              ? 'Checkout opened in new tab'
                              : paymentStatus === 'processing_payment'
                              ? 'Processing payment...'
                              : paymentStatus === 'success'
                              ? 'Payment success'
                              : paymentStatus === 'cancelled'
                              ? 'Payment cancelled'
                              : 'Payment failed')}
                        </span>
                        {isSubscribing && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-black/10">
                            {isSubscribing}
                          </span>
                        )}
                      </div>

                      {paymentStatus === 'creating_order' && (
                        <div className="text-xs text-blue-700 mt-0.5">
                          Generating secure order with Razorpay provider...
                        </div>
                      )}
                      {paymentStatus === 'opening_gateway' && (
                        <div className="text-xs text-amber-800 mt-0.5">
                          Launching payment gateway. If a popup was blocked, please click Open in New Tab below.
                        </div>
                      )}
                      {paymentStatus === 'waiting_new_tab' && (
                        <div className="text-xs text-amber-800 mt-0.5">
                          Checkout opened in a new tab. Please complete payment there — this page will automatically activate your plan and credits once confirmed.
                        </div>
                      )}
                      {paymentStatus === 'processing_payment' && (
                        <div className="text-xs text-indigo-700 mt-0.5">
                          Verifying cryptographic payment signature with server...
                        </div>
                      )}
                      {paymentStatus === 'success' && (
                        <div className="text-xs text-emerald-700 mt-0.5">
                          Payment verified and subscription activated successfully!
                        </div>
                      )}
                      {paymentStatus === 'failed' && (
                        <div className="text-xs text-rose-700 mt-0.5 leading-snug">
                          {actionError || 'Payment transaction failed. Please retry.'}
                        </div>
                      )}
                      {paymentStatus === 'cancelled' && (
                        <div className="text-xs text-stone-600 mt-0.5">
                          Payment window was closed. You can retry whenever you are ready.
                        </div>
                      )}
                    </div>
                  </div>

                  {paymentStatus === 'waiting_new_tab' && (
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          const checkId = activeOrderIdRef.current || preparedOrder?.orderId;
                          if (checkId) {
                            try {
                              const res = await creditService.checkOrderStatus(checkId);
                              if (res.paid) {
                                handlePaymentSuccess(res.planName);
                                return;
                              }
                            } catch {}
                          }
                          await loadCreditData();
                          const fresh = await creditService.fetchCredits();
                          if (fresh?.account && initialPlanRef.current && fresh.account.plan !== initialPlanRef.current) {
                            handlePaymentSuccess(fresh.account.plan === 'expert' ? 'Home Expert' : 'Pro Advisor');
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Check Status Now</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openCheckoutInNewTab(lastSelectedPlanId || 'pro', preparedOrder?.orderId)}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 active:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Re-open Tab</span>
                      </button>
                    </div>
                  )}

                  {(paymentStatus === 'failed' || paymentStatus === 'cancelled') && (
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {(actionError?.includes('Payment Gateway Blocked') || actionError?.includes('blocked')) && (
                        <button
                          type="button"
                          onClick={() => openCheckoutInNewTab(lastSelectedPlanId || 'pro', preparedOrder?.orderId)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Checkout in New Tab</span>
                        </button>
                      )}
                      <button
                        type="button"
                        id="btn-retry-payment"
                        onClick={() => handleRetryPayment(lastSelectedPlanId || 'pro')}
                        className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 active:bg-black text-white text-xs font-bold rounded-xl shrink-0 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                        <span>Retry Checkout</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((p) => {
                  const isCurrent = account?.plan === p.id;
                  const isPro = p.id === 'pro';
                  const isExpert = p.id === 'expert';
                  const isLastFailed =
                    (paymentStatus === 'failed' || paymentStatus === 'cancelled') &&
                    lastSelectedPlanId === p.id;

                  const isPlanEligible =
                    appliedDiscount &&
                    (!appliedDiscount.applicablePlan ||
                      appliedDiscount.applicablePlan === 'all' ||
                      appliedDiscount.applicablePlan === p.id);

                  let displayPrice = p.price;
                  if (isPlanEligible && p.price > 0) {
                    if (appliedDiscount.type === 'fixed') {
                      displayPrice = Math.max(0, p.price - (appliedDiscount.amount || 0));
                    } else {
                      const validPercent = Math.min(
                        100,
                        Math.max(0, Number(appliedDiscount.percent ?? appliedDiscount.discountPercent) || 0)
                      );
                      displayPrice = Math.max(0, Math.round(p.price * (1 - validPercent / 100)));
                    }
                  }

                  return (
                    <div
                      key={p.id}
                      className={`p-5 rounded-3xl border flex flex-col justify-between relative transition-all ${
                        isPro
                          ? 'border-2 border-amber-500 bg-amber-50/40 shadow-md'
                          : isExpert
                          ? 'border-stone-800 bg-stone-950 text-stone-100 shadow-lg'
                          : 'border-stone-200 bg-white'
                      }`}
                    >
                      {isPro && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                          Best Value
                        </span>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-black uppercase tracking-wider ${
                              isExpert ? 'text-amber-400' : isPro ? 'text-amber-700' : 'text-stone-500'
                            }`}
                          >
                            {p.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600">
                              Active
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-2xl font-black flex items-baseline gap-1">
                            <span>₹{displayPrice}</span>
                            {isPlanEligible && p.price > 0 && displayPrice < p.price && (
                              <span className="text-xs line-through text-stone-400">₹{p.price}</span>
                            )}
                            <span className={`text-xs font-normal ${isExpert ? 'text-stone-400' : 'text-stone-500'}`}>
                              / {p.billingPeriod || 'month'}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${isExpert ? 'text-stone-300' : 'text-stone-600'}`}>
                            {p.description}
                          </p>
                        </div>

                        <div className="h-px bg-stone-200/50 my-2" />

                        <ul className={`text-xs space-y-2 ${isExpert ? 'text-stone-300' : 'text-stone-600'}`}>
                          {(p.features || []).map((f: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2
                                className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                                  isExpert ? 'text-amber-400' : 'text-amber-600'
                                }`}
                              />
                              <span className="leading-tight">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-5 mt-auto">
                        {isCurrent ? (
                          <div className="w-full py-2.5 rounded-2xl bg-stone-100 text-stone-500 text-center font-bold text-xs">
                            Current Plan
                          </div>
                        ) : p.id === 'free' ? (
                          <div className="w-full py-2.5 rounded-2xl border border-stone-200 text-stone-600 text-center font-bold text-xs">
                            Trial Activated
                          </div>
                        ) : (
                          <button
                            type="button"
                            id={`btn-plan-${p.id}`}
                            onClick={() => (isLastFailed ? handleRetryPayment(p.id as any) : handleSubscribe(p.id as any))}
                            disabled={
                              Boolean(isSubscribing) ||
                              paymentStatus === 'creating_order' ||
                              paymentStatus === 'opening_gateway' ||
                              paymentStatus === 'processing_payment'
                            }
                            className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                              isSubscribing === p.id
                                ? 'bg-amber-500 text-stone-950 opacity-90 cursor-wait'
                                : isSubscribing
                                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                : isLastFailed
                                ? isExpert
                                  ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 cursor-pointer ring-2 ring-amber-400/50'
                                  : 'bg-stone-900 hover:bg-stone-800 text-white cursor-pointer ring-2 ring-rose-500/50'
                                : isExpert
                                ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 cursor-pointer'
                                : 'bg-stone-900 hover:bg-stone-800 text-white cursor-pointer'
                            }`}
                          >
                            {isSubscribing === p.id ? (
                              <div className="flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                                <span className="truncate">
                                  {paymentStatusText ||
                                    (paymentStatus === 'creating_order'
                                      ? 'Creating order...'
                                      : paymentStatus === 'opening_gateway'
                                      ? 'Opening gateway...'
                                      : paymentStatus === 'processing_payment'
                                      ? 'Processing payment...'
                                      : 'Processing...')}
                                </span>
                              </div>
                            ) : isLastFailed ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                                <span>Retry {p.name}</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Get {p.name}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fair Use Protection Notice */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>Fair-Use Protection Policy (Unlimited* Plans)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-stone-500">
                  To protect our high-accuracy Gemini 2.5 architecture against automated scrapers, the Home Expert plan includes
                  a high fair-use allowance of 40 AI queries, 15 photo analyses, and 3 complete multi-room home scans per day, resetting at midnight.
                  Contact enterprise support for developer API access.
                </p>
              </div>

              {/* Standalone Checkout Option / Sandbox Helper */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-stone-700">
                  <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] sm:text-xs">Prefer full-screen checkout or experiencing sandbox restrictions?</span>
                </div>
                <button
                  type="button"
                  onClick={() => openCheckoutInNewTab(lastSelectedPlanId || 'pro', preparedOrder?.orderId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 font-bold text-stone-800 text-xs transition-colors shadow-2xs cursor-pointer shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                  <span>Open Checkout Page</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: INSTANT CREDIT TOP-UP PACKS */}
          {activeTab === 'packs' && (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-stone-900">Instant AI Credit Top-Up</h4>
                <p className="text-xs text-stone-500">
                  Top up credits on-demand without monthly recurring commitments. Credits never expire and work across all AI tools.
                </p>
              </div>

              {/* Credit Packs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {/* Pack 1 */}
                <div className="p-5 rounded-3xl bg-white border border-stone-200 hover:border-amber-400 flex flex-col justify-between space-y-4 shadow-2xs transition-all">
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Starter Pack</span>
                    <div className="text-2xl font-black text-stone-900">50 Credits</div>
                    <div className="text-lg font-bold text-amber-700">₹99</div>
                    <span className="text-[11px] text-stone-400 block">₹1.98 / credit</span>
                  </div>
                  <ul className="text-xs text-stone-600 space-y-1.5 pt-2 border-t border-stone-100">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>50 AI Queries / Photos</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Never expires</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe('pro')}
                    className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    Buy 50 Credits
                  </button>
                </div>

                {/* Pack 2: Popular */}
                <div className="relative p-5 rounded-3xl bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-500 flex flex-col justify-between space-y-4 shadow-sm">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                    Popular
                  </div>
                  <div className="space-y-1 text-center pt-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Booster Pack</span>
                    <div className="text-2xl font-black text-stone-900">150 Credits</div>
                    <div className="text-lg font-bold text-amber-700">₹249</div>
                    <span className="text-[11px] text-stone-400 block">₹1.66 / credit</span>
                  </div>
                  <ul className="text-xs text-stone-600 space-y-1.5 pt-2 border-t border-amber-200/50">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>150 AI Queries / Photos</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Priority AI Speed</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Never expires</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe('pro')}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    Buy 150 Credits
                  </button>
                </div>

                {/* Pack 3: Best Value */}
                <div className="p-5 rounded-3xl bg-white border border-stone-200 hover:border-amber-400 flex flex-col justify-between space-y-4 shadow-2xs transition-all">
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Power Pack</span>
                    <div className="text-2xl font-black text-stone-900">400 Credits</div>
                    <div className="text-lg font-bold text-amber-700">₹499</div>
                    <span className="text-[11px] text-stone-400 block">₹1.24 / credit</span>
                  </div>
                  <ul className="text-xs text-stone-600 space-y-1.5 pt-2 border-t border-stone-100">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>400 AI Queries / Photos</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Complete House Audits</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Never expires</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe('expert')}
                    className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    Buy 400 Credits
                  </button>
                </div>
              </div>

              {/* Secure Payment Notice */}
              <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center gap-3 text-xs text-stone-600">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Protected by Razorpay 256-bit encryption. Supports UPI, Google Pay, PhonePe, Paytm, NetBanking & Cards.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Credit Transaction Audit</h4>
                  <p className="text-xs text-stone-500">Full tamper-evident record of all debits and bonuses</p>
                </div>
                <button
                  onClick={async () => {
                    const history = await creditService.fetchLedger();
                    setLedger(history);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1 text-stone-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {ledger.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  No credit transactions recorded yet. Ask a question or watch a video to see entries here!
                </div>
              ) : (
                <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100">
                  {ledger.map((item) => {
                    const isCredit = item.amount > 0;
                    return (
                      <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-stone-50/50">
                        <div className="space-y-0.5">
                          <div className="font-bold text-stone-800 flex items-center gap-2">
                            <span>{item.reason}</span>
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                              {item.type}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-black font-mono text-sm ${
                              isCredit ? 'text-emerald-600' : 'text-stone-700'
                            }`}
                          >
                            {isCredit ? `+${item.amount}` : item.amount} Cr
                          </div>
                          <span className="text-[10px] text-stone-400">
                            Bal: {item.balanceAfter} Cr
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
