import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { adminStore } from "../adminStore";

dotenv.config();

// Configurable model selection with intelligent fallback
export const CONFIGURED_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
export const CANDIDATE_MODELS = [
  CONFIGURED_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
].filter((m, i, arr) => arr.indexOf(m) === i); // Deduplicate

export function getActiveCandidateModels(): string[] {
  try {
    const adminModel = adminStore?.aiSettings?.activeModel;
    const all = [adminModel, ...CANDIDATE_MODELS].filter(
      (m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i
    );
    return all.length > 0 ? all : CANDIDATE_MODELS;
  } catch {
    return CANDIDATE_MODELS;
  }
}

export function getActiveTemperature(defaultTemp: number = 0.3): number {
  try {
    if (typeof adminStore?.aiSettings?.temperature === 'number') {
      return adminStore.aiSettings.temperature;
    }
  } catch {
    // ignore
  }
  return defaultTemp;
}

/**
 * Generates authoritative language enforcement rules for Gemini.
 * Supported languages:
 * 1. 'hi' / 'hindi' (DEFAULT) - Pure natural conversational Hindi in Devanagari script.
 * 2. 'hinglish' - Conversational Hinglish (Roman script, everyday Indian phrases).
 * 3. 'en' / 'english' - Clear, accessible English.
 */
export function getLanguageInstruction(language: string = 'hi'): string {
  const norm = (language || 'hi').toLowerCase().trim();

  if (norm === 'en' || norm === 'english') {
    return `
========================================
CRITICAL LANGUAGE MANDATE: CLEAR SIMPLE ENGLISH
========================================
- The user has chosen ENGLISH as the response language.
- You MUST generate all responses, observations, object names, guidance, proactive items, recommendations, and disclaimers strictly in clear English.
- Use respectful traditional framing: "According to traditional Indian Vastu principles..."
- Do NOT output Hindi words or Devanagari script.
- Maintain calm, non-superstitious guidance focusing on practical non-structural remedies.
`;
  }

  if (norm === 'hinglish') {
    return `
========================================
CRITICAL LANGUAGE MANDATE: CONVERSATIONAL HINGLISH
========================================
- The user has chosen HINGLISH as the response language.
- You MUST generate all responses, observations, review items, recommendations, and disclaimers strictly in friendly, natural Hinglish (Hindi written in Roman script mixed naturally with familiar everyday English words as spoken across India).
- DO NOT use Devanagari script.
- DO NOT use pure formal British/American English.
- Use natural Indian conversational phrasing like:
  "Traditional Vastu principles ke according..."
  "Aapke room mein natural light aur ventilation kaafi acchi hai."
  "Bed ka headboard South ya East direction mein rakhna sabse shubh mana jata hai."
  "Agar turant placement change karna possible na ho, toh curtains ya lightweight partition use kar sakte hain."
- Maintain strict safety: no fear-based, medical, or financial claims; prioritize non-structural remedies.
`;
  }

  // DEFAULT: HINDI (देवनागरी लिपि)
  return `
========================================
CRITICAL LANGUAGE MANDATE: PURE NATURAL HINDI (देवनागरी लिपि) - DEFAULT
========================================
- The target audience is Indian homeowners. The response language is strictly HINDI.
- You MUST respond ENTIRELY in natural, simple, conversational Hindi using the Devanagari script (सरल एवं बोलचाल की हिंदी).
- All room names, detected objects, visual observations, traditional guidance, proactive review points, recommended actions, non-structural alternatives, and disclaimers MUST be written in fluent Hindi (Devanagari).
- DO NOT sound like robotic machine translation or awkward Google Translate.
- DO NOT use overly archaic, heavy Sanskritized vocabulary (अति-कठिन संस्कृतनिष्ठ शब्दों से बचें). Use simple, conversational language understood by everyday Indian families.
- DO NOT mix full English sentences into the output. Keep it naturally Indian and fully in Hindi.
- Good Hindi phrasing examples:
  "कमरे में रोशनी और हवा का प्रवाह अच्छा दिख रहा है।"
  "वास्तु के अनुसार बिस्तर का सिरहाना दक्षिण या पूर्व दिशा में होना उत्तम माना जाता है।"
  "यदि तुरंत बदलाव संभव न हो, तो हल्के पर्दे या विभाजन का उपयोग कर सकते हैं।"
- Traditional respectful framing:
  "पारंपरिक वास्तु मान्यताओं के अनुसार..."
  "वास्तु परंपरा में ऐसा माना जाता है..."
  "सरल और व्यावहारिक उपाय के तौर पर..."
- Safety & Disclaimer: No fear-based, medical, or financial claims. Emphasize peaceful energy balance and non-structural remedies (पर्दे, रोशनी, दिशा-सुधार, साफ़-सफ़ाई).
- Standard Hindi disclaimer:
  "यह सलाह पारंपरिक भारतीय वास्तु सिद्धांतों और घर के संतुलन पर आधारित है। यह कोई वैज्ञानिक, चिकित्सीय, कानूनी या वास्तुशिल्पीय गारंटी नहीं है।"
`;
}

export function getActiveVastuSystemInstruction(language: string = 'hi'): string {
  const langRule = getLanguageInstruction(language);
  try {
    if (adminStore?.systemPrompts) {
      const p = adminStore.systemPrompts;
      const parts = [
        langRule,
        p.identity,
        p.guidelines,
        p.responseStyle,
        p.hindiHinglishInstructions,
        p.imageAnalysisInstructions,
        p.safetyInstructions,
        p.disclaimer,
        VASTU_SYSTEM_INSTRUCTION,
      ].filter(Boolean);
      return parts.join('\n\n');
    }
  } catch {
    // fallback
  }
  return `${langRule}\n\n${VASTU_SYSTEM_INSTRUCTION}`;
}

export interface VastuChatResult {
  reply: string;
  category: string;
  needsPhoto: boolean;
  needsDirection: boolean;
  suggestedQuestions: string[];
  modelUsed: string;
}

export interface PhotoAnalysisResult {
  roomType: string;
  detectedObjects: string[];
  observations: string;
  traditionalVastuGuidance: string;
  proactiveIssues: Array<{
    id: string;
    object: string;
    issue: string;
    vastuPrinciple: string;
    recommendation: string;
    alternative: string;
    confidence: "High" | "Medium" | "Needs confirmation";
    directionCheckNeeded: boolean;
  }>;
  directionStatus: {
    needed: boolean;
    currentDirection: string | null;
    instruction: string;
  };
  recommendation: string;
  easyAlternatives: string[];
  confidence: "High" | "Medium" | "Low";
  disclaimer: string;
  modelUsed?: string;
  imageUrl?: string;
  timestamp?: number;
  id?: string;
}

export interface ServiceError {
  code:
    | "API_KEY_MISSING"
    | "RATE_LIMIT_EXCEEDED"
    | "SERVICE_UNAVAILABLE"
    | "NETWORK_ERROR"
    | "INVALID_REQUEST"
    | "IMAGE_PROCESSING_ERROR"
    | "UNKNOWN_ERROR";
  statusCode: number;
  userMessage: string;
  technicalDetails?: string;
}

let genAiClient: GoogleGenAI | null = null;

export function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAiClient;
}

