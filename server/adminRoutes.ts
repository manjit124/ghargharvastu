import { Router, Response } from 'express';
import { adminStore, AdminUser, AdminRole, isValidAdMobAdUnitId, INITIAL_PLANS } from './adminStore';
import { requireAdminAuth, requireVerifiedAdmin, requireSuperAdmin, sanitizeAdmin, AdminAuthRequest, extractAdminToken } from './adminAuth';
import { getGenAIClient } from './services/geminiService';
import { paymentConfigService } from './services/paymentConfigService';

const router = Router();

// ==========================================
// 1. ADMIN AUTHENTICATION & RATE LIMITING
// ==========================================

interface FailedAttemptTracker {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number;
}

const loginAttempts = new Map<string, FailedAttemptTracker>();

function getClientIdentifier(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || 'unknown';
  return ip;
}

// POST /api/admin/auth/login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const clientIp = getClientIdentifier(req);
  const now = Date.now();

  // Check rate limit
  const tracker = loginAttempts.get(clientIp);
  if (tracker && tracker.blockedUntil > now) {
    const remainingSeconds = Math.ceil((tracker.blockedUntil - now) / 1000);
    return res.status(429).json({
      error: `Too many failed attempts. Please wait ${remainingSeconds} seconds before trying again.`,
    });
  }

  if (!email || !password) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  // Normalize common email typos (e.g. gamil.com -> gmail.com)
  const normalizedEmail = cleanEmail
    .replace(/@(gamil|gmial|gmai|gmaill)\.com$/, '@gmail.com');

  const user = adminStore.adminUsers.find(
    (u) =>
      u.email.toLowerCase() === cleanEmail ||
      u.email.toLowerCase() === normalizedEmail ||
      (cleanEmail === 'makesoney' && u.email.toLowerCase() === 'makesoney@gmail.com') ||
      (cleanEmail === 'shivshahidoors' && u.email.toLowerCase() === 'shivshahidoors@gmail.com')
  );

  const isValid = user && user.status === 'active' && adminStore.verifyPassword(user, String(password));

  if (!isValid) {
    // Record failed attempt
    const current = tracker || { count: 0, firstAttemptAt: now, blockedUntil: 0 };
    // Reset counter if window expired (5 minutes)
    if (now - current.firstAttemptAt > 5 * 60 * 1000) {
      current.count = 1;
      current.firstAttemptAt = now;
      current.blockedUntil = 0;
    } else {
      current.count += 1;
    }

    if (current.count >= 5) {
      // Block for 60 seconds after 5 failed attempts
      current.blockedUntil = now + 60 * 1000;
    }

    loginAttempts.set(clientIp, current);

    // Audit log failed attempt without password
    adminStore.logAudit(
      { id: 'system', name: 'Security Guard' },
      'FAILED_LOGIN_ATTEMPT',
      cleanEmail || 'unknown',
      `Failed admin login attempt from IP ${clientIp} (Attempt ${current.count}/5)`
    );

    // Artificial delay to prevent timing analysis
    await new Promise((r) => setTimeout(r, 250));

    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  // Reset rate limiting on successful login
  loginAttempts.delete(clientIp);

  const token = adminStore.createSession(user);
  user.lastLogin = new Date().toISOString();
  adminStore.saveToDisk();

  // Set secure cookie
  res.cookie('admin_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 3600 * 1000,
  });

  adminStore.logAudit(
    { id: user.id, name: user.name },
    'ADMIN_LOGIN',
    user.email,
    `Administrator logged in successfully from IP ${clientIp}.`
  );

  return res.json({
    success: true,
    token,
    user: sanitizeAdmin(user),
  });
});

// GET /api/admin/auth/me
router.get('/auth/me', requireAdminAuth(), (req: AdminAuthRequest, res) => {
  res.json({
    user: sanitizeAdmin(req.admin!),
  });
});

// POST /api/admin/auth/logout
router.post('/auth/logout', requireAdminAuth(), (req: AdminAuthRequest, res) => {
  const token = extractAdminToken(req);
  if (token) {
    adminStore.revokeSession(token);
  }
  res.clearCookie('admin_session');
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'ADMIN_LOGOUT',
    req.admin!.email,
    'Administrator logged out.'
  );
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/admin/auth/password
router.post('/auth/password', requireAdminAuth(), (req: AdminAuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const isValid = adminStore.verifyPassword(req.admin!, currentPassword);
  if (!isValid) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  adminStore.setAdminPassword(req.admin!.id, newPassword);
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'PASSWORD_CHANGED',
    req.admin!.email,
    'Admin account password changed.'
  );

  res.json({ success: true, message: 'Password updated successfully' });
});

// ==========================================
// 2. ADMIN DASHBOARD & ANALYTICS
// ==========================================

const getDashboardDataHandler = (req: AdminAuthRequest, res: Response) => {
  const period = (req.query.period as string) || (req.query.range as string) || '30d';

  const totalUsers = adminStore.users.length;
  const activeUsers = adminStore.users.filter((u) => u.status === 'active').length;
  const newUsers = adminStore.users.filter((u) => {
    const diffDays = (Date.now() - new Date(u.createdAt).getTime()) / (1000 * 3600 * 24);
    return diffDays <= 30;
  }).length;

  const totalQuestions = adminStore.users.reduce((acc, u) => acc + (u.questionsAsked || 0), 0);
  const totalPhotos = adminStore.users.reduce((acc, u) => acc + (u.photosAnalyzed || 0), 0);
  const totalRoomScans = adminStore.users.reduce((acc, u) => acc + (u.roomScansCompleted || 0), 0);
  const reportsGenerated = adminStore.users.reduce((acc, u) => acc + (u.savedReportsCount || 0), 0);

  const premiumUsers = adminStore.users.filter((u) => u.plan === 'pro' || u.plan === 'expert').length;
  const freeUsers = adminStore.users.filter((u) => u.plan === 'free').length;

  const activeSubscriptions = adminStore.subscriptions.filter((s) => s.status === 'active');
  const revenueNum = activeSubscriptions.reduce((acc, s) => acc + s.amount, 0);
  const revenueStr = `₹${revenueNum.toLocaleString()}`;
  const conversionRate = totalUsers > 0 ? `${((premiumUsers / totalUsers) * 100).toFixed(1)}%` : '0.0%';

  const failedAIRequests = adminStore.requestLogs.filter((r) => !r.success).length;
  const totalAIRequests = adminStore.requestLogs.length || (totalQuestions + totalPhotos);

  // Time-series mock / data based on period
  const userGrowthChart = [
    { label: 'Week 1', users: Math.max(1, totalUsers - 5), pro: Math.max(1, premiumUsers - 2) },
    { label: 'Week 2', users: Math.max(2, totalUsers - 3), pro: Math.max(1, premiumUsers - 1) },
    { label: 'Week 3', users: Math.max(3, totalUsers - 1), pro: premiumUsers },
    { label: 'Current', users: totalUsers, pro: premiumUsers },
  ];

  const dailyAIChart = [
    { day: 'Mon', questions: 28, photos: 12, requests: 40 },
    { day: 'Tue', questions: 35, photos: 18, requests: 53 },
    { day: 'Wed', questions: 42, photos: 16, requests: 58 },
    { day: 'Thu', questions: 38, photos: 22, requests: 60 },
    { day: 'Fri', questions: 54, photos: 31, requests: 85 },
    { day: 'Sat', questions: 68, photos: 45, requests: 113 },
    { day: 'Sun', questions: 61, photos: 39, requests: 100 },
  ];

  const categoryDistribution = [
    { category: 'Bedroom', count: 48, share: 28 },
    { category: 'Kitchen', count: 38, share: 22 },
    { category: 'Main Door', count: 32, share: 19 },
    { category: 'Wall Clock', count: 24, share: 14 },
    { category: 'Mirror', count: 18, share: 11 },
    { category: 'Pooja Room', count: 12, share: 6 },
  ];

  res.json({
    period,
    // Flat properties conforming to DashboardStats
    totalUsers,
    activeUsers,
    newUsers,
    premiumUsers,
    freeUsers,
    totalAiQuestions: totalQuestions,
    totalPhotoAnalyses: totalPhotos,
    totalRoomScans,
    reportsGenerated,
    aiRequestsToday: 48,
    aiRequestsThisMonth: totalAIRequests,
    failedAiRequests: failedAIRequests,
    revenue: revenueStr,
    conversionRate,
    chartData: {
      userGrowth: userGrowthChart,
      dailyAiRequests: dailyAIChart,
      photoAnalysesByCategory: categoryDistribution,
    },
    // Nested structure for flexible consumption
    kpis: {
      totalUsers,
      activeUsers,
      newUsers,
      totalQuestions,
      totalPhotos,
      totalRoomScans,
      reportsGenerated,
      premiumUsers,
      freeUsers,
      revenuePlaceholder: revenueStr,
      conversionRate,
      aiRequestsToday: 48,
      aiRequestsThisMonth: totalAIRequests,
      estimatedAiUsage: `${(totalAIRequests * 0.0018).toFixed(2)} USD`,
      failedAIRequests,
      geminiConnected: Boolean(process.env.GEMINI_API_KEY),
    },
    charts: {
      userGrowthChart,
      dailyAIChart,
      categoryDistribution,
      mostSearchedQuestions: adminStore.popularQuestions.slice(0, 5),
    },
    recentAudits: adminStore.auditLogs.slice(0, 6),
  });
};

router.get('/dashboard', requireAdminAuth(), getDashboardDataHandler);
router.get('/dashboard/stats', requireAdminAuth(), getDashboardDataHandler);

// ==========================================
// 3. USER MANAGEMENT & SEARCH
// ==========================================

