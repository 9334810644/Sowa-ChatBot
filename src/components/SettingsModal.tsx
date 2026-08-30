import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Globe, Bell, Ruler, Cloud, Monitor, Volume2, Wifi, Bluetooth, Image as ImageIcon, Laptop, Settings, Camera, Copy, Check, Sparkles, Mic, Info, Zap, Brain, Heart, Coffee, Briefcase, Search, ChevronDown, Flame, MessageCircle, Terminal, Folder, Lock, Moon, Cpu, Play, Power, ExternalLink, RefreshCw, MousePointer, Keyboard, MonitorUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { Mood } from '../hooks/useLiveSession';
import { MOOD_METADATA } from '../constants';

import { safeSaveToLocalStorage } from '../lib/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'pc' | 'assistant';
  currentMood: Mood;
  onMoodChange: (mood: Mood) => void;
}

export default function SettingsModal({ isOpen, onClose, initialTab = 'general', currentMood, onMoodChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'pc' | 'assistant'>(initialTab);
  
  const variants = {
    hidden: { opacity: 0, x: 10, filter: 'blur(8px)' },
    visible: { 
      opacity: 1, 
      x: 0, 
      filter: 'blur(0px)',
      transition: { duration: 0.3, ease: 'easeOut' as any }
    },
    exit: { 
      opacity: 0, 
      x: -10, 
      filter: 'blur(8px)',
      transition: { duration: 0.2, ease: 'easeIn' as any } 
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 10 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring" as any,
        stiffness: 400,
        damping: 30
      }
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [language, setLanguage] = useState('en');
  const [units, setUnits] = useState('metric');
  const [notifications, setNotifications] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [selfLearning, setSelfLearning] = useState(true);
  const [telegramToken, setTelegramToken] = useState('');
  const [googleChatWebhook, setGoogleChatWebhook] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiKeySaved, setGeminiKeySaved] = useState(false);
  const [grokApiKey, setGrokApiKey] = useState('');
  const [grokKeySaved, setGrokKeySaved] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'grok'>('gemini');
  const [autoStartup, setAutoStartup] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);

  // PC Settings States
  const [brightness, setBrightness] = useState(80);
  const [volume, setVolume] = useState(65);
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
  const [activeWallpaper, setActiveWallpaper] = useState('atmosphere');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [responseSpeed, setResponseSpeed] = useState<'ultra-fast' | 'balanced' | 'relaxed'>('ultra-fast');
  const [pcInfo, setPcInfo] = useState<{ platform?: string; hostname?: string; username?: string; isDesktop?: boolean } | null>(null);
  const [pcActionStatus, setPcActionStatus] = useState<string | null>(null);
  const [customAppInput, setCustomAppInput] = useState('');
  const [testTypeInput, setTestTypeInput] = useState('');
  const [cursorControlEnabled, setCursorControlEnabled] = useState(true);
  const [keyboardControlEnabled, setKeyboardControlEnabled] = useState(true);
  const [customCmdInput, setCustomCmdInput] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchPcInfo = async () => {
    try {
      const res = await fetch('/api/pc/info');
      const data = await res.json();
      if (data.success) {
        setPcInfo(data);
      }
    } catch (e) {
      console.warn("PC Info unavailable", e);
    }
  };

  const handlePcAction = async (action: string, payload: any = {}) => {
    setPcActionStatus(`Executing ${payload.appName || payload.setting || payload.path || action}...`);
    try {
      const res = await fetch('/api/pc/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        setPcActionStatus(data.message || `Successfully executed on PC.`);
      } else {
        setPcActionStatus(`Error: ${data.error || 'Failed to execute'}`);
      }
    } catch (err: any) {
      setPcActionStatus(`Error: Could not reach desktop bridge`);
    }
    setTimeout(() => {
      setPcActionStatus(null);
    }, 4000);
  };

  const handleCustomWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      saveSettings({ activeWallpaper: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem('sowa_app_settings') || localStorage.getItem('maya_app_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setLanguage(parsed.language || 'en');
        setUnits(parsed.units || 'metric');
        setNotifications(parsed.notifications ?? true);
        setSelfLearning(parsed.selfLearning ?? true);
        if (parsed.brightness !== undefined) setBrightness(parsed.brightness);
        if (parsed.volume !== undefined) setVolume(parsed.volume);
        if (parsed.wifiEnabled !== undefined) setWifiEnabled(parsed.wifiEnabled);
        if (parsed.bluetoothEnabled !== undefined) setBluetoothEnabled(parsed.bluetoothEnabled);
        if (parsed.activeWallpaper !== undefined) setActiveWallpaper(parsed.activeWallpaper);
        if (parsed.selectedVoice !== undefined) setSelectedVoice(parsed.selectedVoice);
        if (parsed.responseSpeed !== undefined) setResponseSpeed(parsed.responseSpeed);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    setIsGoogleConnected(!!(localStorage.getItem('sowa_google_auth') || localStorage.getItem('maya_google_auth')));
    setTelegramToken(localStorage.getItem('sowa_telegram_token') || localStorage.getItem('maya_telegram_token') || '');
    setGoogleChatWebhook(localStorage.getItem('sowa_google_chat_webhook') || localStorage.getItem('maya_google_chat_webhook') || '');
    setGeminiApiKey(localStorage.getItem('sowa_gemini_api_key') || localStorage.getItem('maya_gemini_api_key') || '');
    setGrokApiKey(localStorage.getItem('sowa_grok_api_key') || localStorage.getItem('maya_grok_api_key') || '');
    setAiProvider((localStorage.getItem('sowa_ai_provider') || localStorage.getItem('maya_ai_provider') || 'gemini') as any);
    const savedWakeWord = localStorage.getItem('sowa_wake_word_enabled') || localStorage.getItem('maya_wake_word_enabled');
    setWakeWordEnabled(savedWakeWord !== 'false');
    fetchPcInfo();
    fetch('/api/pc/startup')
      .then(res => res.json())
      .then(data => {
        if (data.success && typeof data.enabled === 'boolean') {
          setAutoStartup(data.enabled);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleToggleWakeWord = (enabled: boolean) => {
    setWakeWordEnabled(enabled);
    safeSaveToLocalStorage('sowa_wake_word_enabled', String(enabled));
    safeSaveToLocalStorage('maya_wake_word_enabled', String(enabled));
    window.dispatchEvent(new CustomEvent('sowa-settings-changed', { detail: { wakeWordEnabled: enabled } }));
    window.dispatchEvent(new CustomEvent('maya-settings-changed', { detail: { wakeWordEnabled: enabled } }));
  };

  const handleToggleStartup = async (enabled: boolean) => {
    setAutoStartup(enabled);
    try {
      await fetch('/api/pc/startup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
    } catch (e) {
      console.warn("Failed to toggle startup:", e);
    }
  };

  const handleSaveGeminiKey = (val: string) => {
    const trimmed = val.trim();
    setGeminiApiKey(trimmed);
    if (trimmed) {
      safeSaveToLocalStorage('sowa_gemini_api_key', trimmed);
      safeSaveToLocalStorage('maya_gemini_api_key', trimmed);
      setGeminiKeySaved(true);
      setTimeout(() => setGeminiKeySaved(false), 2000);
    } else {
      localStorage.removeItem('sowa_gemini_api_key');
      localStorage.removeItem('maya_gemini_api_key');
      setGeminiKeySaved(false);
    }
  };

  const handleSaveGrokKey = (val: string) => {
    const trimmed = val.trim();
    setGrokApiKey(trimmed);
    if (trimmed) {
      safeSaveToLocalStorage('sowa_grok_api_key', trimmed);
      safeSaveToLocalStorage('maya_grok_api_key', trimmed);
      setGrokKeySaved(true);
      setTimeout(() => setGrokKeySaved(false), 2000);
    } else {
      localStorage.removeItem('sowa_grok_api_key');
      localStorage.removeItem('maya_grok_api_key');
      setGrokKeySaved(false);
    }
  };

  const handleSetAiProvider = (provider: 'gemini' | 'grok') => {
    setAiProvider(provider);
    safeSaveToLocalStorage('sowa_ai_provider', provider);
    safeSaveToLocalStorage('maya_ai_provider', provider);
  };

  const handleSaveTelegramToken = (val: string) => {
    const trimmed = val.trim();
    setTelegramToken(trimmed);
    safeSaveToLocalStorage('sowa_telegram_token', trimmed);
    safeSaveToLocalStorage('maya_telegram_token', trimmed);
  };

  const handleSaveGoogleChatWebhook = (val: string) => {
    const trimmed = val.trim();
    setGoogleChatWebhook(trimmed);
    safeSaveToLocalStorage('sowa_google_chat_webhook', trimmed);
    safeSaveToLocalStorage('maya_google_chat_webhook', trimmed);
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        safeSaveToLocalStorage('sowa_google_auth', JSON.stringify(e.data.tokens));
        safeSaveToLocalStorage('maya_google_auth', JSON.stringify(e.data.tokens));
        setIsGoogleConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const saveSettings = (newSettings: any) => {
    const currentSettings = JSON.parse(localStorage.getItem('sowa_app_settings') || localStorage.getItem('maya_app_settings') || '{}');
    const updated = { 
      language, units, notifications, selfLearning,
      brightness, volume, wifiEnabled, bluetoothEnabled, activeWallpaper, selectedVoice, responseSpeed,
      ...currentSettings, ...newSettings 
    };
    
    safeSaveToLocalStorage('sowa_app_settings', JSON.stringify(updated));
    safeSaveToLocalStorage('maya_app_settings', JSON.stringify(updated));
    
    if (newSettings.language !== undefined) setLanguage(newSettings.language);
    if (newSettings.units !== undefined) setUnits(newSettings.units);
    if (newSettings.notifications !== undefined) setNotifications(newSettings.notifications);
    if (newSettings.selfLearning !== undefined) setSelfLearning(newSettings.selfLearning);
    if (newSettings.brightness !== undefined) setBrightness(newSettings.brightness);
    if (newSettings.volume !== undefined) setVolume(newSettings.volume);
    if (newSettings.wifiEnabled !== undefined) setWifiEnabled(newSettings.wifiEnabled);
    if (newSettings.bluetoothEnabled !== undefined) setBluetoothEnabled(newSettings.bluetoothEnabled);
    if (newSettings.activeWallpaper !== undefined) setActiveWallpaper(newSettings.activeWallpaper);
    if (newSettings.selectedVoice !== undefined) setSelectedVoice(newSettings.selectedVoice);
    if (newSettings.responseSpeed !== undefined) setResponseSpeed(newSettings.responseSpeed);

    window.dispatchEvent(new CustomEvent('sowa-settings-changed', { detail: updated }));
    window.dispatchEvent(new CustomEvent('maya-settings-changed', { detail: updated }));
  };

  const handleConnectGoogle = async () => {
    try {
      const origin = window.location.origin;
      const response = await fetch(`/api/google/auth/url?redirectUri=${encodeURIComponent(origin + '/api/google/auth/callback')}`);
      
      if (!response.ok) {
        alert("Server error. Please ensure Google Client ID and Secret are set in your Secrets panel.");
        return;
      }
      
      const { url } = await response.json();
      
      // PWAs sometimes have issues with blank popups, so we open with URL directly
      const popup = window.open(url, 'google_auth', 'width=600,height=700');
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Fallback for strict popup blockers
        const proceed = confirm("Pop-up blocked. Sowa AI needs to open a new window to connect to Google. Would you like to try opening it directly in this tab? (You will need to come back here afterwards)");
        if (proceed) {
          window.location.href = url;
        }
      }
    } catch (e) {
      console.error("Failed to start Google Auth flow", e);
      alert("Failed to start Google Auth flow. Check console for details.");
    }
  };

  const handleDisconnectGoogle = () => {
    localStorage.removeItem('sowa_google_auth');
    localStorage.removeItem('maya_google_auth');
    setIsGoogleConnected(false);
  };

  if (!isOpen) return null;

  const themeList = ['atmosphere', 'nebula', 'void'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(15px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(15px)' }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
              <h2 id="settings-modal-title" className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" aria-hidden="true" />
                Settings
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500" aria-label="Close settings">
                <X className="w-5 h-5 text-white/60" aria-hidden="true" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-black/20 overflow-x-auto relative">
              <button
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-widest transition-colors relative whitespace-nowrap z-10 ${activeTab === 'general' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                General
                {activeTab === 'general' && (
                  <motion.div layoutId="active-settings-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('assistant')}
                className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center justify-center gap-2 whitespace-nowrap z-10 ${activeTab === 'assistant' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                <Sparkles className="w-3 h-3" /> Assistant
                {activeTab === 'assistant' && (
                  <motion.div layoutId="active-settings-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('pc')}
                className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center justify-center gap-2 whitespace-nowrap z-10 ${activeTab === 'pc' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                <ImageIcon className="w-3 h-3" /> Appearance
                {activeTab === 'pc' && (
                  <motion.div layoutId="active-settings-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                )}
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeTab === 'general' && (
                  <motion.div
                    key="tab-general"
                    variants={variants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-6"
                  >
            <motion.div variants={itemVariants} className="space-y-3">
              <label htmlFor="language-select" className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Globe className="w-4 h-4 text-blue-400" aria-hidden="true" /> Language
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => saveSettings({ language: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 transition-colors"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
            </motion.div>

            {/* Units */}
            <motion.div variants={itemVariants} className="space-y-3" role="group" aria-labelledby="units-label">
              <label id="units-label" className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Ruler className="w-4 h-4 text-green-400" aria-hidden="true" /> Units of Measurement
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => saveSettings({ units: 'metric' })}
                  className={`flex-1 py-2 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${units === 'metric' ? 'bg-white/10 border-white/20 text-white' : 'bg-black/20 border-white/5 text-white/40 hover:bg-white/5'}`}
                  aria-pressed={units === 'metric'}
                >
                  Metric (Celsius, km)
                </button>
                <button
                  onClick={() => saveSettings({ units: 'imperial' })}
                  className={`flex-1 py-2 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${units === 'imperial' ? 'bg-white/10 border-white/20 text-white' : 'bg-black/20 border-white/5 text-white/40 hover:bg-white/5'}`}
                  aria-pressed={units === 'imperial'}
                >
                  Imperial (Fahrenheit, mi)
                </button>
              </div>
            </motion.div>

            {/* Notifications */}
            <motion.div variants={itemVariants} className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${notifications ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-white/40'}`} aria-hidden="true">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/90" id="notifications-label">Push Notifications</div>
                  <div className="text-xs text-white/40">Receive alerts and updates</div>
                </div>
              </div>
              <button
                onClick={() => saveSettings({ notifications: !notifications })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a24] ${notifications ? 'bg-pink-500' : 'bg-white/10'}`}
                role="switch"
                aria-checked={notifications}
                aria-labelledby="notifications-label"
              >
                <motion.span 
                  animate={{ x: notifications ? 24 : 4 }}
                  className="inline-block h-4 w-4 rounded-full bg-white shadow-sm" 
                />
              </button>
            </motion.div>

            {/* Self-Learning */}
            <motion.div variants={itemVariants} className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selfLearning ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/40'}`} aria-hidden="true">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/90" id="self-learning-label">Self-Learning Mode</div>
                  <div className="text-xs text-white/40">Sowa AI evolves and adapts based on your interactions</div>
                </div>
              </div>
              <button
                onClick={() => saveSettings({ selfLearning: !selfLearning })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a24] ${selfLearning ? 'bg-cyan-500' : 'bg-white/10'}`}
                role="switch"
                aria-checked={selfLearning}
                aria-labelledby="self-learning-label"
              >
                <motion.span 
                  animate={{ x: selfLearning ? 24 : 4 }}
                  className="inline-block h-4 w-4 rounded-full bg-white shadow-sm" 
                />
              </button>
            </motion.div>

            {/* Launch on Windows Startup */}
            <motion.div variants={itemVariants} className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${autoStartup ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/40'}`} aria-hidden="true">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/90" id="startup-label">Launch on Windows Startup</div>
                  <div className="text-xs text-white/40">Automatically start Sowa AI when your PC boots</div>
                </div>
              </div>
              <button
                onClick={() => handleToggleStartup(!autoStartup)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a24] ${autoStartup ? 'bg-purple-500' : 'bg-white/10'}`}
                role="switch"
                aria-checked={autoStartup}
                aria-labelledby="startup-label"
              >
                <motion.span 
                  animate={{ x: autoStartup ? 24 : 4 }}
                  className="inline-block h-4 w-4 rounded-full bg-white shadow-sm" 
                />
              </button>
            </motion.div>

            {/* Voice Wake Word ("Hey Sowa") */}
            <motion.div variants={itemVariants} className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${wakeWordEnabled ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-white/40'}`} aria-hidden="true">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/90" id="wake-word-label">Voice Wake Word ("Hey Sowa")</div>
                  <div className="text-xs text-white/40">Continuously listen for "Hey Sowa" to wake up and talk</div>
                </div>
              </div>
              <button
                onClick={() => handleToggleWakeWord(!wakeWordEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a24] ${wakeWordEnabled ? 'bg-pink-500' : 'bg-white/10'}`}
                role="switch"
                aria-checked={wakeWordEnabled}
                aria-labelledby="wake-word-label"
              >
                <motion.span 
                  animate={{ x: wakeWordEnabled ? 24 : 4 }}
                  className="inline-block h-4 w-4 rounded-full bg-white shadow-sm" 
                />
              </button>
            </motion.div>

            {/* Integrations */}
            <motion.div variants={itemVariants} className="space-y-4 pt-4 border-t border-white/10">
              <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Cloud className="w-4 h-4 text-orange-400" aria-hidden="true" /> Connected Apps & APIs
              </label>

              {/* AI Neural Provider Selector */}
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Brain className="w-4 h-4 text-purple-400" /> Default AI Neural Engine
                  </div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Chat & Vision</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSetAiProvider('gemini')}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all",
                      aiProvider === 'gemini'
                        ? "bg-pink-500/20 border-pink-500/50 text-white"
                        : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Google Gemini
                    </div>
                    <div className="text-[10px] text-white/40 mt-1">Live Audio Orb + Multimodal</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetAiProvider('grok')}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all",
                      aiProvider === 'grok'
                        ? "bg-cyan-500/20 border-cyan-500/50 text-white"
                        : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" /> xAI Grok-2
                    </div>
                    <div className="text-[10px] text-white/40 mt-1">Uncensored 18+ & High Speed</div>
                  </button>
                </div>
              </div>

              {/* Gemini API Key */}
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Sparkles className="w-4 h-4 text-pink-400" /> Gemini API Key
                  </div>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-mono border", geminiApiKey ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                    {geminiApiKey ? "Custom Key Active" : "Using .env Key"}
                  </span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Powers the real-time Multimodal Live Voice Orb. Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-pink-400 underline hover:text-pink-300">Google AI Studio</a>.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter your Gemini API key..."
                    value={geminiApiKey}
                    onChange={(e) => handleSaveGeminiKey(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                  />
                  <button
                    onClick={() => handleSaveGeminiKey(geminiApiKey)}
                    className="px-3 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-medium rounded-lg transition-colors shrink-0 flex items-center gap-1"
                  >
                    {geminiKeySaved ? <Check className="w-3.5 h-3.5" /> : null}
                    {geminiKeySaved ? "Saved!" : "Save Key"}
                  </button>
                </div>
              </div>

              {/* xAI Grok API Key */}
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Zap className="w-4 h-4 text-cyan-400" /> xAI Grok API Key
                  </div>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-mono border", grokApiKey ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/10 text-white/40 border-white/10")}>
                    {grokApiKey ? "Custom Key Active" : "Not Set"}
                  </span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Powers ultra-fast, unfiltered, and explicit Grok-2 chat, reasoning, and vision. Get your key at <a href="https://console.x.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">console.x.ai</a> ($25/mo free credits).
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter your xAI Grok API key (xai-...)..."
                    value={grokApiKey}
                    onChange={(e) => handleSaveGrokKey(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                  />
                  <button
                    onClick={() => handleSaveGrokKey(grokApiKey)}
                    className="px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium rounded-lg transition-colors shrink-0 flex items-center gap-1"
                  >
                    {grokKeySaved ? <Check className="w-3.5 h-3.5" /> : null}
                    {grokKeySaved ? "Saved!" : "Save Key"}
                  </button>
                </div>
              </div>
              
              {/* Google Workspace */}
              <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-white">Google Workspace</div>
                    <div className="text-xs text-white/40 mt-1 max-w-xs transition-all">
                      {isGoogleConnected ? "Calendar, Drive, Contacts, Gmail, and Tasks are linked." : "Connect your Calendar, Drive, Contacts, and Gmail to enable Sowa AI to assist you with your schedule and tasks."}
                    </div>
                  </div>
                  {isGoogleConnected ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleConnectGoogle}
                        className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium rounded-lg transition-colors border border-blue-500/30 shrink-0"
                      >
                        Refresh
                      </button>
                      <button
                        onClick={handleDisconnectGoogle}
                        className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded-lg transition-colors border border-red-500/30 shrink-0"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleConnectGoogle}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
          )}

          {activeTab === 'assistant' && (
            <motion.div 
              key="tab-assistant"
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-8"
            >
              {/* Mood Selection */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-[0.2em] border-b border-white/10 pb-2">
                  <Brain className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" /> Neural Mood
                </label>
                
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 gap-2.5"
                >
                  {MOOD_METADATA.map((m) => (
                    <motion.button
                      key={`settings-mood-${m.id}`}
                      variants={itemVariants}
                      onClick={() => {
                        onMoodChange(m.id);
                        saveSettings({ mood: m.id });
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-95 group",
                        currentMood === m.id 
                          ? "bg-white/10 border-white/30 ring-1 ring-white/20" 
                          : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        currentMood === m.id ? "bg-white/10" : "bg-white/5 group-hover:bg-white/10"
                      )}>
                        <m.icon className={cn("w-4 h-4", m.color)} />
                      </div>
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-sm font-semibold transition-colors",
                          currentMood === m.id ? "text-white" : "text-white/60 group-hover:text-white"
                        )}>{m.label}</span>
                        <span className="text-[10px] text-white/30 line-clamp-1">{m.description}</span>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </div>

               {/* Voice Selection */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-[0.2em] border-b border-white/10 pb-2">
                  <Mic className="w-3.5 h-3.5 text-pink-400" aria-hidden="true" /> Voice Profile
                </label>
                
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider block mb-3">Female Options</span>
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-2 gap-2.5"
                    >
                      {[
                        { id: 'Kore', label: 'Kore', desc: 'Standard Female' },
                        { id: 'Lyra', label: 'Lyra', desc: 'Soft & Calm' },
                        { id: 'Aoede', label: 'Aoede', desc: 'Warm & Expressive' }
                      ].map((v, i) => (
                        <motion.button
                          key={`settings-voice-profile-f-${v.id}-${i}`}
                          variants={itemVariants}
                          onClick={() => saveSettings({ selectedVoice: v.id })}
                          className={cn(
                            "flex flex-col gap-1 p-3 rounded-xl border text-left transition-all active:scale-95 group",
                            selectedVoice === v.id 
                              ? "bg-pink-500/10 border-pink-500/40 ring-1 ring-pink-500/40" 
                              : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-sm font-semibold",
                              selectedVoice === v.id ? "text-pink-400" : "text-white/70 group-hover:text-white"
                            )}>{v.label}</span>
                            {selectedVoice === v.id && (
                              <motion.div 
                                layoutId="voice-active-indicator"
                                className="w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.8)]" 
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-white/30">{v.desc}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  </div>

                  <div>
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider block mb-3">Male Options</span>
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-2 gap-2.5"
                    >
                      {[
                        { id: 'Charon', label: 'Charon', desc: 'Deep & Commanding' },
                        { id: 'Fenris', label: 'Fenris', desc: 'Cool & Collected' },
                        { id: 'Puck', label: 'Puck', desc: 'Light & Friendly' }
                      ].map((v, i) => (
                        <motion.button
                          key={`settings-voice-profile-m-${v.id}-${i}`}
                          variants={itemVariants}
                          onClick={() => saveSettings({ selectedVoice: v.id })}
                          className={cn(
                            "flex flex-col gap-1 p-3 rounded-xl border text-left transition-all active:scale-95 group",
                            selectedVoice === v.id 
                              ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/40" 
                              : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-sm font-semibold",
                              selectedVoice === v.id ? "text-blue-400" : "text-white/70 group-hover:text-white"
                            )}>{v.label}</span>
                            {selectedVoice === v.id && (
                              <motion.div 
                                layoutId="voice-active-indicator-male"
                                className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" 
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-white/30">{v.desc}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Speech & Response Speed */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-[0.2em] border-b border-white/10 pb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" /> Speech & Response Speed
                </label>
                
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                >
                  {[
                    { id: 'ultra-fast', label: 'Ultra Fast (350ms)', desc: 'Instant turn response. Recommended for snappy conversations.' },
                    { id: 'balanced', label: 'Balanced (500ms)', desc: 'Standard natural conversational pacing.' },
                    { id: 'relaxed', label: 'Relaxed (800ms)', desc: 'Allows longer pauses between sentences while speaking.' }
                  ].map((s) => (
                    <motion.button
                      key={`settings-speed-${s.id}`}
                      variants={itemVariants}
                      onClick={() => saveSettings({ responseSpeed: s.id })}
                      className={cn(
                        "flex flex-col gap-1 p-3 rounded-xl border text-left transition-all active:scale-95 group",
                        responseSpeed === s.id 
                          ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/40" 
                          : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-sm font-semibold",
                          responseSpeed === s.id ? "text-amber-400" : "text-white/70 group-hover:text-white"
                        )}>{s.label}</span>
                        {responseSpeed === s.id && (
                          <motion.div 
                            layoutId="speed-active-indicator"
                            className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" 
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-white/30">{s.desc}</span>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === 'pc' && (
            <motion.div 
              key="tab-pc"
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              {/* Native PC Bridge Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                    <Laptop className="w-4 h-4 text-cyan-400" aria-hidden="true" /> Desktop & PC Integration
                  </label>
                  <button 
                    onClick={fetchPcInfo}
                    title="Refresh PC Bridge Status"
                    className="p-1 text-white/40 hover:text-white/80 transition-colors rounded-md hover:bg-white/5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-black/30 p-4 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                      <span className="text-xs font-semibold text-white">Native Desktop Bridge</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase font-mono">
                      {pcInfo?.platform === 'win32' ? 'Windows' : pcInfo?.platform === 'darwin' ? 'macOS' : pcInfo?.platform || 'Active'}
                    </span>
                  </div>

                  {pcInfo && (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-white/60">
                      <div className="bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 flex items-center justify-between">
                        <span className="text-white/40">Host:</span>
                        <span className="text-white/80 font-mono truncate max-w-[120px]">{pcInfo.hostname}</span>
                      </div>
                      <div className="bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 flex items-center justify-between">
                        <span className="text-white/40">User:</span>
                        <span className="text-white/80 font-mono truncate max-w-[120px]">{pcInfo.username}</span>
                      </div>
                    </div>
                  )}

                  {pcActionStatus && (
                    <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span className="truncate">{pcActionStatus}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Launch PC Apps */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                  <Play className="w-3.5 h-3.5 text-purple-400" /> Launch Desktop Apps
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: 'Calculator', app: 'calc', icon: '🧮' },
                    { name: 'Notepad', app: 'notepad', icon: '📝' },
                    { name: 'VS Code', app: 'code', icon: '💻' },
                    { name: 'Chrome', app: 'chrome', icon: '🌐' },
                    { name: 'Spotify', app: 'spotify', icon: '🎵' },
                    { name: 'Terminal', app: 'terminal', icon: '⚡' },
                    { name: 'Task Manager', app: 'taskmgr', icon: '📊' },
                    { name: 'PC Settings', app: 'settings', icon: '⚙️' },
                    { name: 'Explorer', app: 'explorer', icon: '📁' },
                  ].map((item) => (
                    <button
                      key={item.app}
                      onClick={() => handlePcAction('open_app', { appName: item.app })}
                      className="flex items-center gap-2 p-2.5 bg-black/20 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left group"
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-xs font-medium text-white/80 group-hover:text-white truncate">{item.name}</span>
                    </button>
                  ))}
                </div>

                {/* Custom App Launcher Input */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={customAppInput}
                    onChange={(e) => setCustomAppInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customAppInput.trim()) {
                        handlePcAction('open_app', { appName: customAppInput.trim() });
                        setCustomAppInput('');
                      }
                    }}
                    placeholder="Enter any PC app (e.g. steam, vlc, discord)..."
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (customAppInput.trim()) {
                        handlePcAction('open_app', { appName: customAppInput.trim() });
                        setCustomAppInput('');
                      }
                    }}
                    className="px-3 py-2 bg-purple-600/80 hover:bg-purple-500 active:scale-95 text-white text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Play className="w-3 h-3" /> Launch
                  </button>
                </div>
              </div>

              {/* PC System Settings & Actions */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                  <Power className="w-3.5 h-3.5 text-cyan-400" /> PC Controls & Folders
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePcAction('pc_setting', { setting: 'lock' })}
                    className="flex items-center gap-2 p-2.5 bg-black/20 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left text-white/80 hover:text-white"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium">Lock Screen</span>
                  </button>
                  <button
                    onClick={() => handlePcAction('pc_setting', { setting: 'sleep' })}
                    className="flex items-center gap-2 p-2.5 bg-black/20 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left text-white/80 hover:text-white"
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-medium">Sleep PC</span>
                  </button>
                  <button
                    onClick={() => handlePcAction('open_folder', { path: 'Downloads' })}
                    className="flex items-center gap-2 p-2.5 bg-black/20 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left text-white/80 hover:text-white"
                  >
                    <Folder className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-medium">Open Downloads</span>
                  </button>
                  <button
                    onClick={() => handlePcAction('open_folder', { path: 'Desktop' })}
                    className="flex items-center gap-2 p-2.5 bg-black/20 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left text-white/80 hover:text-white"
                  >
                    <Folder className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-medium">Open Desktop</span>
                  </button>
                  <button
                    onClick={() => handlePcAction('control_volume', { value: 'mute' })}
                    className="flex items-center gap-2 p-2.5 bg-black/20 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left text-white/80 hover:text-white"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs font-medium">Toggle Mute</span>
                  </button>
                  <button
                    onClick={() => handlePcAction('control_volume', { value: 'up' })}
                    className="flex items-center gap-2 p-2.5 bg-black/20 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left text-white/80 hover:text-white"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-xs font-medium">System Volume +</span>
                  </button>
                </div>
              </div>

              {/* Assistive Mouse Cursor & Keyboard Automation Section */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest">
                    <MousePointer className="w-3.5 h-3.5 text-cyan-400" /> AI Cursor & Mouse Control
                  </label>
                  <button
                    onClick={() => setCursorControlEnabled(!cursorControlEnabled)}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider transition-colors border",
                      cursorControlEnabled 
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" 
                        : "bg-white/5 text-white/40 border-white/10"
                    )}
                  >
                    {cursorControlEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <p className="text-[11px] text-white/50 leading-relaxed">
                  Allows Sowa AI to navigate your screen, move the cursor, click buttons, scroll documents, and assist with desktop workflows.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Center Mouse', icon: MousePointer, action: () => handlePcAction('control_mouse', { subAction: 'move' }) },
                    { label: 'Left Click', icon: MousePointer, action: () => handlePcAction('control_mouse', { subAction: 'click' }) },
                    { label: 'Right Click', icon: MousePointer, action: () => handlePcAction('control_mouse', { subAction: 'right_click' }) },
                    { label: 'Double Click', icon: MousePointer, action: () => handlePcAction('control_mouse', { subAction: 'double_click' }) },
                    { label: 'Scroll Down', icon: ChevronDown, action: () => handlePcAction('control_mouse', { subAction: 'scroll_down', scrollAmount: 400 }) },
                    { label: 'Scroll Up', icon: ChevronDown, action: () => handlePcAction('control_mouse', { subAction: 'scroll_up', scrollAmount: 400 }) },
                  ].map((btn, i) => (
                    <button
                      key={`mouse-tool-${i}`}
                      onClick={btn.action}
                      disabled={!cursorControlEnabled}
                      className="flex items-center gap-1.5 p-2 bg-black/30 hover:bg-cyan-500/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none border border-white/5 hover:border-cyan-500/30 rounded-xl transition-all text-left text-white/80 hover:text-white"
                    >
                      <btn.icon className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="text-[11px] font-medium truncate">{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Keyboard Typing Automation */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-widest">
                    <Keyboard className="w-3.5 h-3.5 text-purple-400" /> AI Keyboard & Typing
                  </label>
                  <button
                    onClick={() => setKeyboardControlEnabled(!keyboardControlEnabled)}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider transition-colors border",
                      keyboardControlEnabled 
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/30" 
                        : "bg-white/5 text-white/40 border-white/10"
                    )}
                  >
                    {keyboardControlEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <p className="text-[11px] text-white/50 leading-relaxed">
                  Allows Sowa AI to type text directly into your active window, documents, search bars, or send hotkeys.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testTypeInput}
                    onChange={(e) => setTestTypeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && testTypeInput.trim()) {
                        handlePcAction('type_text', { text: testTypeInput.trim(), pressEnter: true });
                        setTestTypeInput('');
                      }
                    }}
                    placeholder="Test type phrase (e.g. Hello Sowa AI)..."
                    disabled={!keyboardControlEnabled}
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500 disabled:opacity-40"
                  />
                  <button
                    onClick={() => {
                      if (testTypeInput.trim()) {
                        handlePcAction('type_text', { text: testTypeInput.trim(), pressEnter: true });
                        setTestTypeInput('');
                      }
                    }}
                    disabled={!keyboardControlEnabled || !testTypeInput.trim()}
                    className="px-3 py-2 bg-purple-600/80 hover:bg-purple-500 active:scale-95 disabled:opacity-40 text-white text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Keyboard className="w-3 h-3" /> Type
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { label: 'Enter', key: 'enter' },
                    { label: 'Tab', key: 'tab' },
                    { label: 'Esc', key: 'escape' },
                    { label: 'Win+D', key: 'win+d' },
                    { label: 'Ctrl+C', key: 'ctrl+c' },
                    { label: 'Ctrl+V', key: 'ctrl+v' },
                    { label: 'Ctrl+Z', key: 'ctrl+z' },
                    { label: 'Ctrl+T', key: 'ctrl+t' },
                  ].map((k) => (
                    <button
                      key={`hotkey-btn-${k.key}`}
                      onClick={() => handlePcAction('press_hotkey', { key: k.key })}
                      disabled={!keyboardControlEnabled}
                      className="p-1.5 bg-black/30 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-lg text-center text-[10px] font-mono text-white/70 hover:text-white disabled:opacity-40"
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Windows Accessibility Suite */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <label className="flex items-center gap-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                  <MonitorUp className="w-3.5 h-3.5 text-amber-400" /> Windows Accessibility Suite
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePcAction('accessibility', { actionType: 'take_screenshot' })}
                    className="flex items-center gap-2 p-2.5 bg-black/20 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left text-white/80 hover:text-white"
                  >
                    <Camera className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-xs font-medium">Capture Screen</span>
                  </button>
                  <button
                    onClick={() => handlePcAction('accessibility', { actionType: 'read_clipboard' })}
                    className="flex items-center gap-2 p-2.5 bg-black/20 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left text-white/80 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-medium">Read Clipboard</span>
                  </button>
                  <button
                    onClick={() => handlePcAction('accessibility', { actionType: 'open_magnifier' })}
                    className="flex items-center gap-2 p-2.5 bg-black/20 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left text-white/80 hover:text-white"
                  >
                    <Search className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium">Screen Magnifier</span>
                  </button>
                  <button
                    onClick={() => handlePcAction('accessibility', { actionType: 'open_osk' })}
                    className="flex items-center gap-2 p-2.5 bg-black/20 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left text-white/80 hover:text-white"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-medium">On-Screen Keyboard</span>
                  </button>
                </div>
              </div>

              {/* Display Brightness */}
              <div className="space-y-4 pt-2 border-t border-white/10">
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 pb-1">
                  <Monitor className="w-4 h-4 text-cyan-400" aria-hidden="true" /> App Display & Brightness
                </label>
                <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="text-xs text-white/50 font-medium w-20">Brightness</div>
                  <input 
                    type="range" min="0" max="100" value={brightness} 
                    onChange={(e) => saveSettings({ brightness: Number(e.target.value) })}
                    className="flex-1 accent-cyan-400 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-xs text-white/80 w-8">{brightness}%</div>
                </div>
              </div>

              {/* Sound */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 pb-1">
                  <Volume2 className="w-4 h-4 text-pink-400" aria-hidden="true" /> Sowa AI Voice Volume
                </label>
                <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="text-xs text-white/50 font-medium w-20">Volume</div>
                  <input 
                    type="range" min="0" max="100" value={volume} 
                    onChange={(e) => saveSettings({ volume: Number(e.target.value) })}
                    className="flex-1 accent-pink-400 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-xs text-white/80 w-8">{volume}%</div>
                </div>
              </div>

              {/* Wallpaper */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 pb-1">
                  <ImageIcon className="w-4 h-4 text-purple-400" aria-hidden="true" /> Background
                </label>
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-3 gap-3"
                >
                  {themeList.map(theme => (
                    <motion.button 
                      key={`settings-wallpaper-theme-${theme}`}
                      variants={itemVariants}
                      onClick={() => saveSettings({ activeWallpaper: theme })}
                      className={`h-16 rounded-xl border relative overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${activeWallpaper === theme ? 'border-purple-500 scale-95 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-white/10 hover:border-white/30'}`}
                    >
                      {/* Fake preview gradients */}
                      <div className="absolute inset-0 bg-gradient-to-br from-black/80 to-transparent z-10" />
                      {theme === 'atmosphere' && <div className="absolute inset-0 bg-gradient-to-br from-rose-900 via-orange-800 to-purple-900 filter blur-sm" />}
                      {theme === 'nebula' && <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-cyan-900 filter blur-sm" />}
                      {theme === 'void' && <div className="absolute inset-0 bg-black" />}
                      <span className="absolute bottom-2 left-2 z-20 text-[10px] font-medium text-white uppercase tracking-wider capitalize">{theme}</span>
                    </motion.button>
                  ))}
                  
                  {/* Custom Wallpaper Upload */}
                  <motion.button 
                    variants={itemVariants}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "h-16 rounded-xl border relative overflow-hidden flex flex-col items-center justify-center gap-1 transition-all group",
                      !['atmosphere', 'nebula', 'void'].includes(activeWallpaper) 
                        ? "border-purple-500 scale-95 shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                        : "border-dashed border-white/20 hover:bg-white/5 hover:border-white/40"
                    )}
                  >
                    {!['atmosphere', 'nebula', 'void'].includes(activeWallpaper) && activeWallpaper.startsWith('data:') ? (
                      <>
                        <img src={activeWallpaper} alt="Custom" className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-80" />
                        <div className="absolute inset-0 bg-black/40 z-10" />
                      </>
                    ) : (
                      <ImageIcon className="w-4 h-4 text-white/40 group-hover:text-white/80" />
                    )}
                    <span className="relative z-20 text-[10px] font-medium uppercase text-white/60 group-hover:text-white">Custom</span>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleCustomWallpaper} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  </div>
)}
</AnimatePresence>
);
}
