import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  Compass,
  Sparkles,
  HelpCircle,
  X,
  RefreshCw,
  Camera,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { ChatMessage, CardinalDirection } from '../types';
import { CompassModal } from './CompassModal';
import { DIRECTION_NAMES } from '../data/vastuKnowledge';
import { compressImageIfNeeded } from '../utils/imageUtils';
import {
  streamVastuChat,
  getLocalizedErrorMessage,
  detectQueryLanguage,
} from '../services/geminiService';
import { LanguageSelector } from './LanguageSelector';
import {
  AppLanguage,
  getPreferredLanguage,
  onLanguageChange,
} from '../services/languageService';
import { analyticsService } from '../services/analyticsService';

interface AiChatViewProps {
  initialPrompt?: string;
  initialImage?: string;
  onOpenPhotoAnalysis?: () => void;
  onOpenMonetization?: () => void;
}

const QUICK_PROMPTS = [
  'Wall clock kis direction mein lagani chahiye?',
  'Bedroom mein mirror kahan hona chahiye?',
  'Kitchen mein stove aur sink paas paas hain, kya karein?',
  'Bed kis direction mein rakhna chahiye?',
  'Main door ke saamne kya nahi hona chahiye?',
  'Bedroom ke liye best wall colour kaunsa hai?',
];

const PROBLEM_CATEGORIES = [
  'Direction',
  'Placement',
  'Object',
  'Colour',
  'Room',
  'Entrance',
  'Decoration',
  'Furniture',
  'General Vastu',
];