router.get('/users', requireAdminAuth(), (req, res) => {
  const search = ((req.query.search || req.query.q || '') as string).toLowerCase().trim();
  const plan = (req.query.plan as string) || 'all';
  const status = (req.query.status as string) || 'all';
  const sort = (req.query.sort as string) || 'newest';
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '10', 10)));

  let filtered = [...adminStore.users];

  if (search) {
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.id.toLowerCase().includes(search)
    );
  }

  if (plan !== 'all') {
    filtered = filtered.filter((u) => u.plan === plan);
  }

  if (status !== 'all') {
    if (status === 'high_usage') {
      filtered = filtered.filter((u) => (u.questionsAsked || 0) + (u.photosAnalyzed || 0) > 30);
    } else {
      filtered = filtered.filter((u) => u.status === status);
    }
  }

  // Sort
  if (sort === 'newest') {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sort === 'oldest') {
    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sort === 'highest_usage') {
    filtered.sort((a, b) => (b.questionsAsked + b.photosAnalyzed) - (a.questionsAsked + a.photosAnalyzed));
  } else if (sort === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  res.json({
    users: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  });
});

// GET /api/admin/users/:id
router.get('/users/:id', requireAdminAuth(), (req, res) => {
  const user = adminStore.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// PUT /api/admin/users/:id
router.put('/users/:id', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const user = adminStore.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, email, plan, status, adminNotes } = req.body;
  if (name) user.name = name;
  if (email) user.email = email;
  if (plan) user.plan = plan;
  if (status) user.status = status;
  if (adminNotes !== undefined) user.adminNotes = adminNotes;

  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'USER_UPDATED',
    user.id,
    `Updated profile for ${user.name} (${user.email})`
  );

  res.json({ success: true, user });
});

// POST /api/admin/users/:id/suspend
router.post('/users/:id/suspend', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const user = adminStore.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.status = 'suspended';
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'USER_SUSPENDED',
    user.id,
    `Suspended user ${user.email}`
  );

  res.json({ success: true, user });
});

// POST /api/admin/users/:id/reactivate
router.post('/users/:id/reactivate', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const user = adminStore.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.status = 'active';
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'USER_REACTIVATED',
    user.id,
    `Reactivated user ${user.email}`
  );

  res.json({ success: true, user });
});

// POST /api/admin/users/:id/reset-usage
router.post('/users/:id/reset-usage', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const user = adminStore.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.questionsAsked = 0;
  user.photosAnalyzed = 0;
  user.roomScansCompleted = 0;
  adminStore.saveToDisk();

  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'USER_USAGE_RESET',
    user.id,
    `Reset AI counters for ${user.email}`
  );

  res.json({ success: true, user });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAdminAuth(['SUPER_ADMIN']), (req: AdminAuthRequest, res) => {
  const idx = adminStore.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  const removed = adminStore.users.splice(idx, 1)[0];
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'USER_DELETED',
    removed.id,
    `Permanently deleted user ${removed.name} (${removed.email})`
  );

  res.json({ success: true, message: 'User deleted successfully' });
});

// ==========================================
// 4. PRICING & PLANS MANAGEMENT
// ==========================================

const getPricingHandler = (_req: any, res: Response) => {
  res.json({
    success: true,
    plans: adminStore.plans,
    priceHistory: adminStore.priceHistory,
  });
};

router.get('/pricing', requireAdminAuth(), getPricingHandler);
router.get('/plans', requireAdminAuth(), getPricingHandler);

router.get('/pricing/history', requireAdminAuth(), (_req, res) => {
  res.json({
    success: true,
    priceHistory: adminStore.priceHistory,
  });
});

const updatePlanHandler = (req: AdminAuthRequest, res: Response) => {
  const plan = adminStore.plans.find((p) => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const {
    name,
    price,
    currency,
    billingPeriod,
    description,
    features,
    badge,
    credits,
    limits,
    fairUseLimits,
    showAds,
    enabled,
    featured,
    displayOrder,
    promotionalPrice,
    originalPrice,
    discountPercentage,
    changeReason,
  } = req.body;

  // Validation: Price must be non-negative number
  if (price !== undefined) {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0 || !isFinite(numPrice)) {
      return res.status(400).json({ error: 'Plan price must be a valid non-negative number.' });
    }
  }

  // Validation: Promotional price must be non-negative
  if (promotionalPrice !== undefined && promotionalPrice !== null && promotionalPrice !== '') {
    const numPromo = Number(promotionalPrice);
    if (isNaN(numPromo) || numPromo < 0 || !isFinite(numPromo)) {
      return res.status(400).json({ error: 'Promotional price must be a valid non-negative number.' });
    }
  }

  // Validation: Currency
  if (currency !== undefined && (!currency || typeof currency !== 'string' || currency.trim().length === 0)) {
    return res.status(400).json({ error: 'Currency cannot be empty.' });
  }

  // Check and record price changes
  const oldPrice = plan.price;
  const oldPromo = plan.promotionalPrice;
  const newPrice = price !== undefined ? Number(price) : oldPrice;
  const newPromo = promotionalPrice !== undefined ? (promotionalPrice === null ? undefined : Number(promotionalPrice)) : oldPromo;

  const priceChanged = oldPrice !== newPrice || oldPromo !== newPromo;
  if (priceChanged) {
    adminStore.priceHistory.unshift({
      id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      planId: plan.id,
      planName: name || plan.name,
      oldPrice,
      newPrice,
      oldPromotionalPrice: oldPromo,
      newPromotionalPrice: newPromo,
      currency: currency || plan.currency,
      adminId: req.admin!.id,
      adminName: req.admin!.name,
      timestamp: new Date().toISOString(),
      notes: changeReason || `Price updated from ${plan.currency}${oldPrice} to ${(currency || plan.currency)}${newPrice}`,
    });
  }

  // Apply updates
  if (name !== undefined) plan.name = String(name).trim();
  if (price !== undefined) plan.price = Number(price);
  if (currency !== undefined) plan.currency = String(currency).trim();
  if (billingPeriod !== undefined) plan.billingPeriod = billingPeriod;
  if (description !== undefined) plan.description = String(description).trim();
  if (features !== undefined && Array.isArray(features)) {
    plan.features = features.map((f: any) => String(f).trim()).filter(Boolean);
  }
  if (badge !== undefined) plan.badge = badge ? String(badge).trim() : undefined;
  if (credits !== undefined) plan.credits = Math.max(0, Math.round(Number(credits)));
  if (showAds !== undefined) plan.showAds = Boolean(showAds);

  if (limits !== undefined) {
    plan.limits = {
      ...plan.limits,
      questionsPerMonth: limits.questionsPerMonth !== undefined ? Math.max(0, Number(limits.questionsPerMonth)) : plan.limits.questionsPerMonth,
      photosPerMonth: limits.photosPerMonth !== undefined ? Math.max(0, Number(limits.photosPerMonth)) : plan.limits.photosPerMonth,
      roomScansPerMonth: limits.roomScansPerMonth !== undefined ? Math.max(0, Number(limits.roomScansPerMonth)) : plan.limits.roomScansPerMonth,
      voiceMinutesPerMonth: limits.voiceMinutesPerMonth !== undefined ? Math.max(0, Number(limits.voiceMinutesPerMonth)) : (plan.limits.voiceMinutesPerMonth ?? 10),
      completeHomeScan: limits.completeHomeScan !== undefined ? Boolean(limits.completeHomeScan) : plan.limits.completeHomeScan,
      pdfReports: limits.pdfReports !== undefined ? Boolean(limits.pdfReports) : plan.limits.pdfReports,
      priorityAi: limits.priorityAi !== undefined ? Boolean(limits.priorityAi) : plan.limits.priorityAi,
    };
  }

  if (fairUseLimits !== undefined) {
    plan.fairUseLimits = {
      ...(plan.fairUseLimits || {
        maxAiRequestsPerDay: 40,
        maxImageAnalysesPerDay: 15,
        maxHomeScansPerDay: 3,
        maxConcurrentRequests: 1,
        maxVoiceMinutesPerDay: 20,
        maxImageSizeMB: 10,
      }),
      ...fairUseLimits,
    };
  }

  if (enabled !== undefined) plan.enabled = Boolean(enabled);
  if (featured !== undefined) plan.featured = Boolean(featured);
  if (displayOrder !== undefined) plan.displayOrder = Number(displayOrder);
  if (promotionalPrice !== undefined) plan.promotionalPrice = promotionalPrice === null ? undefined : Number(promotionalPrice);
  if (originalPrice !== undefined) plan.originalPrice = originalPrice === null ? undefined : Number(originalPrice);
  if (discountPercentage !== undefined) plan.discountPercentage = discountPercentage === null ? undefined : Number(discountPercentage);

  adminStore.saveToDisk();

  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    priceChanged ? 'PLAN_PRICE_CHANGED' : 'PLAN_CONFIG_UPDATED',
    plan.id,
    `Updated plan "${plan.name}": Price ${plan.currency}${plan.price}/${plan.billingPeriod}, Enabled: ${plan.enabled}, Ads: ${plan.showAds ? 'ON' : 'OFF'}`
  );

  res.json({
    success: true,
    plan,
    priceHistory: adminStore.priceHistory,
    message: 'Plan configuration saved successfully. Active user subscriptions remain protected at their original rate.',
  });
};

router.put('/pricing/:id', requireVerifiedAdmin(), updatePlanHandler);
router.put('/plans/:id', requireVerifiedAdmin(), updatePlanHandler);

