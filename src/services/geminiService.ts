/**
 * Client-Side Gemini Service for VastuVision AI
 *
 * Encapsulates secure server-side interactions with the Gemini API using the
 * official Google Generative AI SDK (@google/genai).
 *
 * SECURITY ARCHITECTURE:
 * - All Gemini API interactions are securely proxied via server-side API endpoints (/api/*).
 * - The server-side code handles @google/genai initialization with process.env.GEMINI_API_KEY.
 * - Under no circumstances is the Gemini API key, secret token, or private SDK instance
 *   exposed to the client bundle or browser window.
 *
 * CAPABILITIES:
 * - Real-time SSE streaming of responses token-by-token
 * - Automatic graceful fallback to standard endpoint if streaming is interrupted
 * - Cultural and linguistic query analysis for Hindi, Hinglish, and English
 * - Contextual error classification and localized bilingual/multilingual error messages
 */

import { getStoredUserId, creditService } from './creditService';
import { getPreferredLanguage } from './languageService';
import { authService } from './authService';

export type QueryLanguage = 'hindi' | 'hinglish' | 'english';

export interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

export interface StreamChatOptions {
  message: string;
  conversationHistory?: ChatHistoryItem[];
  direction?: string;
  roomContext?: string;
  category?: string;
  attachedImage?: string | null;
  language?: string;
  signal?: AbortSignal;
  onChunk?: (chunk: string, accumulated: string) => void;
}

export interface VastuChatResult {
  reply: string;
  category: string;
  needsPhoto: boolean;
  needsDirection: boolean;
  suggestedQuestions: string[];
  modelUsed: string;
}

export interface GeminiServiceError {
  code:
    | 'API_KEY_MISSING'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SERVICE_UNAVAILABLE'
    | 'NETWORK_ERROR'
    | 'INVALID_REQUEST'
    | 'STREAM_INTERRUPTED'
    | 'FREE_EXHAUSTED'
    | 'CREDITS_EXHAUSTED'
    | 'FAIR_USE_LIMIT'
    | 'DAILY_CAP_REACHED'
    | 'UNKNOWN_ERROR';
  statusCode: number;
  userMessage: string;
  technicalDetails?: string;
}

/**
 * Detects whether the user's question is written in Hindi (Devanagari), Hinglish, or English.
 */
export function detectQueryLanguage(query: string): QueryLanguage {
  if (!query) return 'hinglish';

  // Check for Devanagari script
  if (/[\u0900-\u097F]/.test(query)) {
    return 'hindi';
  }

  // Common Hinglish / Romanized Hindi keywords in home & Vastu inquiries
  const hinglishPatterns = [
    /\b(kya|hai|hain|kahan|kaha|kaise|kaisa|kaisi|konsa|kaunsa|kaunsi|kis|kise|kyu|kyun)\b/i,
    /\b(karo|karein|karna|kar|rakhein|rakhna|rakhe|rakhu|lagayein|lagaye|lagana|lagau)\b/i,
    /\b(disha|dishayein|vastu|ghar|kamra|kamre|rasoi|mandir|pooja|puja|darwaza|khidki)\b/i,
    /\b(parde|paas|saamne|samne|peeche|piche|upar|niche|sahi|galat|theek|chahiye|hona)\b/i,
    /\b(meri|mera|mere|humein|hum|aap|aapka|aapke|bataiye|batao|dijiye|kripya)\b/i,
    /\b(ghadi|aaina|sheesha|chulha|khatia|sir|pair|shubh|ashubh|dosh|nivaran)\b/i,
  ];

  for (const pattern of hinglishPatterns) {
    if (pattern.test(query)) {
      return 'hinglish';
    }
  }

  return 'english';
}

/**
 * Provides helpful, compassionate, and culturally natural error messages
 * in the user's query language (Hindi, Hinglish, or English).
 */
