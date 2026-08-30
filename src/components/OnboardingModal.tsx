import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Key, ExternalLink, Check, Eye, EyeOff, Power, Shield, ArrowRight, Zap, Laptop, Info } from 'lucide-react';
import { safeSaveToLocalStorage } from '../lib/storage';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function OnboardingModal({ isOpen, onClose, onSuccess }: OnboardingModalProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [autoStartup, setAutoStartup] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = localStorage.getItem('sowa_gemini_api_key') || localStorage.getItem('maya_gemini_api_key') || '';
      setGeminiKey(existing);
      setError(null);

      // Check current startup status from backend
      fetch('/api/pc/startup')
        .then(res => res.json())
        .then(data => {
          if (data.success && typeof data.enabled === 'boolean') {
            setAutoStartup(data.enabled);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSaveAndLaunch = async () => {
    const trimmed = geminiKey.trim();
    if (!trimmed) {
      setError("Please enter your Gemini API Key to continue.");
      return;
    }

    if (trimmed.length < 20) {
      setError("Please check your API key. Valid Gemini keys are typically 39+ characters long.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 1. Save API Key to localStorage
      safeSaveToLocalStorage('sowa_gemini_api_key', trimmed);
      safeSaveToLocalStorage('maya_gemini_api_key', trimmed);

      // 2. Configure Windows Startup
      try {
        await fetch('/api/pc/startup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: autoStartup }),
        });
      } catch (err) {
        console.warn("Startup toggle failed:", err);
      }

      // 3. Dispatch settings changed event so live listeners update instantly
      window.dispatchEvent(new CustomEvent('sowa-settings-changed', { detail: { geminiKey: trimmed } }));
      window.dispatchEvent(new CustomEvent('maya-settings-changed', { detail: { geminiKey: trimmed } }));

      setIsSaving(false);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setIsSaving(false);
      setError(err?.message || "Failed to save settings. Please try again.");
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setGeminiKey(text.trim());
        setError(null);
      }
    } catch (e) {
      console.warn("Clipboard access denied", e);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.92, y: 20, filter: 'blur(10px)' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative bg-gradient-to-b from-[#1c182a] via-[#120f1d] to-[#0c0a14] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_100px_rgba(236,72,153,0.25)]"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Decorative Banner & Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-cyan-500/30 blur-3xl pointer-events-none" />
          
          <div className="relative p-6 sm:p-8 space-y-6">
            {/* Header / Avatar */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-white/10 shadow-lg relative">
                <Sparkles className="w-8 h-8 text-pink-400 animate-pulse" />
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  Initial Setup
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-2">
                  Welcome to Sowa AI
                </h2>
                <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-sm mx-auto">
                  Your real-time Multimodal Voice, Vision, and PC Neural Desktop Companion.
                </p>
              </div>
            </div>

            {/* Step 1: Gemini API Key */}
            <div className="space-y-3 bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <Key className="w-4 h-4 text-pink-400" />
                  1. Enter Google Gemini API Key
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-pink-400 hover:text-pink-300 font-medium transition-colors underline underline-offset-2"
                >
                  Get Free Key ↗
                </a>
              </div>

              <p className="text-xs text-white/50 leading-relaxed">
                Gemini powers your real-time bidirectional voice, visual intelligence, and tools. Keys are 100% free with no credit card required.
              </p>

              <div className="relative flex items-center">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="Paste your Gemini API key (AIzaSy...)..."
                  value={geminiKey}
                  onChange={(e) => { setGeminiKey(e.target.value); setError(null); }}
                  className="w-full bg-black/60 border border-white/15 rounded-xl pl-3.5 pr-20 py-3 text-xs sm:text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-pink-500/50 font-mono transition-all"
                  autoFocus
                />

                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="p-1.5 text-white/40 hover:text-white/80 rounded-lg hover:bg-white/10 transition-colors"
                    title={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors border border-white/10"
                  >
                    Paste
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 flex items-start gap-2"
                >
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>

            {/* Step 2: Launch at Startup Option */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-colors ${autoStartup ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-white/40 border border-white/5'}`}>
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-white">
                    Launch on Windows Startup
                  </div>
                  <div className="text-[11px] text-white/50">
                    Automatically start Sowa AI when your laptop turns on
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoStartup(!autoStartup)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 ${autoStartup ? 'bg-cyan-500' : 'bg-white/15'}`}
                role="switch"
                aria-checked={autoStartup}
              >
                <motion.span
                  animate={{ x: autoStartup ? 24 : 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="inline-block h-4 w-4 rounded-full bg-white shadow-md"
                />
              </button>
            </div>

            {/* Launch Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAndLaunch}
                disabled={isSaving}
                className="w-full group relative overflow-hidden py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-bold text-sm tracking-wide shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{isSaving ? "Initializing Sowa AI..." : "Launch Sowa AI"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-white/40 text-center mt-3">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Your API keys are stored securely on your laptop.</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