const resetPlanHandler = (req: AdminAuthRequest, res: Response) => {
  const defaultTemplate = INITIAL_PLANS.find((p) => p.id === req.params.id);
  if (!defaultTemplate) {
    return res.status(404).json({ error: 'Default template for this plan not found.' });
  }

  const planIdx = adminStore.plans.findIndex((p) => p.id === req.params.id);
  if (planIdx === -1) {
    return res.status(404).json({ error: 'Plan not found.' });
  }

  const currentPlan = adminStore.plans[planIdx];
  const oldPrice = currentPlan.price;

  // Deep clone default template
  adminStore.plans[planIdx] = JSON.parse(JSON.stringify(defaultTemplate));

  if (oldPrice !== defaultTemplate.price) {
    adminStore.priceHistory.unshift({
      id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      planId: defaultTemplate.id,
      planName: defaultTemplate.name,
      oldPrice,
      newPrice: defaultTemplate.price,
      currency: defaultTemplate.currency,
      adminId: req.admin!.id,
      adminName: req.admin!.name,
      timestamp: new Date().toISOString(),
      notes: 'Reset plan to factory default pricing and specifications.',
    });
  }

  adminStore.saveToDisk();

  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'PLAN_RESET_TO_DEFAULT',
    defaultTemplate.id,
    `Reset plan "${defaultTemplate.name}" to factory defaults (Price: ${defaultTemplate.currency}${defaultTemplate.price})`
  );

  res.json({
    success: true,
    plan: adminStore.plans[planIdx],
    priceHistory: adminStore.priceHistory,
    message: `Plan "${defaultTemplate.name}" was reset to factory defaults.`,
  });
};

router.post('/pricing/:id/reset', requireVerifiedAdmin(), resetPlanHandler);
router.post('/plans/:id/reset', requireVerifiedAdmin(), resetPlanHandler);

// ==========================================
// 5. USAGE LIMITS
// ==========================================

router.get('/usage-limits', requireAdminAuth(), (_req, res) => {
  res.json({ limits: adminStore.usageLimits });
});

router.put('/usage-limits', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  adminStore.usageLimits = { ...adminStore.usageLimits, ...req.body };
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'USAGE_LIMITS_UPDATED',
    'UsageLimitsConfig',
    'Updated free usage limits and thresholds.'
  );
  res.json({ success: true, limits: adminStore.usageLimits });
});

// ==========================================
// 6. AI CONTROL CENTER & SETTINGS
// ==========================================

router.get('/ai/settings', requireAdminAuth(), (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

  const totalReqs = adminStore.requestLogs.length || 120;
  const failedReqs = adminStore.requestLogs.filter((r) => !r.success).length;
  const avgLatency =
    totalReqs > 0
      ? Math.round(
          adminStore.requestLogs.reduce((acc, r) => acc + (r.responseTimeMs || 850), 0) /
            (adminStore.requestLogs.length || 1)
        )
      : 820;

  res.json({
    settings: adminStore.aiSettings,
    apiKeyConfigured: hasKey,
    apiKeyStatus: hasKey ? 'Configured ✓' : 'Not Configured ✕',
    stats: {
      totalRequests: totalReqs,
      successfulRequests: totalReqs - failedReqs,
      failedRequests: failedReqs,
      averageResponseTimeMs: avgLatency,
      estimatedUsageUSD: `$${(totalReqs * 0.0018).toFixed(3)}`,
    },
  });
});

router.put('/ai/settings', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const { activeModel, temperature, maxResponseLength, languageBehavior, imageAnalysisMode } = req.body;
  if (activeModel) adminStore.aiSettings.activeModel = activeModel;
  if (temperature !== undefined) adminStore.aiSettings.temperature = Number(temperature);
  if (maxResponseLength !== undefined) adminStore.aiSettings.maxResponseLength = Number(maxResponseLength);
  if (languageBehavior) adminStore.aiSettings.languageBehavior = languageBehavior;
  if (imageAnalysisMode) adminStore.aiSettings.imageAnalysisMode = imageAnalysisMode;

  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'AI_SETTINGS_UPDATED',
    adminStore.aiSettings.activeModel,
    `Updated model parameters (temp: ${adminStore.aiSettings.temperature}, model: ${adminStore.aiSettings.activeModel})`
  );

  res.json({ success: true, settings: adminStore.aiSettings });
});

// POST /api/admin/ai/test-ai (Real test to Gemini)
router.post('/ai/test-ai', requireVerifiedAdmin(), async (req: AdminAuthRequest, res) => {
  const startTime = Date.now();
  const ai = getGenAIClient();
  if (!ai) {
    return res.status(503).json({
      success: false,
      error: 'GEMINI_API_KEY is not configured on the server',
      latencyMs: Date.now() - startTime,
    });
  }

  try {
    const modelName = adminStore.aiSettings.activeModel || 'gemini-3.1-flash-lite';
    const promptText =
      req.body?.prompt?.trim() ||
      'Give a brief 1-sentence traditional Vastu guideline for the North-East corner.';

    const systemInstruction = [
      adminStore.systemPrompts.identity,
      adminStore.systemPrompts.guidelines,
      adminStore.systemPrompts.responseStyle,
      adminStore.systemPrompts.hindiHinglishInstructions,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      config: {
        systemInstruction: systemInstruction || undefined,
        maxOutputTokens: Math.min(adminStore.aiSettings.maxResponseLength || 256, 300),
        temperature: adminStore.aiSettings.temperature ?? 0.3,
      },
    });

    const latencyMs = Date.now() - startTime;
    const reply = response.text?.trim() || 'AI response received successfully.';

    adminStore.recordAIRequest({
      requestType: 'test_ai',
      model: modelName,
      httpStatus: 200,
      responseTimeMs: latencyMs,
      success: true,
      userQuerySnippet: promptText.slice(0, 100),
    });

    return res.json({
      success: true,
      model: modelName,
      modelUsed: modelName,
      latencyMs,
      reply,
      sampleOutput: reply,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const modelName = adminStore.aiSettings.activeModel || 'gemini-3.1-flash-lite';
    adminStore.recordAIRequest({
      requestType: 'test_ai',
      model: modelName,
      httpStatus: err?.status || 500,
      responseTimeMs: latencyMs,
      success: false,
      errorCategory: err?.message || 'Gemini API call failed',
    });

    return res.status(500).json({
      success: false,
      error: err?.message || 'AI test request failed',
      latencyMs,
      model: modelName,
      modelUsed: modelName,
    });
  }
});

// ==========================================
// 7. AI SYSTEM PROMPT MANAGEMENT
// ==========================================

router.get('/ai/prompts', requireAdminAuth(), (_req, res) => {
  res.json({
    prompts: adminStore.systemPrompts,
    history: adminStore.promptHistory,
  });
});

router.put('/ai/prompts', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const updated = {
    ...adminStore.systemPrompts,
    ...req.body,
    version: adminStore.systemPrompts.version + 1,
    lastUpdated: new Date().toISOString(),
  };

  adminStore.systemPrompts = updated;
  adminStore.promptHistory.unshift({
    version: updated.version,
    date: updated.lastUpdated,
    content: updated,
  });
  if (adminStore.promptHistory.length > 10) adminStore.promptHistory.pop();

  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'AI_PROMPTS_UPDATED',
    `v${updated.version}`,
    'Updated Vastu AI system prompt and instructions.'
  );

  res.json({ success: true, prompts: adminStore.systemPrompts });
});

router.post('/ai/prompts/restore-defaults', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const defaultPrompt: typeof adminStore.systemPrompts = {
    identity:
      'You are VastuVision AI, a calm, deeply knowledgeable, practical Traditional Vastu Shastra advisor.',
    guidelines:
      'Prioritize non-structural solutions, elemental balance (Agni, Vayu, Jal, Prithvi, Akash), and never induce fear.',
    responseStyle: 'Concise, respectful, clean formatting, bold directional markers.',
    hindiHinglishInstructions: 'Natural, warm colloquial Hinglish or Hindi matching the user query.',
    imageAnalysisInstructions: 'Audit visible room features: colors, wall mounts, daylight, open doorways.',
    safetyInstructions: 'Vastu guidance is environmental harmony advice, not medical or legal diagnoses.',
    disclaimer: 'Guidance based on traditional Vedic architectural principles and modern lifestyle design.',
    followUpRules: 'Provide 3 relevant follow-up questions tailored to the room context.',
    version: adminStore.systemPrompts.version + 1,
    lastUpdated: new Date().toISOString(),
  };

  adminStore.systemPrompts = defaultPrompt;
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'AI_PROMPTS_RESET',
    `v${defaultPrompt.version}`,
    'Restored default Vastu AI system instructions.'
  );

  res.json({ success: true, prompts: defaultPrompt });
});

// ==========================================
// 8. VASTU KNOWLEDGE BASE (CRUD)
// ==========================================

router.get('/knowledge', requireAdminAuth(), (req, res) => {
  const search = ((req.query.search || '') as string).toLowerCase().trim();
  const category = (req.query.category as string) || 'all';
  const status = (req.query.status as string) || 'all';

  let list = [...adminStore.knowledge];

  if (search) {
    list = list.filter(
      (k) =>
        k.title.toLowerCase().includes(search) ||
        k.question.toLowerCase().includes(search) ||
        k.traditionalGuidance.toLowerCase().includes(search) ||
        k.keywords.some((kw) => kw.toLowerCase().includes(search))
    );
  }

  if (category !== 'all') {
    list = list.filter((k) => k.category.toLowerCase() === category.toLowerCase());
  }

  if (status !== 'all') {
    list = list.filter((k) => k.status === status);
  }

  res.json({ knowledge: list, total: list.length });
});

router.post('/knowledge', requireAdminAuth(), (req: AdminAuthRequest, res) => {
  const {
    title,
    category,
    question,
    traditionalGuidance,
    recommendedDirection,
    lessPreferredDirection,
    recommendedPlacement,
    alternativeSolution,
    explanation,
    keywords = [],
    language = 'All',
    status = 'published',
    priority = 'medium',
  } = req.body;

  if (!title || !category || !traditionalGuidance) {
    return res.status(400).json({ error: 'Title, category, and traditional guidance are required' });
  }

  const newItem = {
    id: 'vk_' + Date.now(),
    title,
    category,
    question: question || title,
    traditionalGuidance,
    recommendedDirection: recommendedDirection || 'North/East',
    lessPreferredDirection: lessPreferredDirection || 'South/South-West',
    recommendedPlacement: recommendedPlacement || '',
    alternativeSolution: alternativeSolution || '',
    explanation: explanation || '',
    keywords: Array.isArray(keywords) ? keywords : String(keywords).split(',').map((s) => s.trim()),
    language,
    status,
    priority,
    updatedAt: new Date().toISOString(),
  };

  adminStore.knowledge.unshift(newItem);
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'KNOWLEDGE_CREATED',
    newItem.id,
    `Added Vastu topic: ${newItem.title} (${newItem.category})`
  );

  res.json({ success: true, item: newItem });
});

