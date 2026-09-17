/**
 * Google Analytics 4 (GA4) Service for Ghar Ghar Vastu
 * Production Measurement ID: G-8CQM6VX33E
 *
 * Privacy & Security Rules:
 * - NEVER send PII (phone, email, password, OTP, address, full name).
 * - NEVER send secrets (Razorpay keys, API tokens, auth credentials).
 * - Safe aggregated parameters only (plan_name, plan_price, currency = 'INR', etc.).
 * - Deduplicated SPA page view tracking to prevent duplicate hits on React re-renders.
 * - Failures in analytics must NEVER break core app functionality.
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GA4_MEASUREMENT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GA4_MEASUREMENT_ID) ||
  'G-8CQM6VX33E';

class AnalyticsService {
  private isInitialized = false;
  private lastTrackedPath: string | null = null;
  private lastTrackedTime = 0;
  private lastFiredEvents: Map<string, number> = new Map();

  /**
   * Sets the user ID in GA4 (anonymized internal UID only, never email or phone)
   */
  public setUserId(userId: string): void {
    if (typeof window === 'undefined' || !userId) return;
    try {
      this.init();
      if (typeof window.gtag === 'function') {
        window.gtag('config', GA4_MEASUREMENT_ID, {
          user_id: userId,
        });
      }
    } catch (err) {
      console.warn('[GA4] setUserId error:', err);
    }
  }

  /**
   * Initializes Google Analytics 4 (gtag.js) once.
   * Safe to call multiple times; will only execute initialization logic once.
   */
  public init(): void {
    if (typeof window === 'undefined') return;
    if (this.isInitialized) return;

    try {
      window.dataLayer = window.dataLayer || [];

      if (typeof window.gtag !== 'function') {
        window.gtag = function () {
          window.dataLayer.push(arguments);
        };
      }

      // Check if tag script is already present in document
      const existingScript = document.querySelector(
        `script[src*="googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}"]`
      );

      if (!existingScript) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
        script.onerror = (err) => {
          console.warn('[GA4] Failed to load gtag.js external script:', err);
        };
        document.head.appendChild(script);
      }

      // Initialize gtag configuration
      window.gtag('js', new Date());
      window.gtag('config', GA4_MEASUREMENT_ID, {
        send_page_view: false, // We control SPA page views manually to prevent duplicates
        cookie_domain: 'auto',
        anonymize_ip: true,
      });

      this.isInitialized = true;
    } catch (err) {
      console.warn('[GA4] Initialization error caught safely:', err);
    }
  }

  /**
   * Helper to push an event to GA4 with deduplication for rapid re-triggers
   */
  private sendEvent(eventName: string, params: Record<string, any> = {}, minIntervalMs = 800): void {
    if (typeof window === 'undefined') return;

    try {
      this.init(); // ensure init

      const now = Date.now();
      const lastTime = this.lastFiredEvents.get(eventName) || 0;
      if (minIntervalMs > 0 && now - lastTime < minIntervalMs) {
        return; // Prevent duplicate rapid bursts
      }
      this.lastFiredEvents.set(eventName, now);

      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
      }
    } catch (err) {
      console.warn(`[GA4] Failed to send event "${eventName}":`, err);
    }
  }

  /**
   * SPA Route / Page View Tracking
   * Tracks route changes without full page reloads, filtering admin paths and deduplicating
   */
  public trackPageView(rawPath: string, pageTitle?: string): void {
    if (typeof window === 'undefined') return;

    try {
      this.init();

      // Normalize path
      let cleanPath = (rawPath || window.location.pathname || '/').trim();
      if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

      // Privacy: Redact private admin details from public analytics
      if (cleanPath.startsWith('/admin')) {
        cleanPath = '/admin';
      }

      const now = Date.now();
      // Deduplicate identical paths reported within 1.5 seconds (e.g. React double render)
      if (this.lastTrackedPath === cleanPath && now - this.lastTrackedTime < 1500) {
        return;
      }

      this.lastTrackedPath = cleanPath;
      this.lastTrackedTime = now;

      const title = pageTitle || document.title || 'Ghar Ghar Vastu';
      const pageLocation = window.location.origin + cleanPath + window.location.search;

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: cleanPath,
          page_title: title,
          page_location: pageLocation,
        });
      }
    } catch (err) {
      console.warn('[GA4] trackPageView error:', err);
    }
  }

  // ==========================================
  // AI VASTU ADVISOR EVENTS
  // ==========================================

  /**
   * User opens the AI Vastu Advisor
   */
  public trackAiVastuAdvisorOpen(source: string = 'direct'): void {
    this.sendEvent('ai_vastu_advisor_open', {
      feature_name: 'ai_vastu_advisor',
      source,
    });
  }

  /**
   * User submits a Vastu question to the AI Advisor
   * Note: NEVER passes the user's private question text or PII.
   */
  public trackAiQuestionSubmitted(inputType: 'text' | 'voice' | 'quick_prompt' | 'multimodal' = 'text'): void {
    this.sendEvent(
      'ai_question_submitted',
      {
        feature_name: 'ai_vastu_advisor',
        input_type: inputType,
      },
      500
    );
  }

  /**
   * User starts an image analysis of a room or house area
   */
  public trackImageAnalysisStarted(inputType: string = 'room_photo'): void {
    this.sendEvent(
      'image_analysis_started',
      {
        feature_name: 'photo_analysis',
        input_type: inputType,
      },
      800
    );
  }

  /**
   * Image analysis completes successfully
   */
  public trackImageAnalysisCompleted(roomType?: string): void {
    this.sendEvent(
      'image_analysis_completed',
      {
        feature_name: 'photo_analysis',
        input_type: roomType || 'general_room',
      },
      800
    );
  }

  // ==========================================
  // AUTHENTICATION EVENTS
  // ==========================================

  /**
   * User begins authentication (opens login modal/page or selects an auth option)
   */
  public trackLoginStarted(method: string = 'modal_open'): void {
    this.sendEvent('login_started', {
      method,
    });
  }

  /**
   * User successfully logs in with Google
   */
  public trackGoogleLogin(): void {
    this.sendEvent('google_login', {
      method: 'google',
    });
    this.trackLoginCompleted('google');
  }

  /**
   * User successfully logs in with Mobile OTP (via APITXT)
   */
  public trackMobileOtpLogin(): void {
    this.sendEvent('mobile_otp_login', {
      method: 'mobile_otp',
    });
    this.trackLoginCompleted('mobile_otp');
  }

  /**
   * User successfully logs in or registers via Email
   */
  public trackEmailLogin(authType: 'login' | 'register' = 'login'): void {
    this.sendEvent('email_login', {
      method: 'email',
      auth_type: authType,
    });
    this.trackLoginCompleted('email');
  }

  /**
   * Generic login completed event
   */
  public trackLoginCompleted(method: string): void {
    this.sendEvent('login_completed', {
      method,
    });
  }

  // ==========================================
  // PRICING & SUBSCRIPTION EVENTS
  // ==========================================

  /**
   * User views the pricing plans / subscriptions modal or page
   */
  public trackPricingPageView(source: string = 'plans_modal'): void {
    this.sendEvent('pricing_page_view', {
      source,
      currency: 'INR',
    });
  }

  /**
   * User clicks/selects a subscription plan (e.g. ₹99, ₹299)
   */
  public trackSubscriptionPlanSelected(planName: string, planPrice: number): void {
    this.sendEvent(
      'subscription_plan_selected',
      {
        plan_name: planName,
        plan_price: planPrice,
        currency: 'INR',
      },
      400
    );
  }

  /**
   * User initiates checkout (Razorpay gateway opens)
   */
  public trackCheckoutStarted(planName: string, planPrice: number): void {
    this.sendEvent(
      'checkout_started',
      {
        plan_name: planName,
        plan_price: planPrice,
        currency: 'INR',
      },
      400
    );
  }

  /**
   * Payment completes and verifies successfully
   */
  public trackPaymentSuccess(planName: string, planPrice: number): void {
    this.sendEvent(
      'payment_success',
      {
        plan_name: planName,
        plan_price: planPrice,
        currency: 'INR',
      },
      0
    );
  }

  /**
   * Payment is declined, fails cryptographic verification, or is cancelled
   */
  public trackPaymentFailed(planName: string, planPrice: number, reason: string = 'payment_declined'): void {
    this.sendEvent(
      'payment_failed',
      {
        plan_name: planName,
        plan_price: planPrice,
        currency: 'INR',
        reason,
      },
      0
    );
  }

  // ==========================================
  // ENGAGEMENT EVENTS
  // ==========================================

  /**
   * User opens the Vedic compass
   */
  public trackCompassOpened(): void {
    this.sendEvent('compass_opened', {
      feature_name: 'vastu_compass',
    });
  }

  /**
   * User opens a specific SEO topic guide
   */
  public trackSeoTopicViewed(slug: string): void {
    this.sendEvent('seo_topic_viewed', {
      topic_slug: slug,
    });
  }
}

export const analyticsService = new AnalyticsService();
