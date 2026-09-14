import React from 'react';
import { ShieldCheck, X, HeartHandshake, Mail } from 'lucide-react';

interface LegalModalProps {
  type: 'disclaimer' | 'privacy' | 'terms' | 'contact' | null;
  onClose: () => void;
}

export const LegalModals: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 bg-amber-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h3 className="font-heading font-bold text-base text-stone-900 capitalize">
              {type === 'disclaimer'
                ? 'Vastu & Safety Disclaimer'
                : type === 'privacy'
                ? 'Privacy Policy'
                : type === 'terms'
                ? 'Terms of Service'
                : 'Contact & Support'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-stone-700 leading-relaxed">
          {type === 'disclaimer' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 font-medium">
                Vastu Shastra is a traditional Indian philosophy of spatial design, orientation, and natural balance. VastuVision AI provides guidance based on classical texts and customary practices.
              </div>
              <p>
                <strong>Non-Scientific Notice:</strong> Vastu guidance is rooted in cultural tradition and should not be considered an empirical or scientific guarantee of financial, medical, or personal outcomes.
              </p>
              <p>
                <strong>No Structural Demolition:</strong> We strongly advise against unnecessary demolition of load-bearing walls or structural renovations. Practical, non-structural remedies (repositioning movable furniture, decor adjustments, colour harmonizing, and lighting) should always be prioritized.
              </p>
              <p>
                <strong>Professional Engineering:</strong> Always consult licensed structural engineers and architectural professionals for any major construction or building renovations.
              </p>
            </div>
          )}

          {type === 'privacy' && (
            <div className="space-y-3">
              <p>
                <strong>Image Processing Privacy:</strong> Images you upload to VastuVision AI are used solely to generate real-time spatial recommendations via secure server-side AI processing.
              </p>
              <p>
                <strong>No Public Sharing:</strong> Your uploaded photos of private living rooms, bedrooms, or homes are never made public or used for training without explicit consent.
              </p>
              <p>
                <strong>Local Storage:</strong> Your history, saved checks, and profile preferences remain on your device and are encrypted during any server communication.
              </p>
            </div>
          )}

          {type === 'terms' && (
            <div className="space-y-3">
              <p>
                By using VastuVision AI, you acknowledge that all AI-generated suggestions are advisory in nature.
              </p>
              <p>
                The platform is designed to provide constructive, calming interior recommendations and strictly rejects fear-based, fatalistic, or superstitious claims.
              </p>
              <p>
                You retain full ownership of photos you submit and can delete your saved reports at any time.
              </p>
            </div>
          )}

          {type === 'contact' && (
            <div className="space-y-4">
              <p>
                Have a question, feedback, or need dedicated architectural Vastu advice? We'd love to hear from you.
              </p>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-stone-900">
                  <Mail className="w-4 h-4 text-amber-600" /> support@vastuvision.ai
                </div>
                <p className="text-stone-500 text-[11px]">
                  Response time: Usually within 24 hours. We serve homeowners, architects, and interior designers across India and globally.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