router.put('/knowledge/:id', requireAdminAuth(), (req: AdminAuthRequest, res) => {
  const item = adminStore.knowledge.find((k) => k.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Knowledge entry not found' });

  Object.assign(item, req.body, { updatedAt: new Date().toISOString() });
  if (typeof req.body.keywords === 'string') {
    item.keywords = req.body.keywords.split(',').map((s: string) => s.trim());
  }

  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'KNOWLEDGE_UPDATED',
    item.id,
    `Updated Vastu entry: ${item.title}`
  );

  res.json({ success: true, item });
});

router.delete('/knowledge/:id', requireAdminAuth(), (req: AdminAuthRequest, res) => {
  const idx = adminStore.knowledge.findIndex((k) => k.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Knowledge entry not found' });

  const removed = adminStore.knowledge.splice(idx, 1)[0];
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'KNOWLEDGE_DELETED',
    removed.id,
    `Deleted Vastu entry: ${removed.title}`
  );

  res.json({ success: true });
});

// ==========================================
// 9. POPULAR QUESTIONS MANAGEMENT
// ==========================================

const getPopularQuestionsHandler = (_req: any, res: Response) => {
  res.json({ questions: adminStore.popularQuestions });
};

const createPopularQuestionHandler = (req: AdminAuthRequest, res: Response) => {
  const { query, category, displayOrder, enabled = true } = req.body;
  if (!query) return res.status(400).json({ error: 'Question query string is required' });

  const newItem = {
    id: 'pq_' + Date.now(),
    query,
    category: category || 'General',
    displayOrder: displayOrder || adminStore.popularQuestions.length + 1,
    enabled: Boolean(enabled),
    searchCount: 0,
  };

  adminStore.popularQuestions.push(newItem);
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'POPULAR_QUESTION_ADDED',
    newItem.id,
    `Added popular question: "${query}"`
  );

  res.json({ success: true, item: newItem });
};

const updatePopularQuestionHandler = (req: AdminAuthRequest, res: Response) => {
  const item = adminStore.popularQuestions.find((q) => q.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Question not found' });

  Object.assign(item, req.body);
  adminStore.saveToDisk();
  res.json({ success: true, item });
};

const deletePopularQuestionHandler = (req: AdminAuthRequest, res: Response) => {
  const idx = adminStore.popularQuestions.findIndex((q) => q.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Question not found' });

  const removed = adminStore.popularQuestions.splice(idx, 1)[0];
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'POPULAR_QUESTION_DELETED',
    removed.id,
    `Deleted popular question: "${removed.query}"`
  );

  res.json({ success: true });
};

// ==========================================
// 10. CATEGORIES MANAGEMENT
// ==========================================

const getCategoriesHandler = (_req: any, res: Response) => {
  res.json({ categories: adminStore.categories });
};

const createCategoryHandler = (req: AdminAuthRequest, res: Response) => {
  const { name, type = 'room', icon = 'Home', description = '', displayOrder, active = true, featured = false } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const newItem = {
    id: 'cat_' + Date.now(),
    name,
    type,
    icon,
    description,
    displayOrder: displayOrder || adminStore.categories.length + 1,
    active: Boolean(active),
    featured: Boolean(featured),
  };

  adminStore.categories.push(newItem);
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'CATEGORY_ADDED',
    newItem.id,
    `Added category: ${name}`
  );

  res.json({ success: true, item: newItem });
};

const updateCategoryHandler = (req: AdminAuthRequest, res: Response) => {
  const item = adminStore.categories.find((c) => c.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Category not found' });

  Object.assign(item, req.body);
  adminStore.saveToDisk();
  res.json({ success: true, item });
};

const deleteCategoryHandler = (req: AdminAuthRequest, res: Response) => {
  const idx = adminStore.categories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });

  const removed = adminStore.categories.splice(idx, 1)[0];
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'CATEGORY_DELETED',
    removed.id,
    `Deleted category: ${removed.name}`
  );

  res.json({ success: true });
};

// ==========================================
// 11. SEO & CONTENT MANAGEMENT
// ==========================================

const getSeoPagesHandler = (_req: any, res: Response) => {
  res.json({ pages: adminStore.seoPages });
};

const createSeoPageHandler = (req: AdminAuthRequest, res: Response) => {
  const { slug, pageTitle, seoTitle, metaDescription, keywords, introduction, mainContent, status = 'draft' } = req.body;
  if (!slug || !pageTitle) return res.status(400).json({ error: 'Slug and Page Title are required' });

  const newItem = {
    id: 'seo_' + Date.now(),
    slug: slug.replace(/^\/+/, ''),
    pageTitle,
    seoTitle: seoTitle || pageTitle,
    metaDescription: metaDescription || '',
    keywords: keywords || '',
    introduction: introduction || '',
    mainContent: mainContent || '',
    faq: req.body.faq || [],
    relatedTopics: req.body.relatedTopics || [],
    status,
    publishDate: new Date().toISOString().split('T')[0],
  };

  adminStore.seoPages.push(newItem);
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'SEO_PAGE_CREATED',
    newItem.slug,
    `Created SEO page: /vastu/${newItem.slug}`
  );

  res.json({ success: true, page: newItem });
};

const updateSeoPageHandler = (req: AdminAuthRequest, res: Response) => {
  const page = adminStore.seoPages.find((p) => p.id === req.params.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });

  Object.assign(page, req.body);
  adminStore.saveToDisk();
  res.json({ success: true, page });
};

const deleteSeoPageHandler = (req: AdminAuthRequest, res: Response) => {
  const idx = adminStore.seoPages.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Page not found' });

  const removed = adminStore.seoPages.splice(idx, 1)[0];
  adminStore.saveToDisk();
  res.json({ success: true });
};

// ==========================================
// 12. FAQs MANAGEMENT
// ==========================================

const getFaqsHandler = (_req: any, res: Response) => {
  res.json({ faqs: adminStore.faqs });
};

const createFaqHandler = (req: AdminAuthRequest, res: Response) => {
  const { question, answer, category = 'General', language = 'English', seoVisibility = true, active = true } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'Question and answer are required' });

  const newItem = {
    id: 'faq_' + Date.now(),
    question,
    answer,
    category,
    language,
    seoVisibility: Boolean(seoVisibility),
    displayOrder: adminStore.faqs.length + 1,
    active: Boolean(active),
  };

  adminStore.faqs.push(newItem);
  adminStore.saveToDisk();
  res.json({ success: true, faq: newItem });
};

const updateFaqHandler = (req: AdminAuthRequest, res: Response) => {
  const item = adminStore.faqs.find((f) => f.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'FAQ not found' });

  Object.assign(item, req.body);
  adminStore.saveToDisk();
  res.json({ success: true, faq: item });
};

const deleteFaqHandler = (req: AdminAuthRequest, res: Response) => {
  const idx = adminStore.faqs.findIndex((f) => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'FAQ not found' });

  adminStore.faqs.splice(idx, 1);
  adminStore.saveToDisk();
  res.json({ success: true });
};

// Register /content sub-router for ContentManagerTab
const contentRouter = Router();
contentRouter.get('/popular-questions', requireAdminAuth(), getPopularQuestionsHandler);
contentRouter.post('/popular-questions', requireAdminAuth(), createPopularQuestionHandler);
contentRouter.put('/popular-questions/:id', requireAdminAuth(), updatePopularQuestionHandler);
contentRouter.delete('/popular-questions/:id', requireAdminAuth(), deletePopularQuestionHandler);

contentRouter.get('/categories', requireAdminAuth(), getCategoriesHandler);
contentRouter.post('/categories', requireAdminAuth(), createCategoryHandler);
contentRouter.put('/categories/:id', requireAdminAuth(), updateCategoryHandler);
contentRouter.delete('/categories/:id', requireAdminAuth(), deleteCategoryHandler);

contentRouter.get('/seo-pages', requireAdminAuth(), getSeoPagesHandler);
contentRouter.post('/seo-pages', requireAdminAuth(), createSeoPageHandler);
contentRouter.put('/seo-pages/:id', requireAdminAuth(), updateSeoPageHandler);
contentRouter.delete('/seo-pages/:id', requireAdminAuth(), deleteSeoPageHandler);

contentRouter.get('/faqs', requireAdminAuth(), getFaqsHandler);
contentRouter.post('/faqs', requireAdminAuth(), createFaqHandler);
contentRouter.put('/faqs/:id', requireAdminAuth(), updateFaqHandler);
contentRouter.delete('/faqs/:id', requireAdminAuth(), deleteFaqHandler);

router.use('/content', contentRouter);

// Also register directly on root admin router
router.get('/popular-questions', requireAdminAuth(), getPopularQuestionsHandler);
router.post('/popular-questions', requireAdminAuth(), createPopularQuestionHandler);
router.put('/popular-questions/:id', requireAdminAuth(), updatePopularQuestionHandler);
router.delete('/popular-questions/:id', requireAdminAuth(), deletePopularQuestionHandler);

router.get('/categories', requireAdminAuth(), getCategoriesHandler);
router.post('/categories', requireAdminAuth(), createCategoryHandler);
router.put('/categories/:id', requireAdminAuth(), updateCategoryHandler);
router.delete('/categories/:id', requireAdminAuth(), deleteCategoryHandler);

router.get('/seo-pages', requireAdminAuth(), getSeoPagesHandler);
router.post('/seo-pages', requireAdminAuth(), createSeoPageHandler);
router.put('/seo-pages/:id', requireAdminAuth(), updateSeoPageHandler);
router.delete('/seo-pages/:id', requireAdminAuth(), deleteSeoPageHandler);