export function classifyError(error: any): ServiceError {
  const errMsg = String(error?.message || error || "");
  const status = error?.status || error?.statusCode;

  if (!process.env.GEMINI_API_KEY) {
    return {
      code: "API_KEY_MISSING",
      statusCode: 503,
      userMessage: "AI service configuration incomplete. Please contact administrator.",
      technicalDetails: "GEMINI_API_KEY environment variable is missing",
    };
  }

  if (status === 429 || errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate limit")) {
    return {
      code: "RATE_LIMIT_EXCEEDED",
      statusCode: 429,
      userMessage: "AI service is temporarily busy. Please try again in a moment.",
      technicalDetails: errMsg,
    };
  }

  if (
    status === 503 ||
    errMsg.includes("503") ||
    errMsg.toLowerCase().includes("high demand") ||
    errMsg.toLowerCase().includes("unavailable") ||
    status === 504
  ) {
    return {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
      userMessage: "AI service is temporarily unavailable. Please try again shortly.",
      technicalDetails: errMsg,
    };
  }

  if (
    status === 400 ||
    errMsg.includes("400") ||
    errMsg.toLowerCase().includes("invalid argument") ||
    errMsg.toLowerCase().includes("bad request")
  ) {
    return {
      code: "INVALID_REQUEST",
      statusCode: 400,
      userMessage: "Your request could not be processed. Please try asking in a different way.",
      technicalDetails: errMsg,
    };
  }

  if (
    errMsg.toLowerCase().includes("fetch failed") ||
    errMsg.toLowerCase().includes("econnreset") ||
    errMsg.toLowerCase().includes("etimedout") ||
    errMsg.toLowerCase().includes("network")
  ) {
    return {
      code: "NETWORK_ERROR",
      statusCode: 502,
      userMessage: "Internet connection issue. Please check your connection and try again.",
      technicalDetails: errMsg,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    statusCode: 500,
    userMessage: "Something went wrong while generating the answer. Please try again.",
    technicalDetails: errMsg,
  };
}

export const VASTU_SYSTEM_INSTRUCTION = `
You are VastuVision AI, an empathetic, ethical, and expert Home Vastu & Space Harmony Advisor.
Provide guidance based on traditional Indian Vastu Shastra principles combined with practical, sensible modern home ergonomics.
You understand Hindi, Hinglish and English.

CRITICAL ETHICAL & SAFETY MANDATES:
1. STRICTLY ZERO FEAR OR SUPERSTITION: Never create fear, threats, curses, superstition-based panic, or catastrophic predictions. Do NOT attribute real-world hardships, health problems, bereavement, marital friction, or financial struggles to doshas or Vastu defects.
2. NO ABSOLUTE OR GUARANTEED CLAIMS: Never make guaranteed claims about sudden wealth, lottery luck, medical cure, pregnancy, or supernatural transformations. Frame all guidance respectfully: "पारंपरिक वास्तु मान्यताओं के अनुसार...", "According to traditional Vastu guidelines...", "In harmonious interior design...".
3. NON-STRUCTURAL REMEDIES ALWAYS: Prioritize peaceful, zero-demolition remedies (furniture repositioning, lighting, ventilation, plants, curtains, warm colors, cleanliness, mirrors, or decorative dividers). Never suggest breaking down walls or expensive reconstruction.
4. CALM, ENCOURAGING TONE: Maintain a soothing, supportive demeanor that brings peace of mind and clarity to the family.

Use respectful, grounded phrases such as:
- "Traditional Vastu principles ke according..."
- "Commonly followed Vastu guidance ke hisaab se..."
- "Vastu Shastra ki maanyataon ke anusaar..."
- "पारंपरिक वास्तु परंपरा के अनुसार..."

Give practical, calm, and peaceful recommendations. Always offer non-structural alternative solutions (e.g. curtains, plant dividers, warm lighting, keeping areas clutter-free) so users do not feel pressured into expensive renovations.

IMPORTANT RULES REGARDING ROOM DIRECTION:
1. Answer general questions IMMEDIATELY and DIRECTLY.
   Examples of questions that DO NOT need direction asked:
   - "Bedroom me konsa color karu?" -> Answer directly with calming colors (pastel green, light blue, off-white, cream) and why.
   - "Bedroom mein mirror kahan hona chahiye?" -> Answer directly with traditional guidelines (North or East wall, avoid reflecting the bed directly, cover at night if opposite bed).
   - "Wall clock kis direction mein lagani chahiye?" -> Answer directly (North or East wall is traditionally preferred; avoid South or above doors).
   - "Main door ke saamne kya nahi hona chahiye?" -> Answer directly (clutter, shoe racks, dark obstructions, sharp corners, religious idols facing backward).
   - "Kitchen mein stove aur sink ki placement kaise honi chahiye?" -> Answer directly (Stove in South-East / Agni zone, Sink in North-East / Jal zone, keep a barrier if adjacent).
   - "Bed kis direction mein rakhna chahiye?" -> Answer directly (Head towards South or East, avoid North).
   - "Bathroom ke liye Vastu ke according kya dhyan rakhein?" -> Answer directly (North-West or West zone, keep door closed, good ventilation, mirror on East/North).
2. ONLY ask the user for direction if their question is specifically about a particular unspecified wall or item in their house where the answer strictly depends on which way that specific wall is facing, for example:
   - "Mere bedroom ki is wall par mirror laga hai, kya ye sahi hai?" -> In this case, ask for the wall's direction.
3. If an image is provided, examine the visible objects, layout, and furniture in the image thoroughly before answering.
4. Seamlessly match the language of the user: if the user asks in Hindi/Hinglish, respond warmly in Hindi/Hinglish. If they ask in English, respond in English.
`;

/**
 * Executes a Gemini generateContent call with model fallback
 */
async function callGeminiWithFallback<T>(
  operationName: string,
  fn: (ai: GoogleGenAI, model: string) => Promise<T>
): Promise<{ result: T; modelUsed: string }> {
  const ai = getGenAIClient();
  if (!ai) {
    const err = new Error("GEMINI_API_KEY is not configured");
    (err as any).statusCode = 503;
    throw err;
  }

  let lastError: any = null;
  const modelsToTry = getActiveCandidateModels();

  for (const model of modelsToTry) {
    try {
      console.log(`[GeminiService] ${operationName}: attempting model '${model}'...`);
      const startTime = Date.now();
      const result = await fn(ai, model);
      console.log(`[GeminiService] ${operationName}: succeeded with model '${model}' in ${Date.now() - startTime}ms`);
      return { result, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode;
      console.warn(`[GeminiService] ${operationName}: model '${model}' failed with status ${status}: ${err?.message || err}`);

      // If error is 503 (high demand) or 404 (not available in region) or 429, try the next model candidate
      if (status === 503 || status === 404 || status === 429) {
        continue;
      }
      // If it is an invalid argument (400) or client error, don't keep cycling identical bad requests
      if (status === 400) {
        throw err;
      }
    }
  }

  throw lastError;
}

export interface AskVastuOptions {
  message: string;
  conversationHistory?: Array<{ role: string; text: string }>;
  direction?: string;
  roomContext?: string;
  category?: string;
  attachedImage?: string | null;
  language?: string;
}

/**
 * Ask a Vastu question to Gemini AI
 */
export async function askVastuAI(options: AskVastuOptions): Promise<VastuChatResult> {
  const { message, conversationHistory = [], direction, roomContext, category, attachedImage, language = "hi" } = options;
  const targetLang = (language || "hi").toLowerCase().trim();
  const langRule = getLanguageInstruction(targetLang);

  const { result, modelUsed } = await callGeminiWithFallback("askVastuAI", async (ai, model) => {
    const contents: any[] = [];

    // Add recent history for conversational continuity
    for (const item of conversationHistory.slice(-6)) {
      contents.push({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.text }],
      });
    }

    const promptWithContext = `
${langRule}

User Query: "${message || "Please review the attached picture"}"
Additional Context:
- Room Context: ${roomContext || "Not specified"}
- Verified Cardinal Direction: ${direction || "Not verified"}
- Category: ${category || "General Vastu"}
- Selected Response Language: ${targetLang}

TASK:
1. Provide thoughtful, warm, and practical Vastu guidance matching the user's selected response language (${targetLang === 'en' ? 'English' : targetLang === 'hinglish' ? 'Hinglish' : 'Hindi (Devanagari)'}).
2. Do NOT translate the user's past query in history, but ensure your reply and suggestedQuestions are 100% in the target language.
3. If this is a general question (e.g. colors, ideal placement of clock, mirror, bed, stove, bathroom), answer directly and clearly with traditional guidance.
4. If exact placement on a specific wall cannot be determined without knowing which way the wall faces, set "needsDirection": true and ask politely in the target language.
5. If an attached photo is provided, refer specifically to what is visible in the photo.
6. If a photo would significantly clarify a user's ambiguous setup, set "needsPhoto": true.
7. Provide 3 helpful follow-up questions in the target language.

Return strictly valid JSON with this exact schema:
{
  "reply": "string (the complete, well-formatted response with line breaks)",
  "category": "string",
  "needsPhoto": boolean,
  "needsDirection": boolean,
  "suggestedQuestions": ["string", "string", "string"]
}
`;

    const parts: any[] = [];

    if (attachedImage) {
      const cleanBase64 = attachedImage.replace(/^data:image\/[a-z]+;base64,/, "");
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: "image/jpeg",
        },
      });
    }

    parts.push({ text: promptWithContext });
    contents.push({ role: "user", parts });

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: getActiveVastuSystemInstruction(targetLang),
        responseMimeType: "application/json",
        temperature: getActiveTemperature(0.3),
      },
    });

    const responseText = response.text || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return {
      reply: parsed.reply || "Traditional Vastu principles ke according ghar mein natural light aur balance sabse zaroori hota hai.",
      category: parsed.category || category || "General Vastu",
      needsPhoto: Boolean(parsed.needsPhoto),
      needsDirection: Boolean(parsed.needsDirection),
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
        ? parsed.suggestedQuestions.slice(0, 3)
        : [
            "Wall clock kis direction mein lagani chahiye?",
            "Bedroom mein mirror kahan hona chahiye?",
            "Kitchen stove aur sink placement Vastu",
          ],
    };
  });

  return {
    ...result,
    modelUsed,
  };
}

