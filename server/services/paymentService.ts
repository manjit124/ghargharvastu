import crypto from 'crypto';
import { adminStore } from '../adminStore';
import { paymentConfigService, PublicPaymentConfig } from './paymentConfigService';

export interface CreateOrderResult {
  success: boolean;
  configured: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  planId?: string;
  planName?: string;
  mode?: 'TEST' | 'LIVE';
  error?: string;
  message?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  error?: string;
  message?: string;
  account?: any;
  subscription?: any;
  paymentRecord?: any;
}

export interface CreateSubscriptionResult {
  success: boolean;
  configured: boolean;
  subscriptionId?: string;
  orderId?: string;
  keyId?: string;
  planId?: string;
  amount?: number;
  currency?: string;
  mode?: 'TEST' | 'LIVE';
  error?: string;
  message?: string;
}

class PaymentService {
  /**
   * Centralized configuration check
   */
  public isConfigured(): boolean {
    return paymentConfigService.isConfigured();
  }

  /**
   * Public client-safe payment config
   */
  public getConfig(): PublicPaymentConfig {
    return paymentConfigService.getPublicClientConfig();
  }

  /**
   * Create an authentic Razorpay order for PRO or HOME EXPERT
   * - Plan ID received and verified server-side
   * - Authoritative price fetched server-side from adminStore.plans
   * - Client price parameter is strictly rejected / ignored
   */
  public async createOrder(
    userId: string,
    userEmail: string,
    userName: string,
    planId: 'pro' | 'expert',
    couponCode?: string
  ): Promise<CreateOrderResult> {
    const plan = adminStore.plans.find((p) => p.id === planId);
    if (!plan) {
      return {
        success: false,
        configured: this.isConfigured(),
        error: 'INVALID_PLAN',
        message: `Plan ${planId} does not exist.`,
      };
    }

    if (!plan.enabled) {
      return {
        success: false,
        configured: this.isConfigured(),
        error: 'PLAN_DISABLED',
        message: `Plan ${plan.name} is currently not available for purchase.`,
      };
    }

    if (plan.price <= 0) {
      return {
        success: false,
        configured: this.isConfigured(),
        error: 'PLAN_IS_FREE',
        message: `Plan ${plan.name} is free and does not require online payment.`,
      };
    }

    // Determine authoritative base price (honoring promotional price if active)
    const basePrice =
      plan.promotionalPrice !== undefined && plan.promotionalPrice > 0 && plan.promotionalPrice < plan.price
        ? plan.promotionalPrice
        : plan.price;

    // Calculate discounted amount if coupon provided
    let finalAmountINR = basePrice;
    if (couponCode) {
      const valResult = adminStore.validateCoupon(couponCode, planId);
      if (valResult.valid && valResult.coupon) {
        const cpn = valResult.coupon;
        if (cpn.discountType === 'percentage') {
          const pct = Math.min(100, Math.max(0, Number(cpn.discountPercent ?? cpn.discountAmount ?? 0)));
          finalAmountINR = Math.max(0, Math.round(basePrice * (1 - pct / 100)));
        } else {
          const fixedAmt = Math.max(0, Number(cpn.discountAmount ?? 0));
          finalAmountINR = Math.max(0, basePrice - fixedAmt);
        }
      }
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        configured: false,
        error: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
        message:
          'Payment gateway configuration required. Razorpay API keys must be configured on the server to accept online payments. For manual activation or support, please contact the administrator.',
      };
    }

