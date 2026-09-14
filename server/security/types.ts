export interface UserSession {
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  isGuest: boolean;
  ipHash: string;
  createdAt: number;
  expiresAt: number;
}

export interface ReservationRecord {
  reservationId: string;
  userId: string;
  userName: string;
  userEmail: string;
  actionType: 'ai_chat' | 'photo_analysis' | 'voice' | 'room_scan' | 'complete_home' | 'pdf_report';
  cost: number;
  deductedFree: boolean;
  balanceBefore: number;
  balanceAfter: number;
  status: 'reserved' | 'finalized' | 'rolled_back';
  createdAt: number;
  requestId?: string;
  ip: string;
}

export interface IdempotencyRecord {
  requestId: string;
  userId: string;
  actionType: string;
  status: 'in_progress' | 'completed' | 'failed';
  responsePayload?: any;
  createdAt: number;
  completedAt?: number;
}

export interface GlobalAiSafetyConfig {
  emergencyLockEnabled: boolean;
  emergencyReason: string;
  dailyRequestLimit: number;
  monthlyRequestLimit: number;
  dailyBudgetThresholdUSD: number;
  monthlyBudgetThresholdUSD: number;
  todayRequestCount: number;
  todayResetDate: string;
  monthRequestCount: number;
  monthResetDate: string;
  totalTokensUsed: number;
  textRequestsCount: number;
  imageAnalysisCount: number;
  roomScanCount: number;
  homeScanCount: number;
  voiceTranscriptionCount: number;
  failedRequestCount: number;
  rateLimitedCount: number;
  unauthorizedRejectedCount: number;
  creditsConsumed: number;
  freeUsageCount: number;
  paidUsageCount: number;
  estimatedCostUSD: number;
}