router.get('/faqs', requireAdminAuth(), getFaqsHandler);
router.post('/faqs', requireAdminAuth(), createFaqHandler);
router.put('/faqs/:id', requireAdminAuth(), updateFaqHandler);
router.delete('/faqs/:id', requireAdminAuth(), deleteFaqHandler);

// ==========================================
// 13. AI ANALYSES & HEALTH & ERROR LOGS
// ==========================================

router.get('/ai/analyses', requireAdminAuth(), (_req, res) => {
  res.json({ analyses: adminStore.anonymizedAnalyses });
});

router.delete('/ai/analyses/:id', requireAdminAuth(), (req: AdminAuthRequest, res) => {
  const idx = adminStore.anonymizedAnalyses.findIndex((a) => a.id === req.params.id);
  if (idx !== -1) {
    adminStore.anonymizedAnalyses.splice(idx, 1);
  }
  res.json({ success: true });
});

router.get('/ai/health', requireAdminAuth(), (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const failureCount = adminStore.requestLogs.filter((r) => !r.success).length;

  res.json({
    geminiStatus: hasKey ? 'Connected' : 'Missing Key',
    textAiWorking: hasKey,
    imageAiWorking: hasKey,
    voiceProcessingWorking: hasKey,
    failureCount,
    averageResponseTimeMs: 840,
    lastSuccessfulRequest: new Date().toISOString(),
    activeModel: adminStore.aiSettings.activeModel,
  });
});

const getAiErrorsHandler = (_req: any, res: Response) => {
  const errors = adminStore.requestLogs.filter((r) => !r.success);
  res.json({ errors, errorLogs: errors });
};

const clearAiErrorsHandler = (_req: any, res: Response) => {
  adminStore.requestLogs = adminStore.requestLogs.filter((r) => r.success);
  res.json({ success: true, message: 'Error logs cleared' });
};

router.get('/ai/errors', requireAdminAuth(), getAiErrorsHandler);
router.get('/ai/error-logs', requireAdminAuth(), getAiErrorsHandler);

router.delete('/ai/errors/clear', requireAdminAuth(), clearAiErrorsHandler);
router.delete('/ai/error-logs', requireAdminAuth(), clearAiErrorsHandler);
router.delete('/ai/errors', requireAdminAuth(), clearAiErrorsHandler);

// ==========================================
// 14. SUBSCRIPTIONS & COUPONS
// ==========================================

router.get('/subscriptions', requireAdminAuth(), (_req, res) => {
  res.json({ subscriptions: adminStore.subscriptions });
});

router.post('/subscriptions/grant', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const { targetUserId, planId, durationMonths = 1, reason = 'Administrative grant' } = req.body;
  if (!targetUserId || (planId !== 'pro' && planId !== 'expert')) {
    return res.status(400).json({ error: 'targetUserId and valid planId (pro or expert) are required' });
  }

  const grantResult = adminStore.manualGrantSubscription(
    { id: req.admin!.id, name: req.admin!.name },
    targetUserId,
    planId,
    Number(durationMonths) || 1,
    reason
  );

  res.json(grantResult);
});

router.post('/subscriptions/:id/cancel', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const { reason = 'Cancelled by administrator' } = req.body;
  const result = adminStore.cancelUserSubscription(
    { id: req.admin!.id, name: req.admin!.name },
    req.params.id,
    reason
  );

  if (!result.success) {
    return res.status(404).json(result);
  }
  res.json(result);
});

router.get('/payments/orders', requireAdminAuth(), (_req, res) => {
  res.json({ orders: adminStore.paymentOrders });
});

router.get('/payments/events', requireAdminAuth(), (_req, res) => {
  res.json({ events: adminStore.paymentEvents });
});

// GET /api/admin/payments/config: Get authoritative status and masked credentials
router.get('/payments/config', requireAdminAuth(), async (_req: AdminAuthRequest, res: Response) => {
  try {
    const config = await paymentConfigService.getAdminConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch payment config' });
  }
});

// POST /api/admin/payments/mode: Switch between TEST and LIVE mode with security checks
router.post('/payments/mode', requireAdminAuth(['SUPER_ADMIN', 'ADMIN']), async (req: AdminAuthRequest, res: Response) => {
  try {
    const { mode } = req.body;
    if (mode !== 'TEST' && mode !== 'LIVE') {
      return res.status(400).json({ success: false, error: "Mode must be 'TEST' or 'LIVE'" });
    }

    const result = await paymentConfigService.setMode(mode, req.admin);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Live payment configuration is incomplete.',
    });
  }
});

// POST /api/admin/payments/test-connection: Verify connection with Razorpay
router.post('/payments/test-connection', requireVerifiedAdmin(), async (req: AdminAuthRequest, res: Response) => {
  try {
    const { mode } = req.body;
    const result = await paymentConfigService.testConnection(mode);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Connection test failed' });
  }
});

// PUT /api/admin/payments/credentials: Update server memory vault credentials (never written to JSON files)
router.put('/payments/credentials', requireAdminAuth(['SUPER_ADMIN', 'ADMIN']), async (req: AdminAuthRequest, res: Response) => {
  try {
    const result = await paymentConfigService.updateCredentials(req.body, req.admin!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update credentials' });
  }
});

// POST /api/admin/payments/reset-defaults: Reset payment gateway mode to TEST
router.post('/payments/reset-defaults', requireAdminAuth(['SUPER_ADMIN']), async (req: AdminAuthRequest, res: Response) => {
  try {
    const result = await paymentConfigService.setMode('TEST', req.admin);
    res.json({
      success: true,
      message: 'Reset payment gateway configuration to TEST mode.',
      config: result.config,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to reset defaults' });
  }
});

router.post('/users/:id/adjust-credits', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const { amount, reason = 'Admin adjustment' } = req.body;
  if (typeof amount !== 'number') {
    return res.status(400).json({ error: 'amount (number) is required' });
  }

  const result = adminStore.adjustUserCredits(
    req.params.id,
    amount,
    reason,
    req.admin!.name
  );
  res.json(result);
});

router.put('/subscriptions/:id/status', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const sub = adminStore.subscriptions.find((s) => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  const { status, adminNotes } = req.body;
  const oldStatus = sub.status;
  sub.status = status;

  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'SUBSCRIPTION_STATUS_CHANGED',
    sub.id,
    `Changed status of ${sub.userName} (${sub.planName}) from ${oldStatus} to ${status}. Notes: ${adminNotes || 'None'}`
  );

  res.json({ success: true, subscription: sub });
});

router.get('/coupons', requireAdminAuth(), (_req, res) => {
  res.json({ coupons: adminStore.coupons });
});

router.post('/coupons', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const { code, discountType, maxUses, perUserLimit, startDate, expiryDate, applicablePlan, active = true } = req.body;
  const rawDiscount = req.body.discountAmount ?? req.body.discountPercent ?? req.body.discountPercentage ?? req.body.percentage ?? req.body.discount;
  if (!code || rawDiscount === undefined || rawDiscount === null || rawDiscount === '') {
    return res.status(400).json({ error: 'Code and discount amount are required' });
  }

  const numDiscount = Number(rawDiscount);
  if (isNaN(numDiscount) || numDiscount <= 0) {
    return res.status(400).json({ error: 'Discount must be a positive number' });
  }

  const isPercentage = (discountType || 'percentage') === 'percentage';
  const validatedPercent = isPercentage ? Math.min(100, Math.max(1, Math.round(numDiscount))) : 0;
  const finalDiscountAmount = isPercentage ? validatedPercent : Math.max(1, Math.round(numDiscount));

  const newCoupon = {
    id: 'cp_' + Date.now(),
    code: String(code).toUpperCase().trim(),
    discountType: (isPercentage ? 'percentage' : 'fixed') as 'percentage' | 'fixed',
    discountAmount: finalDiscountAmount,
    discountPercent: validatedPercent,
    discountPercentage: validatedPercent,
    percentage: validatedPercent,
    discount: finalDiscountAmount,
    maxUses: Number(maxUses) || 100,
    usedCount: 0,
    perUserLimit: Number(perUserLimit) || 1,
    startDate: startDate || new Date().toISOString().split('T')[0],
    expiryDate: expiryDate || '2026-12-31',
    applicablePlan: (applicablePlan || 'all') as 'all' | 'pro' | 'expert',
    active: Boolean(active),
  };

  adminStore.coupons.push(newCoupon);
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'COUPON_CREATED',
    newCoupon.code,
    `Created coupon ${newCoupon.code} (${newCoupon.discountAmount}${newCoupon.discountType === 'percentage' ? '%' : '₹'} off)`
  );

  res.json({ success: true, coupon: newCoupon });
});

router.put('/coupons/:id', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const coupon = adminStore.coupons.find((c) => c.id === req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

  const rawDiscount = req.body.discountAmount ?? req.body.discountPercent ?? req.body.discountPercentage ?? req.body.percentage ?? req.body.discount;
  if (rawDiscount !== undefined && rawDiscount !== null && rawDiscount !== '') {
    const num = Number(rawDiscount);
    if (!isNaN(num) && num > 0) {
      const isPct = (req.body.discountType || coupon.discountType) === 'percentage';
      const pct = isPct ? Math.min(100, Math.max(1, Math.round(num))) : 0;
      coupon.discountAmount = isPct ? pct : Math.max(1, Math.round(num));
      (coupon as any).discountPercent = pct;
      (coupon as any).discountPercentage = pct;
      (coupon as any).percentage = pct;
      (coupon as any).discount = coupon.discountAmount;
    }
  }

  Object.assign(coupon, req.body);
  if (req.body.code) coupon.code = String(req.body.code).toUpperCase().trim();
  adminStore.saveToDisk();
  res.json({ success: true, coupon });
});