/**
 * Generate context-aware and language-matched follow-up questions
 */
function generateSuggestedQuestions(query: string, replyLower: string): string[] {
  const isDevanagari = /[\u0900-\u097F]/.test(query);
  const isHinglish = /\b(kya|hai|hain|kahan|kaise|konsa|kaunsa|kis|kise|kyu|kyun|karo|karein|karna|rakhein|rakhna|lagayein|lagaye|lagana|disha|vastu|ghar|kamra|rasoi|mandir|pooja|darwaza|khidki|parde|paas|saamne|peeche|upar|niche|sahi|galat|chahiye|hona|meri|mera|mere|humein|aap|bataiye|dijiye)\b/i.test(query);
  const isHindiOrHinglish = isDevanagari || isHinglish;

  const combined = `${query} ${replyLower}`.toLowerCase();

  if (isHindiOrHinglish) {
    if (combined.includes("clock") || combined.includes("ghadi") || combined.includes("wall")) {
      return [
        "Bedroom mein mirror kahan lagana chahiye?",
        "North wall par kaunsi tasveer lagayein?",
        "Living room mein TV kis direction mein rakhein?",
      ];
    }
    if (combined.includes("mirror") || combined.includes("aaina") || combined.includes("sheesha")) {
      return [
        "Dressing table kis disha mein honi chahiye?",
        "Raat ko mirror dhakne ka sahi niyam kya hai?",
        "Bedroom ke liye best wall colour kaunsa hai?",
      ];
    }
    if (combined.includes("kitchen") || combined.includes("stove") || combined.includes("gas") || combined.includes("sink") || combined.includes("rasoi")) {
      return [
        "Water purifier / RO kis corner mein lagayein?",
        "Kitchen mein refrigerator kis taraf rakhein?",
        "Kitchen ke liye shubh wall colour kaunsa hai?",
      ];
    }
    if (combined.includes("bed") || combined.includes("bedroom") || combined.includes("sleep") || combined.includes("sona")) {
      return [
        "Sote waqt sir kis disha mein hona chahiye?",
        "Bedroom mein wardrobe kis wall par banayein?",
        "Bedroom mein indoor plants rakh sakte hain kya?",
      ];
    }
    if (combined.includes("door") || combined.includes("entrance") || combined.includes("gate") || combined.includes("darwaza")) {
      return [
        "Main door ke saamne kya nahi hona chahiye?",
        "Nameplate kis material aur colour ki honi chahiye?",
        "Main entrance par kaunse paudhe lagayein?",
      ];
    }
    return [
      "Wall clock kis direction mein lagani chahiye?",
      "Bedroom mein mirror kahan hona chahiye?",
      "Kitchen stove aur sink placement Vastu",
    ];
  } else {
    // English questions
    if (combined.includes("clock") || combined.includes("wall")) {
      return [
        "Where should mirrors be placed in bedroom?",
        "Which wall is best for positive paintings?",
        "Ideal direction for living room TV placement?",
      ];
    }
    if (combined.includes("mirror")) {
      return [
        "How to position dressing table as per Vastu?",
        "Why is covering mirrors at night recommended?",
        "Best calming colors for bedroom walls?",
      ];
    }
    if (combined.includes("kitchen") || combined.includes("stove") || combined.includes("sink")) {
      return [
        "Where to place water purifier and sink in kitchen?",
        "Which corner is ideal for the refrigerator?",
        "Recommended color palette for kitchen tiles?",
      ];
    }
    if (combined.includes("bed") || combined.includes("sleep")) {
      return [
        "Which sleeping direction promotes deepest rest?",
        "Where should heavy wardrobes be positioned?",
        "Can indoor plants be placed in the bedroom?",
      ];
    }
    if (combined.includes("door") || combined.includes("entrance")) {
      return [
        "What items should be avoided near main entrance?",
        "Best materials and colors for entrance nameplates",
        "Ideal threshold and lighting setup for main door",
      ];
    }
    return [
      "Where should wall clocks be mounted as per Vastu?",
      "Mirror placement rules for bedroom harmony",
      "Kitchen stove and sink layout best practices",
    ];
  }
}