export function getLocalizedErrorMessage(
  errorCode: string,
  queryOrLanguage: string = 'hinglish'
): string {
  const lang: QueryLanguage =
    queryOrLanguage === 'hindi' || queryOrLanguage === 'hinglish' || queryOrLanguage === 'english'
      ? queryOrLanguage
      : detectQueryLanguage(queryOrLanguage);

  switch (errorCode) {
    case 'API_KEY_MISSING':
      if (lang === 'hindi') {
        return 'एआई सेवा कॉन्फ़िगरेशन अधूरी है। कृपया व्यवस्थापक सेटिंग्स की जांच करें।';
      }
      if (lang === 'hinglish') {
        return 'AI service configuration incomplete hai. Kripya system administrator se contact karein.';
      }
      return 'AI service configuration is incomplete. Please verify the API setup.';

    case 'RATE_LIMIT_EXCEEDED':
      if (lang === 'hindi') {
        return 'एआई सलाहकार अभी व्यस्त है। कृपया कुछ क्षण प्रतीक्षा करें और पुनः प्रयास करें।';
      }
      if (lang === 'hinglish') {
        return 'AI Vastu Advisor abhi thoda busy hai. Kripya 5-10 second baad "Retry" par click karein.';
      }
      return 'AI service is temporarily experiencing high traffic. Please wait a moment and click Retry.';

    case 'SERVICE_UNAVAILABLE':
      if (lang === 'hindi') {
        return 'एआई सेवा अस्थायी रूप से उपलब्ध नहीं है। कृपया नीचे दिए गए पुनः प्रयास बटन पर क्लिक करें।';
      }
      if (lang === 'hinglish') {
        return 'AI server se connect karne mein samasya aayi. Kripya niche "Retry" button dabayein.';
      }
      return 'AI service is momentarily unavailable. Please click the Retry button below.';

    case 'NETWORK_ERROR':
    case 'STREAM_INTERRUPTED':
      if (lang === 'hindi') {
        return 'इंटरनेट कनेक्शन में रुकावट आई। कृपया अपना नेटवर्क जांचें और पुनः प्रयास करें।';
      }
      if (lang === 'hinglish') {
        return 'Network connection issue detect hua hai. Kripya internet check karein aur dobara koshish karein.';
      }
      return 'Network connection issue detected. Please check your internet connection and try again.';

    case 'INVALID_REQUEST':
      if (lang === 'hindi') {
        return 'आपके प्रश्न को समझने में कठिनाई हुई। कृपया प्रश्न को थोड़े अलग शब्दों में पूछें।';
      }
      if (lang === 'hinglish') {
        return 'Aapke sawaal ko process nahi kiya ja saka. Kripya thoda vistaar se ya alag shabdon mein poochhein.';
      }
      return 'Unable to process this query. Please try rephrasing your question.';

    default:
      if (lang === 'hindi') {
        return 'वास्तु उत्तर तैयार करने में तकनीकी समस्या आई। कृपया पुनः प्रयास करें।';
      }
      if (lang === 'hinglish') {
        return 'Vastu guidance generate karne mein samasya aayi. Kripya Retry button dabayein.';
      }
      return 'Something went wrong while generating Vastu guidance. Please click Retry to try again.';
  }
}

/**
 * Formats standard fetch / server error objects into a typed GeminiServiceError.
 */
function createServiceError(
  err: any,
  userQuery: string,
  statusCode = 500
): GeminiServiceError {
  const code = (err?.code || 'UNKNOWN_ERROR') as GeminiServiceError['code'];
  const userMessage = err?.message || err?.userMessage || getLocalizedErrorMessage(code, userQuery);
  return {
    code,
    statusCode: err?.status || err?.statusCode || statusCode,
    userMessage,
    technicalDetails: err?.message || err?.technicalDetails || String(err),
  };
}

/**
 * Streams Vastu consultation responses in real-time using Server-Sent Events (SSE).
 *
 * Ensures no API keys are exposed to the client by streaming through the secure
 * server route `/api/chat/stream`, which interacts with the official @google/genai SDK.
 *
 * If streaming is not supported or encounters a transient gateway issue,
 * it seamlessly falls back to `/api/chat` with simulated chunk streaming.
 */