router.delete('/coupons/:id', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const idx = adminStore.coupons.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Coupon not found' });

  const removed = adminStore.coupons.splice(idx, 1)[0];
  adminStore.saveToDisk();
  res.json({ success: true });
});

// ==========================================
// 15. NOTIFICATIONS, SETTINGS, FEATURE FLAGS
// ==========================================

router.get('/notifications', requireAdminAuth(), (_req, res) => {
  res.json({ notifications: adminStore.notifications });
});

router.post('/notifications', requireAdminAuth(), (req: AdminAuthRequest, res) => {
  const { title, message, type = 'announcement', startDate, endDate, active = true, dismissible = true } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

  const newItem = {
    id: 'notif_' + Date.now(),
    title,
    message,
    type,
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: endDate || '2026-12-31',
    active: Boolean(active),
    dismissible: Boolean(dismissible),
  };

  adminStore.notifications.push(newItem);
  adminStore.saveToDisk();
  res.json({ success: true, notification: newItem });
});

router.put('/notifications/:id', requireAdminAuth(), (req: AdminAuthRequest, res) => {
  const notif = adminStore.notifications.find((n) => n.id === req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });

  Object.assign(notif, req.body);
  adminStore.saveToDisk();
  res.json({ success: true, notification: notif });
});

router.delete('/notifications/:id', requireAdminAuth(), (req: AdminAuthRequest, res) => {
  const idx = adminStore.notifications.findIndex((n) => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Notification not found' });

  adminStore.notifications.splice(idx, 1);
  adminStore.saveToDisk();
  res.json({ success: true });
});

router.get('/settings', requireAdminAuth(), (_req, res) => {
  res.json({ settings: adminStore.appSettings });
});

router.put('/settings', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  adminStore.appSettings = { ...adminStore.appSettings, ...req.body };
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'APP_SETTINGS_UPDATED',
    'AppSettingsConfig',
    'Updated application global settings.'
  );
  res.json({ success: true, settings: adminStore.appSettings });
});

router.get('/feature-flags', requireAdminAuth(), (_req, res) => {
  res.json({ featureFlags: adminStore.featureFlags, flags: adminStore.featureFlags });
});

router.put('/feature-flags', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  adminStore.featureFlags = { ...adminStore.featureFlags, ...req.body };
  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'FEATURE_FLAGS_UPDATED',
    'FeatureFlagsConfig',
    'Updated feature toggle switches.'
  );
  res.json({ success: true, featureFlags: adminStore.featureFlags, flags: adminStore.featureFlags });
});

router.get('/report-settings', requireAdminAuth(), (_req, res) => {
  res.json({ reportSettings: adminStore.reportSettings });
});

router.put('/report-settings', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  adminStore.reportSettings = { ...adminStore.reportSettings, ...req.body };
  adminStore.saveToDisk();
  res.json({ success: true, reportSettings: adminStore.reportSettings });
});

// ==========================================
// 16. FEEDBACK, QUALITY & AUDIT LOGS
// ==========================================

router.get('/feedback', requireAdminAuth(), (_req, res) => {
  res.json({ feedback: adminStore.feedback });
});

router.put('/feedback/:id', requireAdminAuth(), (req: AdminAuthRequest, res) => {
  const fb = adminStore.feedback.find((f) => f.id === req.params.id);
  if (!fb) return res.status(404).json({ error: 'Feedback item not found' });

  if (req.body.status) fb.status = req.body.status;
  if (req.body.adminNotes !== undefined) fb.adminNotes = req.body.adminNotes;
  adminStore.saveToDisk();
  res.json({ success: true, feedback: fb });
});

const getAiQualityHandler = (_req: any, res: Response) => {
  const total = adminStore.qualityLogs.length;
  const positive = adminStore.qualityLogs.filter((q) => q.rating === 'helpful').length;
  const negative = adminStore.qualityLogs.filter((q) => q.rating === 'not_helpful').length;

  res.json({
    total,
    positive,
    negative,
    satisfactionRate: total > 0 ? `${Math.round((positive / total) * 100)}%` : '100%',
    logs: adminStore.qualityLogs,
    qualityLogs: adminStore.qualityLogs,
  });
};

router.get('/ai-quality', requireAdminAuth(), getAiQualityHandler);
router.get('/ai/quality-feedback', requireAdminAuth(), getAiQualityHandler);

const getAuditLogsHandler = (req: any, res: Response) => {
  const search = ((req.query.search || '') as string).toLowerCase().trim();
  let logs = [...adminStore.auditLogs];
  if (search) {
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(search) ||
        l.affectedItem.toLowerCase().includes(search) ||
        l.details.toLowerCase().includes(search) ||
        l.adminName.toLowerCase().includes(search)
    );
  }
  res.json({ logs, auditLogs: logs });
};

router.get('/audit-logs', requireAdminAuth(), getAuditLogsHandler);
router.get('/audit', requireAdminAuth(), getAuditLogsHandler);

// ==========================================
// 16. MONETIZATION & CREDIT MANAGEMENT
// ==========================================

router.get('/monetization/credits', requireAdminAuth(), (_req, res) => {
  res.json({ settings: adminStore.creditSettings });
});

router.put('/monetization/credits', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const body = req.body;
  if (body.newUserFreeChatMinutes !== undefined)
    adminStore.creditSettings.newUserFreeChatMinutes = Number(body.newUserFreeChatMinutes);
  if (body.newUserFreePhotos !== undefined)
    adminStore.creditSettings.newUserFreePhotos = Number(body.newUserFreePhotos);
  if (body.proCreditsPerMonth !== undefined)
    adminStore.creditSettings.proCreditsPerMonth = Number(body.proCreditsPerMonth);
  if (body.adRewardCredits !== undefined)
    adminStore.creditSettings.adRewardCredits = Number(body.adRewardCredits);
  if (body.textQuestionCost !== undefined)
    adminStore.creditSettings.textQuestionCost = Number(body.textQuestionCost);
  if (body.imageAnalysisCost !== undefined)
    adminStore.creditSettings.imageAnalysisCost = Number(body.imageAnalysisCost);
  if (body.voiceUsageCost !== undefined)
    adminStore.creditSettings.voiceUsageCost = Number(body.voiceUsageCost);
  if (body.roomScanCost !== undefined)
    adminStore.creditSettings.roomScanCost = Number(body.roomScanCost);
  if (body.completeHomeScanCost !== undefined)
    adminStore.creditSettings.completeHomeScanCost = Number(body.completeHomeScanCost);
  if (body.pdfReportCost !== undefined)
    adminStore.creditSettings.pdfReportCost = Number(body.pdfReportCost);
  if (body.freeCreditsExpire !== undefined)
    adminStore.creditSettings.freeCreditsExpire = Boolean(body.freeCreditsExpire);
  if (body.proCreditsRollover !== undefined)
    adminStore.creditSettings.proCreditsRollover = Boolean(body.proCreditsRollover);
  if (body.rewardedCreditsExpireDays !== undefined)
    adminStore.creditSettings.rewardedCreditsExpireDays = Number(body.rewardedCreditsExpireDays);

  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'CREDIT_SETTINGS_UPDATED',
    'Credit Control Center',
    `Updated free chat (${adminStore.creditSettings.newUserFreeChatMinutes}m), photos (${adminStore.creditSettings.newUserFreePhotos}), PRO credits (${adminStore.creditSettings.proCreditsPerMonth})`
  );

  res.json({ success: true, settings: adminStore.creditSettings });
});

router.get('/monetization/rewarded-ads', requireAdminAuth(), (_req, res) => {
  res.json({
    success: true,
    settings: adminStore.rewardedAdSettings,
    config: adminStore.rewardedAdSettings,
  });
});

router.put('/monetization/rewarded-ads', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const body = req.body;
  if (body.enabled !== undefined) adminStore.rewardedAdSettings.enabled = Boolean(body.enabled);
  if (body.rewardCredits !== undefined)
    adminStore.rewardedAdSettings.rewardCredits = Number(body.rewardCredits);
  if (body.maxAdsPerDay !== undefined)
    adminStore.rewardedAdSettings.maxAdsPerDay = Number(body.maxAdsPerDay);
  if (body.maxAdsPerHour !== undefined)
    adminStore.rewardedAdSettings.maxAdsPerHour = Number(body.maxAdsPerHour);
  if (body.cooldownSeconds !== undefined)
    adminStore.rewardedAdSettings.cooldownSeconds = Number(body.cooldownSeconds);
  if (body.showForFreeUsers !== undefined)
    adminStore.rewardedAdSettings.showForFreeUsers = Boolean(body.showForFreeUsers);
  if (body.showForProUsers !== undefined)
    adminStore.rewardedAdSettings.showForProUsers = Boolean(body.showForProUsers);
  if (body.showForExpertUsers !== undefined)
    adminStore.rewardedAdSettings.showForExpertUsers = Boolean(body.showForExpertUsers);
  if (body.provider) adminStore.rewardedAdSettings.provider = body.provider;
  if (body.webAdUnitId !== undefined) adminStore.rewardedAdSettings.webAdUnitId = body.webAdUnitId;
  if (body.admobAppId !== undefined) adminStore.rewardedAdSettings.admobAppId = body.admobAppId;
  if (body.admobRewardedAdUnitId !== undefined)
    adminStore.rewardedAdSettings.admobRewardedAdUnitId = body.admobRewardedAdUnitId;
  if (body.admobSsvSecretKey !== undefined)
    adminStore.rewardedAdSettings.admobSsvSecretKey = body.admobSsvSecretKey;

  adminStore.saveToDisk();
  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'REWARDED_ADS_CONFIG_UPDATED',
    'Rewarded Ad Engine',
    `Enabled: ${adminStore.rewardedAdSettings.enabled}, Reward: +${adminStore.rewardedAdSettings.rewardCredits}cr, Daily cap: ${adminStore.rewardedAdSettings.maxAdsPerDay}`
  );

  res.json({ success: true, settings: adminStore.rewardedAdSettings });
});