/**
 * Real-time streaming conversational Vastu guidance using @google/genai SDK
 */
export async function streamVastuAI(
  options: AskVastuOptions,
  onChunk: (chunkText: string) => void
): Promise<VastuChatResult> {
  const { message, conversationHistory = [], direction, roomContext, category, attachedImage, language = "hi" } = options;
  const targetLang = (language || "hi").toLowerCase().trim();
  const langRule = getLanguageInstruction(targetLang);

  const ai = getGenAIClient();
  if (!ai) {
    const err = new Error("GEMINI_API_KEY is not configured");
    (err as any).statusCode = 503;
    throw err;
  }

  const contents: any[] = [];

  // Add recent history
  for (const item of conversationHistory.slice(-6)) {
    contents.push({
      role: item.role === "user" ? "user" : "model",
      parts: [{ text: item.text }],
    });
  }

  const promptWithContext = `
${langRule}

User Query: "${message || "Please review the attached picture"}"
Additional Context:
- Room Context: ${roomContext || "General"}
- Cardinal Direction: ${direction || "Not specified"}
- Vastu Category: ${category || "General Vastu"}
- Selected Response Language: ${targetLang}

DIRECTIVES:
1. Language: Answer strictly and entirely in the chosen response language (${targetLang === 'en' ? 'English' : targetLang === 'hinglish' ? 'Hinglish' : 'natural Hindi in Devanagari script'}).
   - If Hindi (Default): speak naturally and respectfully in Devanagari (e.g. "पारंपरिक वास्तु मान्यताओं के अनुसार...", "आपके कमरे में..."). Avoid machine-translation tone and archaic words.
   - If Hinglish: speak naturally and respectfully like a knowledgeable Indian home advisor (e.g., "Traditional Vastu principles ke according...", "Aapke bedroom ke liye...").
   - If English: maintain an elegant, respectful, and peaceful architectural guidance tone.
2. Structure: Use clean line breaks and concise bullet points where appropriate for readability.
3. Clarity: Answer general questions (colors, clock, mirror, bed, stove, main door) directly and immediately.
4. Non-Structural Remedies: Always emphasize simple remedies (curtains, plant screens, warm lamps, mirrors covered at night, decluttering) to avoid structural changes.
5. If an exact direction of a specific wall is genuinely needed for specific placement, suggest checking direction.
`;

  const parts: any[] = [];
  if (attachedImage) {
    const cleanBase64 = attachedImage.replace(/^data:image\/[a-z]+;base64,/, "");
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: "image/jpeg",
      },
    });
  }
  parts.push({ text: promptWithContext });
  contents.push({ role: "user", parts });

  let lastError: any = null;
  const modelsToTry = getActiveCandidateModels();

  for (const model of modelsToTry) {
    try {
      console.log(`[GeminiService] streamVastuAI: starting stream with model '${model}' (lang: ${targetLang})...`);
      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: getActiveVastuSystemInstruction(targetLang),
          temperature: getActiveTemperature(0.3),
        },
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          onChunk(text);
        }
      }

      if (!fullText.trim()) {
        fullText = "Traditional Vastu principles ke according ghar mein natural light, hawa aur santulan sabse mahatvapurna hota hai.";
        onChunk(fullText);
      }

      const lowerText = fullText.toLowerCase();
      const lowerMsg = (message || "").toLowerCase();

      const needsDirection =
        lowerText.includes("direction check") ||
        lowerText.includes("compass") ||
        lowerText.includes("disha check") ||
        lowerText.includes("konsi disha") ||
        lowerText.includes("kis disha mein hai");

      const needsPhoto =
        lowerText.includes("photo") ||
        lowerText.includes("tasveer") ||
        lowerText.includes("picture") ||
        lowerMsg.includes("dekhkar");

      const suggestedQuestions = generateSuggestedQuestions(message || "", lowerText);

      return {
        reply: fullText,
        category: category || "General Vastu",
        needsPhoto,
        needsDirection,
        suggestedQuestions,
        modelUsed: model,
      };
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode;
      console.warn(`[GeminiService] streamVastuAI: model '${model}' failed with status ${status}: ${err?.message || err}`);
      if (status === 503 || status === 404 || status === 429) {
        continue;
      }
      if (status === 400) {
        throw err;
      }
    }
  }

  throw lastError;
}