export async function streamVastuChat(options: StreamChatOptions): Promise<VastuChatResult> {
  const {
    message,
    conversationHistory = [],
    direction,
    roomContext,
    category = 'General Vastu',
    attachedImage,
    signal,
    onChunk,
  } = options;

  let accumulatedText = '';
  let modelUsed = 'gemini-3.1-flash-lite';
  let detectedCategory = category;
  let needsPhoto = false;
  let needsDirection = false;
  let suggestedQuestions: string[] = [];

  try {
    const userId = getStoredUserId();
    const activeLang = options.language || getPreferredLanguage();
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...authService.getAuthHeaders(),
        'x-user-id': userId,
      },
      body: JSON.stringify({
        message,
        conversationHistory,
        direction,
        roomContext,
        category,
        attachedImage,
        language: activeLang,
        userId,
      }),
      signal,
    });

    if (!response.ok) {
      // If the stream endpoint returned an error, parse it and throw
      const errorData = await response.json().catch(() => null);
      throw {
        code:
          errorData?.code ||
          (response.status === 429
            ? 'RATE_LIMIT_EXCEEDED'
            : response.status === 402
            ? 'CREDITS_EXHAUSTED'
            : 'SERVICE_UNAVAILABLE'),
        status: response.status,
        message: errorData?.error || response.statusText,
      };
    }

    if (!response.body) {
      throw { code: 'STREAM_INTERRUPTED', status: 502, message: 'ReadableStream body not available' };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep incomplete trailing line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);

          if (event.type === 'chunk' && event.text) {
            accumulatedText += event.text;
            onChunk?.(event.text, accumulatedText);
          } else if (event.type === 'done') {
            if (event.reply && !accumulatedText) {
              accumulatedText = event.reply;
              onChunk?.(event.reply, accumulatedText);
            }
            if (event.modelUsed) modelUsed = event.modelUsed;
            if (event.category) detectedCategory = event.category;
            if (typeof event.needsPhoto === 'boolean') needsPhoto = event.needsPhoto;
            if (typeof event.needsDirection === 'boolean') needsDirection = event.needsDirection;
            if (Array.isArray(event.suggestedQuestions) && event.suggestedQuestions.length > 0) {
              suggestedQuestions = event.suggestedQuestions;
            }
          } else if (event.type === 'error') {
            throw {
              code: event.code || 'UNKNOWN_ERROR',
              status: event.statusCode || 500,
              message: event.error || 'Stream error occurred',
            };
          }
        } catch (parseErr) {
          // If parse error occurs on individual event, ignore and continue reading stream
          if ((parseErr as any)?.code) {
            throw parseErr;
          }
        }
      }
    }

    // Refresh user credits automatically upon successful response
    creditService.fetchCredits().catch(() => {});

    // Default suggested questions if none were returned
    if (!suggestedQuestions || suggestedQuestions.length === 0) {
      const lang = detectQueryLanguage(message);
      if (lang === 'english') {
        suggestedQuestions = [
          'Where should wall clock be mounted as per Vastu?',
          'Bedroom mirror placement guidelines',
          'Kitchen stove and sink layout best practices',
        ];
      } else {
        suggestedQuestions = [
          'Wall clock kis direction mein lagani chahiye?',
          'Bedroom mein mirror kahan hona chahiye?',
          'Kitchen stove aur sink placement Vastu',
        ];
      }
    }

    return {
      reply: accumulatedText || 'Traditional Vastu principles ke according ghar mein natural light aur santulan zaroori hota hai.',
      category: detectedCategory,
      needsPhoto,
      needsDirection,
      suggestedQuestions,
      modelUsed,
    };
  } catch (streamError: any) {
    // If abort was requested by user, rethrow
    if (signal?.aborted) {
      throw createServiceError(streamError, message, 499);
    }

    // If payment/credits exhausted, do not fall back to /api/chat — report immediately
    if (
      streamError.status === 402 ||
      streamError.code === 'CREDITS_EXHAUSTED' ||
      streamError.code === 'FREE_EXHAUSTED' ||
      streamError.code === 'FAIR_USE_LIMIT' ||
      streamError.code === 'DAILY_CAP_REACHED'
    ) {
      throw createServiceError(streamError, message, 402);
    }

    console.warn('[geminiService] Stream attempt encountered issue, attempting standard fallback:', streamError);

    // Graceful fallback to non-streaming /api/chat
    try {
      const fallbackResult = await askVastuAIChat({
        message,
        conversationHistory,
        direction,
        roomContext,
        category,
        attachedImage,
        signal,
      });

      // Emit chunk so UI receives the completed text
      onChunk?.(fallbackResult.reply, fallbackResult.reply);
      return fallbackResult;
    } catch (fallbackError: any) {
      throw createServiceError(fallbackError, message);
    }
  }
}

/**
 * Standard non-streaming chat call to /api/chat.
 */
export async function askVastuAIChat(
  options: Omit<StreamChatOptions, 'onChunk'>
): Promise<VastuChatResult> {
  const {
    message,
    conversationHistory = [],
    direction,
    roomContext,
    category,
    attachedImage,
    signal,
  } = options;

  const userId = getStoredUserId();
  const activeLang = options.language || getPreferredLanguage();
  const response = await fetch('/api/chat', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
      'x-user-id': userId,
    },
    body: JSON.stringify({
      message,
      conversationHistory,
      direction,
      roomContext,
      category,
      attachedImage,
      language: activeLang,
      userId,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw {
      code:
        errorData?.code ||
        (response.status === 402
          ? 'CREDITS_EXHAUSTED'
          : response.status === 429
          ? 'RATE_LIMIT_EXCEEDED'
          : 'SERVICE_UNAVAILABLE'),
      status: response.status,
      message: errorData?.error || 'Unable to connect to Vastu AI advisor.',
    };
  }

  const data = await response.json();
  creditService.fetchCredits().catch(() => {});

  return {
    reply: data.reply || 'Traditional Vastu principles ke hisaab se natural light aur balance zaroori hota hai.',
    category: data.category || category || 'General Vastu',
    needsPhoto: Boolean(data.needsPhoto),
    needsDirection: Boolean(data.needsDirection),
    suggestedQuestions: Array.isArray(data.suggestedQuestions) ? data.suggestedQuestions : [],
    modelUsed: data.modelUsed || 'gemini-3.1-flash-lite',
  };
}

/**
 * Transcribes audio via server-side Gemini speech-to-text.
 */
export async function transcribeAudioVoice(
  audioBase64: string,
  mimeType = 'audio/webm'
): Promise<string> {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    },
    body: JSON.stringify({ audioBase64, mimeType }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || 'Audio transcription failed');
  }

  const data = await response.json();
  return data.text || '';
}