    try {
      const amountInPaise = Math.round(finalAmountINR * 100);
      const receiptId = `rcpt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const currentMode = paymentConfigService.getMode();
      const activeKeyId = paymentConfigService.getActiveKeyId();

      const client = paymentConfigService.getClient();
      const order = await client.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          userId,
          userEmail,
          userName,
          planId,
          planName: plan.name,
          mode: currentMode,
        },
      });

      // Save order in database records
      adminStore.recordPaymentOrder({
        id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        orderId: order.id,
        userId,
        userEmail,
        planId,
        planName: plan.name,
        amount: finalAmountINR,
        currency: 'INR',
        status: 'created',
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        configured: true,
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        keyId: activeKeyId || undefined,
        planId,
        planName: plan.name,
        mode: currentMode,
      };
    } catch (err: any) {
      console.error('[PaymentService] Razorpay cloud API order create failed:', {
        errorCode: err?.error?.code || err?.code || 'UNKNOWN',
        description: err?.error?.description || err?.message || 'No description provided',
        field: err?.error?.field || null,
        source: err?.error?.source || null,
        step: err?.error?.step || null,
        reason: err?.error?.reason || null,
        statusCode: err?.statusCode || null,
      });
      return {
        success: false,
        configured: true,
        error: err?.error?.code || 'ORDER_CREATION_FAILED',
        message: err?.error?.description || err?.message || 'Failed to create payment order with Razorpay.',
      };
    }
  }

  /**
   * Create recurring subscription or checkout subscription
   */
  public async createSubscription(
    userId: string,
    userEmail: string,
    userName: string,
    planId: 'pro' | 'expert'
  ): Promise<CreateSubscriptionResult> {
    const orderRes = await this.createOrder(userId, userEmail, userName, planId);
    if (!orderRes.success) {
      return {
        success: false,
        configured: orderRes.configured,
        error: orderRes.error,
        message: orderRes.message,
      };
    }

    return {
      success: true,
      configured: true,
      orderId: orderRes.orderId,
      subscriptionId: orderRes.orderId, // Fallback subscription reference
      keyId: orderRes.keyId,
      planId,
      amount: orderRes.amount,
      currency: orderRes.currency,
      mode: orderRes.mode,
      message: 'Subscription checkout initiated successfully.',
    };
  }

  /**
   * Server-side cryptographic HMAC-SHA256 signature verification
   * Never trust client status flags.
   * Enforces idempotency (no duplicate credits if verified twice).
   */
  public verifyPayment(
    userId: string,
    details: {
      orderId: string;
      paymentId: string;
      signature: string;
    }
  ): VerifyPaymentResult {
    const { orderId, paymentId, signature } = details;

    if (!orderId || !paymentId || !signature) {
      return {
        success: false,
        error: 'MISSING_PAYMENT_DETAILS',
        message: 'Order ID, Payment ID, and Signature are required for verification.',
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
        message: 'Payment gateway is not configured.',
      };
    }

    const keySecret = paymentConfigService.getActiveSecret();
    if (!keySecret) {
      return {
        success: false,
        error: 'PAYMENT_SECRET_MISSING',
        message: 'Active Razorpay secret is not configured on the server.',
      };
    }

    // Cryptographic HMAC-SHA256 verification
    const expectedSignature = crypto
      .createHmac('sha256', keySecret.trim())
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const currentMode = paymentConfigService.getMode();
    console.log(
      `[PaymentService] Cryptographically verifying payment for order: ${orderId}, paymentId: ${paymentId}, mode: ${currentMode}`
    );

    let isSignatureValid = false;
    try {
      if (typeof signature === 'string' && signature.length === expectedSignature.length) {
        isSignatureValid = crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'hex'),
          Buffer.from(signature, 'hex')
        );
      }
    } catch {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      console.warn(
        `[PaymentService] Signature mismatch for order ${orderId}. Untrusted payment payload rejected.`
      );
      adminStore.recordSecurityEvent({
        type: 'INVALID_PAYMENT_SIGNATURE',
        severity: 'critical',
        userId,
        details: `Cryptographic signature mismatch on order ${orderId} with payment ${paymentId}`,
      });
      return {
        success: false,
        error: 'INVALID_SIGNATURE',
        message: 'Cryptographic signature verification failed. Untrusted payment payload rejected.',
      };
    }

    // Retrieve order from database - order must be registered when order was created
    const orderRecord = adminStore.getPaymentOrder(orderId);
    if (!orderRecord) {
      return {
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: 'Payment order was not found in server records.',
      };
    }

    if (orderRecord.userId !== userId) {
      adminStore.recordSecurityEvent({
        type: 'PAYMENT_USER_MISMATCH',
        severity: 'critical',
        userId,
        details: `User ${userId} attempted to verify order ${orderId} belonging to ${orderRecord.userId}`,
      });
      return {
        success: false,
        error: 'UNAUTHORIZED_ORDER_VERIFICATION',
        message: 'This payment order does not belong to the authenticated session.',
      };
    }

    // Idempotency: If order was already paid, return existing state without duplicate crediting
    if (orderRecord.status === 'paid') {
      const existingSub = adminStore.getUserSubscription(userId);
      const existingAccount = adminStore.getUserAccount(userId);
      return {
        success: true,
        message: `Payment already verified previously for ${orderRecord.planName}.`,
        account: existingAccount,
        subscription: existingSub,
        paymentRecord: orderRecord,
      };
    }

    // Update order status
    orderRecord.status = 'paid';
    orderRecord.paymentId = paymentId;
    orderRecord.signature = signature;
    orderRecord.verifiedAt = new Date().toISOString();

    // Activate subscription in admin store (adds 25 credits for PRO, activates status)
    const activation = adminStore.activateSubscriptionFromPayment({
      userId,
      planId: orderRecord.planId,
      orderId,
      paymentId,
      amount: orderRecord.amount,
      currency: orderRecord.currency,
      provider: 'razorpay',
    });

    return {
      success: true,
      message: `Payment verified successfully. You are now subscribed to ${orderRecord.planName}.`,
      account: activation.account,
      subscription: activation.subscription,
      paymentRecord: orderRecord,
    };
  }

  /**
   * Handle incoming Razorpay Webhooks
   * Authenticated, idempotent, transaction-safe
   */
  public handleWebhook(rawBody: string, signature: string | undefined): { success: boolean; message: string } {
    const webhookSecret = paymentConfigService.getActiveWebhookSecret();
    if (!webhookSecret) {
      console.warn('[PaymentService] Razorpay webhook secret not set in active configuration, rejecting webhook');
      return { success: false, message: 'Webhook secret not configured on server' };
    }

    if (!signature) {
      return { success: false, message: 'Missing x-razorpay-signature header' };
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret.trim())
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      adminStore.recordSecurityEvent({
        type: 'INVALID_WEBHOOK_SIGNATURE',
        severity: 'critical',
        details: 'Received webhook with invalid HMAC signature',
      });
      return { success: false, message: 'Invalid webhook signature' };
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { success: false, message: 'Invalid JSON payload' };
    }

    const event = payload.event;
    const eventId = payload.entity_id || payload.id || `evt_${Date.now()}`;

    // Idempotency check: Don't process the same event twice
    const existingEvent = adminStore.paymentEvents.find((e) => e.id === eventId);
    if (existingEvent) {
      return { success: true, message: `Event ${eventId} already processed previously.` };
    }

    // Record webhook event in database
    adminStore.recordPaymentEvent({
      id: eventId,
      event,
      orderId: payload?.payload?.payment?.entity?.order_id,
      paymentId: payload?.payload?.payment?.entity?.id,
      payload,
      status: 'processed',
      receivedAt: new Date().toISOString(),
    });

    // Handle payment.captured / payment.authorized
    if (event === 'payment.captured' || event === 'payment.authorized') {
      const payment = payload.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const userId = payment.notes?.userId;
      const planId = payment.notes?.planId;

      if (userId && planId && (planId === 'pro' || planId === 'expert')) {
        const orderRecord = orderId ? adminStore.getPaymentOrder(orderId) : null;
        if (orderRecord && orderRecord.status === 'paid') {
          // Already paid and activated via client verify call, skip duplicate credit
          return { success: true, message: `Order ${orderId} already verified and active.` };
        }

        if (orderRecord) {
          orderRecord.status = 'paid';
          orderRecord.paymentId = paymentId;
          orderRecord.verifiedAt = new Date().toISOString();
        }

        adminStore.activateSubscriptionFromPayment({
          userId,
          planId,
          orderId: orderId || `wh_${paymentId}`,
          paymentId,
          amount: payment.amount ? payment.amount / 100 : 0,
          currency: payment.currency || 'INR',
          provider: 'razorpay',
        });
      }
    }

    // Handle payment.failed
    if (event === 'payment.failed') {
      const payment = payload?.payload?.payment?.entity;
      const orderId = payment?.order_id;
      if (orderId) {
        const orderRecord = adminStore.getPaymentOrder(orderId);
        if (orderRecord) {
          orderRecord.status = 'failed';
          orderRecord.errorCode = payment?.error_code || 'PAYMENT_FAILED';
          orderRecord.errorDescription = payment?.error_description || 'Payment failed';
        }
      }
    }

    // Handle subscription.activated or subscription.charged
    if (event === 'subscription.activated' || event === 'subscription.charged') {
      const sub = payload?.payload?.subscription?.entity;
      const userId = sub?.notes?.userId;
      const planId = sub?.notes?.planId;
      if (userId && planId && (planId === 'pro' || planId === 'expert')) {
        adminStore.activateSubscriptionFromPayment({
          userId,
          planId,
          orderId: sub.id,
          paymentId: sub.payment_id || sub.id,
          amount: sub.plan_amount ? sub.plan_amount / 100 : 99,
          currency: 'INR',
          provider: 'razorpay',
        });
      }
    }

    // Handle subscription.cancelled or subscription.halted
    if (event === 'subscription.cancelled' || event === 'subscription.halted') {
      const sub = payload?.payload?.subscription?.entity;
      const userId = sub?.notes?.userId;
      if (userId) {
        const userSub = adminStore.userSubscriptions.get(userId);
        if (userSub) {
          userSub.status = event === 'subscription.cancelled' ? 'CANCELLED' : 'PAST_DUE';
          userSub.updatedAt = new Date().toISOString();
          adminStore.saveToDisk();
        }
      }
    }

    return { success: true, message: `Event ${event} processed successfully.` };
  }

  /**
   * Check order status and reconcile with Razorpay if needed (for cross-tab sync and fallback verification)
   */
  public async checkOrderStatus(
    userId: string,
    orderId: string
  ): Promise<{
    success: boolean;
    paid: boolean;
    status: string;
    orderId: string;
    planId?: string;
    planName?: string;
    paymentId?: string;
    verifiedAt?: string;
    account?: any;
    subscription?: any;
    message?: string;
  }> {
    if (!orderId) {
      return {
        success: false,
        paid: false,
        status: 'invalid_request',
        orderId,
        message: 'Order ID is required.',
      };
    }

    const orderRecord = adminStore.getPaymentOrder(orderId);
    if (!orderRecord) {
      return {
        success: false,
        paid: false,
        status: 'not_found',
        orderId,
        message: 'Payment order was not found in server records.',
      };
    }

    if (orderRecord.userId !== userId) {
      return {
        success: false,
        paid: false,
        status: 'unauthorized',
        orderId,
        message: 'Order does not belong to current user session.',
      };
    }

    // If order is already recorded as paid
    if (orderRecord.status === 'paid') {
      const account = adminStore.getUserAccount(userId);
      const subscription = adminStore.getUserSubscription(userId);
      return {
        success: true,
        paid: true,
        status: 'paid',
        orderId,
        planId: orderRecord.planId,
        planName: orderRecord.planName,
        paymentId: orderRecord.paymentId,
        verifiedAt: orderRecord.verifiedAt,
        account,
        subscription,
        message: `Payment already verified for ${orderRecord.planName}.`,
      };
    }

    // Direct Razorpay API verification fallback: check if order was captured on Razorpay
    try {
      if (this.isConfigured()) {
        const client = paymentConfigService.getClient();
        if (client && client.orders && typeof client.orders.fetch === 'function') {
          const rzpOrder = await client.orders.fetch(orderId);
          if (
            rzpOrder &&
            (rzpOrder.status === 'paid' ||
              (typeof rzpOrder.amount_paid === 'number' && rzpOrder.amount_paid >= rzpOrder.amount))
          ) {
            // Retrieve captured payment ID from Razorpay
            let paymentId = `rzp_${orderId}`;
            try {
              if (typeof client.orders.fetchPayments === 'function') {
                const payments = await client.orders.fetchPayments(orderId);
                const captured = payments?.items?.find(
                  (p: any) => p.status === 'captured' || p.status === 'authorized'
                );
                if (captured?.id) {
                  paymentId = captured.id;
                }
              }
            } catch (pErr) {
              console.warn('[PaymentService] Error fetching order payments from Razorpay:', pErr);
            }

            // Update order record
            orderRecord.status = 'paid';
            orderRecord.paymentId = paymentId;
            orderRecord.verifiedAt = new Date().toISOString();

            // Safely activate subscription and allocate credits
            const activation = adminStore.activateSubscriptionFromPayment({
              userId,
              planId: orderRecord.planId,
              orderId,
              paymentId,
              amount: orderRecord.amount,
              currency: orderRecord.currency,
              provider: 'razorpay',
            });

            console.log(
              `[PaymentService] Successfully reconciled order ${orderId} via direct Razorpay fetch for user ${userId}`
            );

            return {
              success: true,
              paid: true,
              status: 'paid',
              orderId,
              planId: orderRecord.planId,
              planName: orderRecord.planName,
              paymentId,
              verifiedAt: orderRecord.verifiedAt,
              account: activation.account,
              subscription: activation.subscription,
              message: `Payment verified via Razorpay API for ${orderRecord.planName}.`,
            };
          }
        }
      }
    } catch (apiErr: any) {
      console.warn(`[PaymentService] Direct Razorpay check failed for order ${orderId}:`, apiErr?.message);
    }

    return {
      success: true,
      paid: false,
      status: orderRecord.status,
      orderId,
      planId: orderRecord.planId,
      planName: orderRecord.planName,
      message: `Order status is currently ${orderRecord.status}.`,
    };
  }
}

export const paymentService = new PaymentService();