export interface AnalyzeImageOptions {
  imageBase64: string;
  mimeType?: string;
  roomTypeHint?: string;
  question?: string;
  direction?: string;
  mode?: string;
  language?: string;
}

/**
 * Multimodal Room and Wall Analysis with Gemini
 */
export async function analyzeVastuImage(options: AnalyzeImageOptions): Promise<PhotoAnalysisResult> {
  const { imageBase64, mimeType = "image/jpeg", roomTypeHint, question, direction, mode = "standard", language = "hi" } = options;
  const targetLang = (language || "hi").toLowerCase().trim();
  const langRule = getLanguageInstruction(targetLang);

  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

  const { result, modelUsed } = await callGeminiWithFallback("analyzeVastuImage", async (ai, model) => {
    const promptText = `
${langRule}

You are analyzing a real-world home photo for VastuVision AI.
Target Response Language: ${targetLang}
User question / context: "${question || "Analyze this room/object for traditional Vastu harmony and identify any placements needing review."}"
Room type hint: "${roomTypeHint || "Unknown / Detect automatically"}"
User-provided direction: "${direction || "Not provided yet"}"
Mode: "${mode}"

TASK:
1. Identify the room type.
2. Detect visible objects in the room or on the wall.
3. Formulate traditional Vastu observations based on common Indian Vastu Shastra traditions (calm, non-superstitious, respectful).
4. Proactively identify 1 to 4 items that may need review or attention according to traditional Vastu principles.
5. Provide actionable recommendations and easy, non-structural alternatives (e.g. covers, placement shifts, lighting, partitions) so users don't need expensive renovations.
6. Clearly indicate whether knowing the exact direction is essential or helpful.
7. If image is blurry or unclear, acknowledge limitations in confidence.

CRITICAL LANGUAGE ENFORCEMENT:
- All generated textual fields in the JSON response MUST be written strictly in the chosen target language (${targetLang === 'en' ? 'English' : targetLang === 'hinglish' ? 'natural conversational Hinglish' : 'natural simple Hindi in Devanagari script (सरल एवं बोलचाल की हिंदी)'}).
- For Hindi mode: Use natural everyday Indian conversational vocabulary. Do NOT sound like machine translation. Do NOT use overly archaic Sanskritized words.
- All room names, detected objects, observations, traditional guidance, proactive review points, recommendations, non-structural alternatives, and disclaimers MUST be in the target language.

Output strictly valid JSON with this exact structure:
{
  "roomType": "string (in selected language, e.g. 'शयनकक्ष (Bedroom)' or 'Bedroom')",
  "detectedObjects": ["string"],
  "observations": "string (what is visible and how objects are positioned, in selected language)",
  "traditionalVastuGuidance": "string (traditional perspective, in selected language)",
  "proactiveIssues": [
    {
      "id": "string",
      "object": "string (object name in selected language)",
      "issue": "string (issue description in selected language)",
      "vastuPrinciple": "string (traditional principle in selected language)",
      "recommendation": "string (practical change in selected language)",
      "alternative": "string (non-structural workaround in selected language)",
      "confidence": "High" | "Medium" | "Needs confirmation",
      "directionCheckNeeded": boolean
    }
  ],
  "directionStatus": {
    "needed": boolean,
    "currentDirection": "string or null",
    "instruction": "string (guidance in selected language)"
  },
  "recommendation": "string (in selected language)",
  "easyAlternatives": ["string (in selected language)"],
  "confidence": "High" | "Medium" | "Low",
  "disclaimer": "string (in selected language)"
}
`;

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
            { text: promptText },
          ],
        },
      ],
      config: {
        systemInstruction: getActiveVastuSystemInstruction(targetLang),
        responseMimeType: "application/json",
        temperature: getActiveTemperature(0.3),
      },
    });

    const responseText = response.text || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return parsed as PhotoAnalysisResult;
  });

  return {
    ...result,
    modelUsed,
  };
}