// ==========================================
// ADMOB AD SYSTEM ADMIN ROUTES
// ==========================================

const handleGetAdMobSettings = (_req: any, res: Response) => {
  res.json({
    success: true,
    adSettings: adminStore.adSettings,
    config: adminStore.adSettings,
    adAnalytics: adminStore.adAnalytics,
    analytics: adminStore.adAnalytics,
    effectiveConfig: adminStore.getEffectiveAdConfig('free'),
    auditLogs: adminStore.auditLogs
      .filter((l) => l.action.includes('AD'))
      .slice(0, 20),
  });
};

const handlePutAdMobSettings = (req: AdminAuthRequest, res: Response) => {
  const body = req.body?.adSettings || req.body?.config || req.body || {};
  const warnings: string[] = [];

  // Boolean toggles
  if (body.adsEnabled !== undefined) adminStore.adSettings.adsEnabled = Boolean(body.adsEnabled);
  if (body.testMode !== undefined) adminStore.adSettings.testMode = Boolean(body.testMode);
  if (body.interstitialEnabled !== undefined) adminStore.adSettings.interstitialEnabled = Boolean(body.interstitialEnabled);
  if (body.rewardedEnabled !== undefined) adminStore.adSettings.rewardedEnabled = Boolean(body.rewardedEnabled);
  if (body.bannerEnabled !== undefined) adminStore.adSettings.bannerEnabled = Boolean(body.bannerEnabled);

  // Production Ad Unit IDs
  if (body.interstitialAdUnitId !== undefined) {
    const val = String(body.interstitialAdUnitId).trim();
    if (val && !isValidAdMobAdUnitId(val)) {
      warnings.push('Interstitial Ad Unit ID does not match standard AdMob format (ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY).');
    }
    adminStore.adSettings.interstitialAdUnitId = val;
  }

  if (body.rewardedAdUnitId !== undefined) {
    const val = String(body.rewardedAdUnitId).trim();
    if (val && !isValidAdMobAdUnitId(val)) {
      warnings.push('Rewarded Ad Unit ID does not match standard AdMob format (ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY).');
    }
    adminStore.adSettings.rewardedAdUnitId = val;
  }

  if (body.fixedBannerAdUnitId !== undefined) {
    const val = String(body.fixedBannerAdUnitId).trim();
    if (val && !isValidAdMobAdUnitId(val)) {
      warnings.push('Fixed Banner Ad Unit ID does not match standard AdMob format (ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY).');
    }
    adminStore.adSettings.fixedBannerAdUnitId = val;
  }

  if (body.anchoredAdaptiveBannerAdUnitId !== undefined) {
    const val = String(body.anchoredAdaptiveBannerAdUnitId).trim();
    if (val && !isValidAdMobAdUnitId(val)) {
      warnings.push('Anchored Adaptive Banner Ad Unit ID does not match standard AdMob format (ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY).');
    }
    adminStore.adSettings.anchoredAdaptiveBannerAdUnitId = val;
  }

  // Rewarded settings
  if (body.rewardedCreditAmount !== undefined) {
    const val = Number(body.rewardedCreditAmount);
    if (!isNaN(val) && val >= 1) adminStore.adSettings.rewardedCreditAmount = val;
  }
  if (body.dailyRewardedAdLimit !== undefined) {
    const val = Number(body.dailyRewardedAdLimit);
    if (!isNaN(val) && val >= 1) adminStore.adSettings.dailyRewardedAdLimit = val;
  }
  if (body.rewardedCooldownSeconds !== undefined) {
    const val = Number(body.rewardedCooldownSeconds);
    if (!isNaN(val) && val >= 0) adminStore.adSettings.rewardedCooldownSeconds = val;
  }

  // Interstitial settings
  if (body.interstitialFrequency !== undefined) {
    const val = Number(body.interstitialFrequency);
    if (!isNaN(val) && val >= 1) adminStore.adSettings.interstitialFrequency = val;
  }
  if (body.interstitialCooldownSeconds !== undefined) {
    const val = Number(body.interstitialCooldownSeconds);
    if (!isNaN(val) && val >= 0) adminStore.adSettings.interstitialCooldownSeconds = val;
  }

  // Banner settings
  if (body.bannerFormat === 'fixed' || body.bannerFormat === 'anchored_adaptive') {
    adminStore.adSettings.bannerFormat = body.bannerFormat;
  }
  if (body.bannerPosition === 'top' || body.bannerPosition === 'bottom') {
    adminStore.adSettings.bannerPosition = body.bannerPosition;
  }

  // Plan toggles
  if (body.freePlanAdsEnabled !== undefined) adminStore.adSettings.freePlanAdsEnabled = Boolean(body.freePlanAdsEnabled);
  if (body.proPlanAdsEnabled !== undefined) adminStore.adSettings.proPlanAdsEnabled = Boolean(body.proPlanAdsEnabled);
  if (body.homeExpertAdsEnabled !== undefined) adminStore.adSettings.homeExpertAdsEnabled = Boolean(body.homeExpertAdsEnabled);

  // Backward sync with legacy settings
  adminStore.rewardedAdSettings.enabled = adminStore.adSettings.rewardedEnabled;
  adminStore.rewardedAdSettings.rewardCredits = adminStore.adSettings.rewardedCreditAmount;
  adminStore.rewardedAdSettings.maxAdsPerDay = adminStore.adSettings.dailyRewardedAdLimit;

  adminStore.saveToDisk();

  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'ADMOB_CONFIG_UPDATED',
    'Ads Management',
    `Updated AdMob config: TestMode=${adminStore.adSettings.testMode}, AdsEnabled=${adminStore.adSettings.adsEnabled}, RewardedCredit=${adminStore.adSettings.rewardedCreditAmount}`
  );

  res.json({
    success: true,
    adSettings: adminStore.adSettings,
    config: adminStore.adSettings,
    effectiveConfig: adminStore.getEffectiveAdConfig('free'),
    warnings: warnings.length > 0 ? warnings : undefined,
  });
};

router.get('/ads', requireAdminAuth(), handleGetAdMobSettings);
router.get('/ads/config', requireAdminAuth(), handleGetAdMobSettings);
router.put('/ads', requireVerifiedAdmin(), handlePutAdMobSettings);
router.put('/ads/config', requireVerifiedAdmin(), handlePutAdMobSettings);

router.post('/ads/reset-analytics', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  adminStore.adAnalytics = {
    adsRequested: 0,
    adsLoaded: 0,
    adsFailed: 0,
    rewardedAdsCompleted: 0,
    rewardedCreditsIssued: 0,
    interstitialImpressions: 0,
    bannerImpressions: 0,
    rewardedDailyLimitReached: 0,
  };

  adminStore.saveToDisk();

  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'ADMOB_ANALYTICS_RESET',
    'Ads Management',
    'Reset AdMob telemetry and impression counters to 0.'
  );

  res.json({ success: true, adAnalytics: adminStore.adAnalytics });
});

router.post('/ads/reset-defaults', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  adminStore.adSettings = {
    adsEnabled: true,
    testMode: true,
    interstitialEnabled: true,
    rewardedEnabled: true,
    bannerEnabled: true,

    interstitialAdUnitId: '',
    rewardedAdUnitId: '',
    fixedBannerAdUnitId: '',
    anchoredAdaptiveBannerAdUnitId: '',

    testInterstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
    testRewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
    testFixedBannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
    testAnchoredAdaptiveBannerAdUnitId: 'ca-app-pub-3940256099942544/9214589741',

    rewardedCreditAmount: 2,
    dailyRewardedAdLimit: 5,
    rewardedCooldownSeconds: 60,

    interstitialFrequency: 5,
    interstitialCooldownSeconds: 300,

    bannerFormat: 'anchored_adaptive',
    bannerPosition: 'bottom',

    freePlanAdsEnabled: true,
    proPlanAdsEnabled: false,
    homeExpertAdsEnabled: false,
  };

  adminStore.rewardedAdSettings.enabled = true;
  adminStore.rewardedAdSettings.rewardCredits = 2;
  adminStore.rewardedAdSettings.maxAdsPerDay = 5;

  adminStore.saveToDisk();

  adminStore.logAudit(
    { id: req.admin!.id, name: req.admin!.name },
    'ADMOB_RESET_DEFAULTS',
    'Ads Management',
    'Reset AdMob configuration to factory Google Test IDs and default limits'
  );

  res.json({
    success: true,
    adSettings: adminStore.adSettings,
    effectiveConfig: adminStore.getEffectiveAdConfig('free'),
    message: 'AdMob configuration has been reset to official Google Test IDs and default policies.',
  });
});

router.get('/monetization/ledger', requireAdminAuth(), (req, res) => {
  const search = ((req.query.search || '') as string).toLowerCase().trim();
  let list = [...adminStore.creditLedger];

  if (search) {
    list = list.filter(
      (tx) =>
        tx.userId.toLowerCase().includes(search) ||
        tx.userName.toLowerCase().includes(search) ||
        tx.userEmail.toLowerCase().includes(search) ||
        tx.reason.toLowerCase().includes(search) ||
        tx.type.toLowerCase().includes(search)
    );
  }

  res.json({ ledger: list });
});

router.post('/users/:id/adjust-credits', requireVerifiedAdmin(), (req: AdminAuthRequest, res) => {
  const userId = req.params.id;
  const { amount, reason } = req.body;

  if (amount === undefined || isNaN(Number(amount))) {
    return res.status(400).json({ error: 'Valid numeric amount is required' });
  }

  const cleanReason = (reason || 'Manual administrative adjustment').trim();
  const result = adminStore.adjustUserCredits(
    userId,
    Number(amount),
    cleanReason,
    req.admin?.name || 'Administrator'
  );

  res.json({ success: true, newBalance: result.newBalance });
});