export const AiChatView: React.FC<AiChatViewProps> = ({
  initialPrompt,
  initialImage,
  onOpenPhotoAnalysis,
  onOpenMonetization,
}) => {
  const [language, setLanguage] = useState<AppLanguage>(getPreferredLanguage());

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const currentLang = getPreferredLanguage();
    const welcomeText =
      currentLang === 'en'
        ? 'Namaste! I am your AI Vastu Advisor. You can ask any question about home Vastu in Hindi, Hinglish, or English, or attach a photo of your room or wall.'
        : currentLang === 'hinglish'
        ? 'Namaste! Main aapka AI Vastu Advisor hoon. Aap Hindi, Hinglish ya English mein ghar ki kisi bhi Vastu problem ke baare mein sawaal pooch sakte hain ya room/wall ki photo attach kar sakte hain.'
        : 'नमस्ते! मैं आपका AI वास्तु सलाहकार हूँ। आप घर की किसी भी वास्तु समस्या, कमरे या दीवार की फोटो के बारे में सवाल पूछ सकते हैं।';

    return [
      {
        id: 'm1',
        role: 'model',
        text: welcomeText,
        timestamp: Date.now(),
        suggestedQuestions:
          currentLang === 'hi'
            ? [
                'दीवार की घड़ी किस दिशा में लगानी चाहिए?',
                'बेडरूम में आईना (दर्पण) कहाँ होना चाहिए?',
                'रसोई में चूल्हा और सिंक पास हों तो क्या करें?',
              ]
            : [
                'Wall clock kis direction mein lagani chahiye?',
                'Bedroom mein mirror kahan hona chahiye?',
                'Kitchen stove aur sink placement Vastu',
              ],
      },
    ];
  });

  useEffect(() => {
    return onLanguageChange((newLang) => {
      setLanguage(newLang);
    });
  }, []);

  const [inputText, setInputText] = useState<string>(initialPrompt || '');
  const [attachedImage, setAttachedImage] = useState<string | null>(initialImage || null);
  const [selectedDirection, setSelectedDirection] = useState<CardinalDirection | null>(null);
  const [isCompassOpen, setIsCompassOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Voice recording state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // "I Have a Different Problem" mode drawer
  const [showDifferentProblem, setShowDifferentProblem] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('General Vastu');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    analyticsService.trackAiVastuAdvisorOpen('chat_view');
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (initialPrompt && initialPrompt !== inputText) {
      setInputText(initialPrompt);
    }
  }, [initialPrompt]);

  // Setup Web Speech API speech recognition
  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    setMicPermissionError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicPermissionError('Speech recognition is not supported in this browser. Please type your question.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN'; // Works well for Hindi & Hinglish & English
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setMicPermissionError('Microphone permission was denied. Please allow microphone access or type your question.');
        } else {
          setMicPermissionError('Could not capture audio clearly. Please try speaking again or type below.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setMicPermissionError('Microphone error. You can continue typing below.');
      setIsListening(false);
    }
  };

  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImageIfNeeded(file);
        setAttachedImage(compressedBase64);
      } catch (err: any) {
        console.error('Image compression failed:', err);
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachedImage(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const executeChatRequest = async (
    query: string,
    imgToUse: string | null | undefined,
    directionVal?: CardinalDirection | null,
    attempt = 0
  ) => {
    setLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const botMsgId = 'bot_' + Date.now();

    // Add streaming placeholder message
    const initialBotMsg: ChatMessage = {
      id: botMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
      category: selectedCategory,
    };

    setMessages((prev) => [...prev, initialBotMsg]);

    try {
      const historyPayload = messages
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const directionStr = directionVal ? DIRECTION_NAMES[directionVal]?.name : undefined;

      const result = await streamVastuChat({
        message: query,
        conversationHistory: historyPayload,
        direction: directionStr,
        roomContext: selectedCategory,
        category: selectedCategory,
        attachedImage: imgToUse,
        language,
        signal: controller.signal,
        onChunk: (_chunkText, accumulated) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId
                ? { ...m, text: accumulated, isStreaming: true }
                : m
            )
          );
        },
      });

      // Update message with final metadata and mark streaming complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? {
                ...m,
                text: result.reply || m.text,
                isStreaming: false,
                suggestedQuestions: result.suggestedQuestions,
                needsPhoto: result.needsPhoto,
                needsDirection: result.needsDirection,
                category: result.category,
                modelUsed: result.modelUsed,
              }
            : m
        )
      );
    } catch (err: any) {
      if (controller.signal.aborted) {
        return;
      }
      console.error('Chat error:', err);

      // Safe 1 auto-retry on transient server busy or rate limit error
      if (attempt === 0 && (err?.statusCode === 503 || err?.statusCode === 429 || err?.code === 'RATE_LIMIT_EXCEEDED')) {
        console.warn(`Transient chat error (${err?.code}), performing 1 safe auto-retry...`);
        setMessages((prev) => prev.filter((m) => m.id !== botMsgId));
        await new Promise((r) => setTimeout(r, 1200));
        return await executeChatRequest(query, imgToUse, directionVal, attempt + 1);
      }

      const userFriendlyMessage =
        err?.userMessage || getLocalizedErrorMessage(err?.code || 'UNKNOWN_ERROR', query);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? {
                id: 'bot_err_' + Date.now(),
                role: 'model',
                text: userFriendlyMessage,
                timestamp: Date.now(),
                isError: true,
                isStreaming: false,
                failedQuery: query,
                failedImage: imgToUse,
                errorCode: err?.code,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!query && !attachedImage) return;

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      text: query,
      timestamp: Date.now(),
      attachedImage: attachedImage || undefined,
      direction: selectedDirection || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    const tempImage = attachedImage;
    setAttachedImage(null);

    // Track AI question submission event (safe non-sensitive parameters only)
    const inputType = tempImage
      ? 'multimodal'
      : isListening
      ? 'voice'
      : textToSend !== undefined
      ? 'quick_prompt'
      : 'text';
    analyticsService.trackAiQuestionSubmitted(inputType);

    await executeChatRequest(query, tempImage, selectedDirection, 0);
  };

  const handleRetry = async (errorMsgId: string, failedQuery: string, failedImage?: string | null) => {
    // Remove the error message only; keep user's original message intact
    setMessages((prev) => prev.filter((m) => m.id !== errorMsgId));
    await executeChatRequest(failedQuery, failedImage, selectedDirection, 1);
  };

  return (
    <div className="max-w-3xl w-full mx-auto min-w-0 flex flex-col h-[calc(100vh-140px)] min-h-[500px] sm:min-h-[550px] bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
      {/* Chat Header Bar */}
      <div className="p-4 border-b border-stone-100 bg-gradient-to-r from-amber-50/70 to-orange-50/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-stone-900 text-base leading-tight">
              VastuVision AI Advisor
            </h2>
            <p className="text-xs text-stone-500">Ask in Hindi, Hinglish, or English</p>
          </div>
        </div>

        {/* Quick helper buttons */}
        <div className="flex items-center gap-2">
          <LanguageSelector variant="compact" showIcon />
          <button
            type="button"
            onClick={() => setShowDifferentProblem(!showDifferentProblem)}
            className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1 shrink-0"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">I Have a</span> Different Problem
          </button>
        </div>
      </div>

      {/* "I Have a Different Problem" Drawer / Helper */}
      {showDifferentProblem && (
        <div className="p-4 bg-amber-50/90 border-b border-amber-200/80 text-xs text-amber-950 space-y-2 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between font-bold text-amber-900">
            <span>Choose Your Problem Category:</span>
            <button
              onClick={() => setShowDifferentProblem(false)}
              className="text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PROBLEM_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setInputText(`Mere ghar mein ${cat.toLowerCase()} se related ek problem hai: `);
                  setShowDifferentProblem(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-stone-700 border-amber-200 hover:bg-amber-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 ${
                    msg.isError ? 'bg-rose-100 text-rose-700' : 'bg-amber-600/10 text-amber-700'
                  }`}
                >
                  {msg.isError ? (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Bot className="w-4 h-4 text-amber-600" />
                  )}
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-amber-600 text-white rounded-tr-xs shadow-xs'
                    : msg.isError
                    ? 'bg-rose-50/90 border border-rose-200 text-rose-950 rounded-tl-xs shadow-xs'
                    : 'bg-stone-50 border border-stone-200 text-stone-900 rounded-tl-xs'
                }`}
              >
                {/* Attached user image thumbnail if present */}
                {msg.attachedImage && (
                  <div className="mb-2.5 rounded-xl overflow-hidden border border-white/20 max-h-48">
                    <img
                      src={msg.attachedImage}
                      alt="User Attached Room"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Direction pill if attached */}
                {msg.direction && (
                  <div className="mb-1 text-[11px] font-semibold text-amber-100 flex items-center gap-1">
                    <Compass className="w-3 h-3" /> Direction: {DIRECTION_NAMES[msg.direction]?.name || msg.direction}
                  </div>
                )}

                {/* Error State with Retry Button */}
                {msg.isError ? (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-rose-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="whitespace-pre-line">{msg.text}</div>
                    </div>
                    <div className="pt-2 border-t border-rose-200/80 flex flex-wrap items-center gap-2">
                      {(msg.errorCode === 'CREDITS_EXHAUSTED' ||
                        msg.errorCode === 'FREE_EXHAUSTED' ||
                        msg.errorCode === 'FAIR_USE_LIMIT' ||
                        msg.errorCode === 'DAILY_CAP_REACHED' ||
                        msg.text?.includes('credit') ||
                        msg.text?.includes('Recharge')) &&
                        onOpenMonetization && (
                          <button
                            type="button"
                            onClick={onOpenMonetization}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-xs transition-all cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 fill-stone-950" />
                            <span>Get Credits / Watch Video (+2 Cr)</span>
                          </button>
                        )}
                      {msg.failedQuery && (
                        <button
                          type="button"
                          onClick={() => handleRetry(msg.id, msg.failedQuery!, msg.failedImage)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Message Text with preserved lines & live streaming animation */}
                    {msg.isStreaming && !msg.text ? (
                      <div className="flex items-center gap-2 text-stone-500 text-xs py-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        <span>AI Vastu Advisor soch raha hai...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-line">
                        {msg.text}
                        {msg.isStreaming && (
                          <span className="inline-block w-1.5 h-3.5 ml-1 bg-amber-600 animate-pulse rounded-xs align-middle" />
                        )}
                      </div>
                    )}

                    {/* AI Interactive follow-up actions (Photo upload / Compass check) */}
                    {!isUser && (msg.needsPhoto || msg.needsDirection) && (
                      <div className="mt-3 pt-3 border-t border-stone-200/60 flex flex-wrap gap-2">
                        {msg.needsPhoto && onOpenPhotoAnalysis && (
                          <button
                            type="button"
                            onClick={onOpenPhotoAnalysis}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            📷 Upload Photo to Check
                          </button>
                        )}
                        {msg.needsDirection && (
                          <button
                            type="button"
                            onClick={() => setIsCompassOpen(true)}
                            className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <Compass className="w-3.5 h-3.5 text-amber-600" />
                            📍 Check Wall Direction
                          </button>
                        )}
                      </div>
                    )}

                    {/* Suggested follow-up prompt chips */}
                    {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-stone-200/60 space-y-1.5">
                        <div className="text-[11px] font-semibold text-stone-500">Related Questions:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedQuestions.map((sq, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSendMessage(sq)}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 border border-stone-200 text-stone-800 text-xs transition-colors text-left"
                            >
                              {sq}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && !messages.some((m) => m.isStreaming) && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-4 h-4 text-amber-600" />
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-600 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              AI Vastu Advisor soch raha hai...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Mic permission banner if error */}
      {micPermissionError && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-xs flex items-center justify-between border-t border-red-200">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{micPermissionError}</span>
          </div>
          <button onClick={() => setMicPermissionError(null)} className="text-red-500">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Image / Direction attachment preview chip */}
      {(attachedImage || selectedDirection) && (
        <div className="px-4 py-2 bg-stone-50 border-t border-stone-200 flex items-center gap-2 flex-wrap text-xs">
          {attachedImage && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-white border border-stone-200 rounded-lg">
              <img src={attachedImage} alt="Attached" className="w-5 h-5 rounded object-cover" />
              <span className="text-stone-700 font-medium">Photo attached</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {selectedDirection && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg">
              <Compass className="w-3.5 h-3.5 text-amber-700" />
              <span className="font-semibold">
                {DIRECTION_NAMES[selectedDirection]?.name || selectedDirection} ({selectedDirection})
              </span>
              <button
                type="button"
                onClick={() => setSelectedDirection(null)}
                className="text-amber-700 hover:text-amber-950"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3 sm:p-4 bg-white border-t border-stone-100 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAttachImage}
            accept="image/*"
            className="hidden"
          />

          {/* Attach Photo Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Room/Wall Photo"
            className="p-2.5 rounded-xl border border-stone-200 text-stone-500 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-colors shrink-0"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Direction Compass Button */}
          <button
            type="button"
            onClick={() => setIsCompassOpen(true)}
            title="Check or Select Direction"
            className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
              selectedDirection
                ? 'bg-amber-500 text-white border-amber-500'
                : 'border-stone-200 text-stone-500 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-300'
            }`}
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Voice Mic Button */}
          <button
            type="button"
            onClick={toggleVoiceInput}
            title={isListening ? 'Stop Recording' : 'Ask by Voice (Hindi/Hinglish/English)'}
            className={`p-2.5 rounded-xl border transition-all shrink-0 ${
              isListening
                ? 'bg-red-500 text-white border-red-500 animate-pulse'
                : 'border-stone-200 text-stone-500 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-300'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? 'Sun raha hoon, bolte rahiye...'
                : 'Poochhiye: "Mirror kahan lagau?", "Bed direction?"...'
            }
            className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-stone-50"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={loading || (!inputText.trim() && !attachedImage)}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/25 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 active:scale-95 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>

        {/* Quick Prompt Pills on mobile/desktop */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[10px] text-stone-400 uppercase font-bold shrink-0">Popular:</span>
          {QUICK_PROMPTS.slice(0, 3).map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-200/80 text-[11px] whitespace-nowrap shrink-0 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Compass Modal */}
      <CompassModal
        isOpen={isCompassOpen}
        onClose={() => setIsCompassOpen(false)}
        currentValue={selectedDirection}
        purposeLabel="this question"
        onSelectDirection={(dir) => {
          setSelectedDirection(dir);
        }}
      />
    </div>
  );
};