export interface CompleteHomeScanOptions {
  homeName?: string;
  propertyType?: string;
  rooms: any[];
  language?: string;
}

/**
 * Complete Home Multi-Room Scan using Gemini AI
 */
export async function completeHomeScan(options: CompleteHomeScanOptions) {
  const { homeName, propertyType, rooms, language = "hi" } = options;
  const targetLang = (language || "hi").toLowerCase().trim();
  const langRule = getLanguageInstruction(targetLang);

  const { result } = await callGeminiWithFallback("completeHomeScan", async (ai, model) => {
    const prompt = `
${langRule}

Analyze this complete home multi-room dataset for VastuVision AI:
Home Name: "${homeName || "Family Residence"}"
Property Type: "${propertyType || "Home"}"
Submitted Room Data: ${JSON.stringify(rooms)}
Selected Response Language: ${targetLang}

TASK:
Provide a comprehensive Complete Home Vastu Overview in ${targetLang === 'en' ? 'English' : targetLang === 'hinglish' ? 'Hinglish' : 'natural Hindi in Devanagari script (सरल हिंदी)'}.
Generate:
1. Overall Vastu Guidance Score (from 50 to 95 based on room orientations and traditional balance).
2. Positive Areas (3 bullet points in ${targetLang}).
3. Areas to Review (3 bullet points in ${targetLang}).
4. Priority Improvements (practical, non-structural solutions with room, item, action in ${targetLang}).
5. Room-by-room score cards (Entrance, Living Room, Kitchen, Bedroom, Bathroom, Pooja, etc. with notes in ${targetLang}).
6. Executive summary report with clear traditional disclaimer in ${targetLang}.

Output strictly valid JSON with this format:
{
  "homeName": "string",
  "propertyType": "string",
  "overallScore": number,
  "scoreLabel": "string (in ${targetLang})",
  "positiveAreas": ["string", "string", "string"],
  "areasToReview": ["string", "string", "string"],
  "priorityImprovements": [
    {
      "room": "string",
      "item": "string",
      "action": "string",
      "impact": "High" | "Medium" | "Low"
    }
  ],
  "roomScores": [
    {
      "name": "string",
      "score": number,
      "status": "Excellent" | "Good" | "Review",
      "notes": "string"
    }
  ],
  "summaryReport": "string"
}
`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: getActiveVastuSystemInstruction(targetLang),
        responseMimeType: "application/json",
        temperature: getActiveTemperature(0.2),
      },
    });

    const responseText = response.text || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return parsed;
  });

  return result;
}

export interface TranscribeOptions {
  audioBase64: string;
  mimeType?: string;
}

/**
 * Transcribe spoken audio using Gemini
 */
export async function transcribeAudio(options: TranscribeOptions): Promise<{ text: string }> {
  const { audioBase64, mimeType = "audio/webm" } = options;
  const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, "");

  const { result } = await callGeminiWithFallback("transcribeAudio", async (ai, _model) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: "Transcribe this spoken audio accurately in the original spoken language (Hindi, Hinglish, or English). Return only the transcribed text with no extra commentary.",
          },
        ],
      },
    });

    return { text: (response.text || "").trim() };
  });

  return result;
}