router.get('/monetization/analytics', requireAdminAuth(), (_req, res) => {
  const users = adminStore.users;
  const totalUsers = users.length || 1;
  const freeCount = users.filter((u) => u.plan === 'free').length;
  const proCount = users.filter((u) => u.plan === 'pro').length;
  const expertCount = users.filter((u) => u.plan === 'expert').length;
  const totalPaid = proCount + expertCount;

  const proPrice = adminStore.plans.find((p) => p.id === 'pro')?.price || 99;
  const expertPrice = adminStore.plans.find((p) => p.id === 'expert')?.price || 299;
  const estimatedMonthlyRevenue = proCount * proPrice + expertCount * expertPrice;

  const adTxCount = adminStore.creditLedger.filter((t) => t.type === 'REWARDED_AD').length;
  const adCreditsAwarded = adminStore.creditLedger
    .filter((t) => t.type === 'REWARDED_AD')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalConsumed = adminStore.creditLedger
    .filter((t) => t.amount < 0)
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  // AI cost estimations
  const totalReqs = adminStore.requestLogs.length || 38;
  const estAiCostUsd = totalReqs * 0.0012;
  const highAiUsageWarning = estAiCostUsd > 10;

  res.json({
    userMetrics: {
      total: users.length,
      free: freeCount,
      pro: proCount,
      expert: expertCount,
      conversionRate: `${((totalPaid / totalUsers) * 100).toFixed(1)}%`,
    },
    revenue: {
      estimatedMonthlyINR: `₹${estimatedMonthlyRevenue.toLocaleString()}`,
      activeSubscriptions: adminStore.subscriptions.length,
    },
    rewardedAds: {
      adsWatchedTotal: adTxCount,
      creditsAwardedTotal: adCreditsAwarded,
      dailyCap: adminStore.rewardedAdSettings.maxAdsPerDay,
      rewardPerAd: adminStore.rewardedAdSettings.rewardCredits,
    },
    credits: {
      totalConsumed,
      activeLedgerTransactions: adminStore.creditLedger.length,
    },
    aiCostAudit: {
      totalAIRequestsLogged: totalReqs,
      estimatedCostUSD: `$${estAiCostUsd.toFixed(3)}`,
      estimatedCostINR: `₹${(estAiCostUsd * 87).toFixed(2)}`,
      highUsageWarning: highAiUsageWarning,
    },
  });
});

// ==========================================
// 17. CSV DATA EXPORT
// ==========================================

router.get('/export/:type', requireAdminAuth(), (req: AdminAuthRequest, res: Response) => {
  const type = req.params.type;

  let csvContent = '';
  let filename = `vastuvision_${type}_${new Date().toISOString().split('T')[0]}.csv`;

  if (type === 'users') {
    csvContent = 'ID,Name,Email,Plan,Status,Questions Asked,Photos Analyzed,Room Scans,Reports,Created At,Last Active\n';
    for (const u of adminStore.users) {
      csvContent += `"${u.id}","${u.name}","${u.email}","${u.plan}","${u.status}",${u.questionsAsked},${u.photosAnalyzed},${u.roomScansCompleted},${u.savedReportsCount},"${u.createdAt}","${u.lastActive}"\n`;
    }
  } else if (type === 'ledger' || type === 'credit-ledger') {
    csvContent = 'ID,User ID,Name,Email,Transaction ID,Type,Amount,Balance Before,Balance After,Reason,Created At\n';
    for (const tx of adminStore.creditLedger) {
      csvContent += `"${tx.id}","${tx.userId}","${tx.userName}","${tx.userEmail}","${tx.transactionId}","${tx.type}",${tx.amount},${tx.balanceBefore},${tx.balanceAfter},"${(tx.reason || '').replace(/"/g, '""')}","${tx.createdAt}"\n`;
    }
  } else if (type === 'subscriptions') {
    csvContent = 'ID,User Name,Email,Plan,Amount,Currency,Status,Payment Status,Start Date,Expiry Date\n';
    for (const s of adminStore.subscriptions) {
      csvContent += `"${s.id}","${s.userName}","${s.userEmail}","${s.planName}",${s.amount},"${s.currency}","${s.status}","${s.paymentStatus}","${s.startDate}","${s.expiryDate}"\n`;
    }
  } else if (type === 'feedback') {
    csvContent = 'ID,User,Email,Type,Category,Message,Status,Created At\n';
    for (const f of adminStore.feedback) {
      csvContent += `"${f.id}","${f.userName || 'Anonymous'}","${f.userEmail || 'N/A'}","${f.type}","${f.category}","${(f.message || '').replace(/"/g, '""')}","${f.status}","${f.createdAt}"\n`;
    }
  } else if (type === 'knowledge') {
    csvContent = 'ID,Title,Category,Recommended Direction,Status,Priority,Updated At\n';
    for (const k of adminStore.knowledge) {
      csvContent += `"${k.id}","${k.title.replace(/"/g, '""')}","${k.category}","${k.recommendedDirection}","${k.status}","${k.priority}","${k.updatedAt}"\n`;
    }
  } else {
    return res.status(400).json({ error: 'Unsupported export type' });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csvContent);
});

// ==========================================
// 18. AI SAFETY, EMERGENCY KILL-SWITCH & COST MONITORING
// ==========================================

// GET /api/admin/ai-safety: Overview of AI safety, emergency lock status, and cost protection
router.get('/ai-safety', requireAdminAuth(), (req: AdminAuthRequest, res: Response) => {
  const safety = adminStore.getGlobalAiSafety();
  res.json({
    safety,
    activeReservationsCount: adminStore.activeReservations.size,
    recentSecurityEvents: adminStore.securityEvents.slice(0, 30),
    serverTime: new Date().toISOString(),
  });
});

// POST /api/admin/ai-safety/emergency-lock: Toggle emergency AI kill-switch
router.post('/ai-safety/emergency-lock', requireAdminAuth(['SUPER_ADMIN']), (req: AdminAuthRequest, res: Response) => {
  const { enabled, reason } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Field "enabled" (boolean) is required' });
  }

  const updated = adminStore.updateGlobalAiSafety({
    emergencyLockEnabled: enabled,
    emergencyReason: reason || (enabled ? 'Administrative emergency lock engaged.' : ''),
  });

  adminStore.logAudit(
    req.admin!,
    enabled ? 'ENGAGE_GLOBAL_AI_LOCK' : 'DISENGAGE_GLOBAL_AI_LOCK',
    'global_ai_safety',
    `Emergency AI Kill-Switch ${enabled ? 'ENGAGED' : 'DISENGAGED'} by ${req.admin!.name}. Reason: ${reason || 'N/A'}`
  );

  res.json({
    success: true,
    message: `Global AI emergency kill-switch ${enabled ? 'ENGAGED' : 'DISENGAGED'}`,
    safety: updated,
  });
});

// PUT /api/admin/ai-safety/config: Update cost limits and safety thresholds
router.put('/ai-safety/config', requireAdminAuth(['SUPER_ADMIN']), (req: AdminAuthRequest, res: Response) => {
  const {
    dailyCostLimitUsd,
    monthlyCostLimitUsd,
    dailyRequestLimit,
    perUserConcurrentLimit,
  } = req.body;

  const updates: any = {};
  if (typeof dailyCostLimitUsd === 'number' && dailyCostLimitUsd >= 0) updates.dailyCostLimitUsd = dailyCostLimitUsd;
  if (typeof monthlyCostLimitUsd === 'number' && monthlyCostLimitUsd >= 0) updates.monthlyCostLimitUsd = monthlyCostLimitUsd;
  if (typeof dailyRequestLimit === 'number' && dailyRequestLimit >= 0) updates.dailyRequestLimit = dailyRequestLimit;
  if (typeof perUserConcurrentLimit === 'number' && perUserConcurrentLimit >= 1) updates.perUserConcurrentLimit = perUserConcurrentLimit;

  const updated = adminStore.updateGlobalAiSafety(updates);

  adminStore.logAudit(
    req.admin!,
    'UPDATE_AI_SAFETY_CONFIG',
    'global_ai_safety',
    `Updated AI Safety parameters: ${JSON.stringify(updates)}`
  );

  res.json({
    success: true,
    safety: updated,
  });
});

// POST /api/admin/ai-safety/reset-counters: Manually reset usage counters
router.post('/ai-safety/reset-counters', requireAdminAuth(['SUPER_ADMIN']), (req: AdminAuthRequest, res: Response) => {
  const safety = adminStore.resetAiUsageCounters();

  adminStore.logAudit(
    req.admin!,
    'RESET_AI_COUNTERS',
    'global_ai_safety',
    `Reset global AI daily and monthly usage counters`
  );

  res.json({
    success: true,
    message: 'Global AI usage counters reset successfully',
    safety,
  });
});

// GET /api/admin/ai-safety/security-events: Fetch security event audit trail
router.get('/ai-safety/security-events', requireAdminAuth(), (req: AdminAuthRequest, res: Response) => {
  const { limit = '100', severity, type } = req.query;
  let events = [...adminStore.securityEvents];

  if (severity) {
    events = events.filter((e) => e.severity === severity);
  }
  if (type) {
    events = events.filter((e) => e.type === type);
  }

  const parsedLimit = parseInt(String(limit), 10) || 100;
  res.json({
    events: events.slice(0, parsedLimit),
    totalCount: events.length,
  });
});

// DELETE /api/admin/ai-safety/security-events: Clear security events
router.delete('/ai-safety/security-events', requireAdminAuth(['SUPER_ADMIN']), (req: AdminAuthRequest, res: Response) => {
  const count = adminStore.securityEvents.length;
  adminStore.securityEvents = [];
  adminStore.saveToDisk();

  adminStore.logAudit(
    req.admin!,
    'CLEAR_SECURITY_EVENTS',
    'security_events',
    `Cleared ${count} security audit events`
  );

  res.json({
    success: true,
    message: `Cleared ${count} security events`,
  });
});

export { router as adminRouter };
export default router;
