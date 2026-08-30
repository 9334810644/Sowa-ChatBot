import React, { useRef, useEffect, useState, useCallback } from "react";
import { Power, MicOff, Globe, Sparkles, Zap, Heart, Trash2, Volume2, Camera, Monitor, CameraOff, MonitorOff, Maximize2, Minimize2, Settings2, Brain, ChevronDown, ChevronRight, Coffee, Briefcase, Flame, Pause, Play, MessageSquare, Menu, LogIn, LogOut, Info, Wifi, Bluetooth, Timer as TimerIcon, Calendar, CheckSquare, Search, Image as ImageIcon, X, Mic } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import VoiceVisualizer from "./VoiceVisualizer";
import ChatModal from "./ChatModal";
import SettingsModal from "./SettingsModal";
import MemoryHub from "./MemoryHub";
import OnboardingModal from "./OnboardingModal";
import { useWakeWord } from "../hooks/useWakeWord";
import { useLiveSession, Mood, CORE_MOODS } from "../hooks/useLiveSession";
import { generateId } from "../lib/uuid";
import { cn } from "../lib/utils";
import { safeSaveToLocalStorage } from "../lib/storage";
import { MOOD_METADATA } from "../constants";

const ALARM_SOUNDS: Record<string, { label: string, url: string }> = {
  digital: { label: "Digital Watch", url: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg" },
  bell: { label: "Classic Bell", url: "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" },
  beep: { label: "Short Beep", url: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg" },
  buzzer: { label: "Loud Buzzer", url: "https://actions.google.com/sounds/v1/alarms/buzzer_alarm.ogg" }
};

export default function MayaAssistant() {
  const [mood, setMood] = useState<Mood>(() => {
    try {
      const savedSettings = localStorage.getItem('sowa_app_settings') || localStorage.getItem('maya_app_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.mood) return parsed.mood;
      }
    } catch (e) {}
    return 'formal';
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isToolExecuting, setIsToolExecuting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [socialNotif, setSocialNotif] = useState<{ platform: string, content: string, manual?: boolean } | null>(null);
  
  const [timers, setTimers] = useState<{ id: string, label: string, timeLeft: number, duration: number, isPaused: boolean }[]>([]);
  const [completedTimers, setCompletedTimers] = useState<{ id: string, label: string }[]>([]);
  
  const [alarmVolume, setAlarmVolume] = useState(1.0);
  const [alarmSound, setAlarmSound] = useState("digital");
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [isContextMenuMoodOpen, setIsContextMenuMoodOpen] = useState(true);

  // PC Settings States
  const [pcBrightness, setPcBrightness] = useState(80);
  const [pcVolume, setPcVolume] = useState(65);
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
  const [activeWallpaper, setActiveWallpaper] = useState('atmosphere');
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<{ id: string, url: string, reason: string, timestamp: number }[]>(() => {
    try {
      const saved = localStorage.getItem('sowa_snapshots') || localStorage.getItem('maya_snapshots');
      const parsed = saved ? JSON.parse(saved) : [];
      // Deduplicate on load just in case
      const seen = new Set();
      return parsed.filter((s: any) => {
        if (!s.id || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
    } catch (e) {
      return [];
    }
  });
  const [isSnapshotFlash, setIsSnapshotFlash] = useState(false);
  const [isWatchingTogether, setIsWatchingTogether] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [responseSpeed, setResponseSpeed] = useState<'ultra-fast' | 'balanced' | 'relaxed'>('ultra-fast');
  const [settingsTab, setSettingsTab] = useState<'general' | 'pc' | 'assistant'>('general');

  const { 
    state, error, lastAction, volume, appVolume,
    isCameraOn, setIsCameraOn, isScreenOn, setIsScreenOn, 
    memory, setMemory, history, setHistory, 
    sessions, currentSessionId, switchSession,
    evolution, setEvolution, isPaused, togglePause,
    deleteSession, deleteHistoryItem, clearSessions,
    sendVideoFrame, connect, disconnect, setLastAction
  } = useLiveSession(mood, selectedVoice, isWatchingTogether, responseSpeed);

  // Deduplicate memory and history on change to satisfy React keys
  useEffect(() => {
    if (memory.length > 0) {
      const seen = new Set();
      const deduped = memory.filter(m => {
        if (seen.has(m)) return false;
        seen.add(m);
        return true;
      });
      if (deduped.length !== memory.length) {
        setMemory(deduped);
      }
    }
  }, [memory, setMemory]);

  useEffect(() => {
    if (history.length > 0) {
      const seen = new Set();
      const deduped = history.filter(h => {
        const id = h.id || `${h.timestamp}-${(h as any).message?.substring(0, 20)}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      if (deduped.length !== history.length) {
        setHistory(deduped);
      }
    }
  }, [history, setHistory]);

  const moods = MOOD_METADATA;

  const currentMoodObj = moods.find(m => m.id === mood) || moods[0];

  const [hubTab, setHubTab] = useState<'insights' | 'chronicles' | 'album' | 'evolution' | 'web'>('insights');
  const [hubUrl, setHubUrl] = useState('');
  const [showVolume, setShowVolume] = React.useState(false);
  const volumeTimeout = useRef<any>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    alarmAudioRef.current = new Audio(ALARM_SOUNDS[alarmSound].url);
    alarmAudioRef.current.loop = true;
    alarmAudioRef.current.volume = alarmVolume * (pcVolume / 100);
  }, [alarmSound, alarmVolume, pcVolume]);

  useEffect(() => {
    const loadSettings = (parsed: any) => {
      if (parsed.brightness !== undefined) setPcBrightness(parsed.brightness);
      if (parsed.volume !== undefined) setPcVolume(parsed.volume);
      if (parsed.wifiEnabled !== undefined) setWifiEnabled(parsed.wifiEnabled);
      if (parsed.bluetoothEnabled !== undefined) setBluetoothEnabled(parsed.bluetoothEnabled);
      if (parsed.activeWallpaper !== undefined) setActiveWallpaper(parsed.activeWallpaper);
      if (parsed.selectedVoice !== undefined) setSelectedVoice(parsed.selectedVoice);
      if (parsed.responseSpeed !== undefined) setResponseSpeed(parsed.responseSpeed);
      if (parsed.mood !== undefined) setMood(parsed.mood);
    };

    const savedSettings = localStorage.getItem('sowa_app_settings') || localStorage.getItem('maya_app_settings');
    if (savedSettings) {
      try { loadSettings(JSON.parse(savedSettings)); } catch(e) {}
    }

    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      loadSettings(customEvent.detail);
    };

    window.addEventListener('sowa-settings-changed', handleSettingsChanged);
    window.addEventListener('maya-settings-changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('sowa-settings-changed', handleSettingsChanged);
      window.removeEventListener('maya-settings-changed', handleSettingsChanged);
    };
  }, []);

  // Check if API key is missing on initial launch (especially fresh desktop installation)
  useEffect(() => {
    const checkInitialApiKey = async () => {
      const localKey = localStorage.getItem('sowa_gemini_api_key') || localStorage.getItem('maya_gemini_api_key');
      if (!localKey) {
        try {
          const res = await fetch('/api/config');
          const data = await res.json();
          if (!data.hasGeminiKey) {
            setIsOnboardingOpen(true);
          }
        } catch (e) {
          setIsOnboardingOpen(true);
        }
      }
    };
    checkInitialApiKey();
  }, []);

  // Automatically open onboarding setup if live session returns missing API key error
  useEffect(() => {
    if (error && (error.toLowerCase().includes("api key") || error.toLowerCase().includes("key is missing"))) {
      setIsOnboardingOpen(true);
    }
  }, [error]);

  const isActive = state !== 'disconnected' && state !== 'error';

  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => {
    const saved = localStorage.getItem('sowa_wake_word_enabled') || localStorage.getItem('maya_wake_word_enabled');
    return saved !== 'false';
  });

  const handleConnectWithKeyCheck = useCallback(async () => {
    if (!wifiEnabled || (state !== 'disconnected' && state !== 'error')) return;
    const localKey = localStorage.getItem('sowa_gemini_api_key') || localStorage.getItem('maya_gemini_api_key');
    if (!localKey) {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (!data.hasGeminiKey) {
          setIsOnboardingOpen(true);
          return;
        }
      } catch (e) {
        setIsOnboardingOpen(true);
        return;
      }
    }
    connect();
  }, [wifiEnabled, state, connect]);

  const handleWakeWordTriggered = useCallback((transcript?: string) => {
    console.log("[WakeWord] Triggered with phrase:", transcript);
    setLastAction("Waking up to assist you...");
    handleConnectWithKeyCheck();
  }, [handleConnectWithKeyCheck, setLastAction]);

  const { isListeningForWake } = useWakeWord({
    enabled: wakeWordEnabled && !isSettingsOpen && !isOnboardingOpen,
    onWake: handleWakeWordTriggered,
    isActive
  });

  // Bio-Rhythm System: Maintains formal tone as default or adjusts smoothly if bio-rhythm is desired
  useEffect(() => {
    const updateBioRhythm = () => {
      const savedSettings = localStorage.getItem('sowa_app_settings') || localStorage.getItem('maya_app_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.mood) {
            setMood(parsed.mood);
            return;
          }
        } catch (e) {}
      }

      setMood(prev => {
        if (prev === '18+' || prev === 'casual' || prev === 'serious') return prev;
        return 'formal';
      });
    };

    updateBioRhythm();
    const interval = setInterval(updateBioRhythm, 60000 * 30); // Check every 30 mins
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (alarmAudioRef.current) {
      const wasPlaying = !alarmAudioRef.current.paused;
      if (alarmAudioRef.current.src !== ALARM_SOUNDS[alarmSound].url) {
        alarmAudioRef.current.src = ALARM_SOUNDS[alarmSound].url;
        if (wasPlaying) {
          alarmAudioRef.current.play().catch(e => console.log(e));
        }
      }
      alarmAudioRef.current.volume = alarmVolume;
    }
  }, [alarmSound, alarmVolume]);

  useEffect(() => {
    const handleMoodChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.mood) {
        setMood(customEvent.detail.mood as Mood);
      }
    };
    const handleSleepMode = (e: Event) => {
      // placeholder
    };

    const handleNavigateHub = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.tab) {
        setHubTab(customEvent.detail.tab);
        if (customEvent.detail.url) setHubUrl(customEvent.detail.url);
        setIsMemoryOpen(true);
      }
    };

    const handleNavigateSettings = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.tab) {
        setSettingsTab(customEvent.detail.tab);
        setIsSettingsOpen(true);
      }
    };
    const handleSetTimer = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { duration, label } = customEvent.detail;
        setTimers(prev => [...prev, { id: generateId(), label, timeLeft: duration, duration, isPaused: false }]);
      }
    };
    const handleManageTimer = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { action, timerId } = customEvent.detail;
        setTimers(prev => {
          if (action === "clear_all") return [];
          return prev.map(t => {
            if (timerId && t.id !== timerId && timerId !== "all") return t;
            if (action === "pause") return { ...t, isPaused: true };
            if (action === "resume") return { ...t, isPaused: false };
            return t;
          }).filter(t => {
             if (action === "cancel") {
               if (timerId === "all" || t.id === timerId || t.label.toLowerCase().includes(timerId.toLowerCase())) {
                 return false;
               }
             }
             return true;
          });
        });
      }
    };
    
    const handleToolExecuted = () => {
      setIsToolExecuting(true);
      setTimeout(() => {
        setIsToolExecuting(false);
      }, 1500); // ensure enough time for the full framer-motion shimmer
    };

    const handleScanVision = () => {
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
      }, 4000);
    };

    const handleTakeSnapshot = (e: Event) => {
      const customEvent = e as CustomEvent<{ reason: string }>;
      const reason = customEvent.detail?.reason || "Neural Insight";
      
      setIsSnapshotFlash(true);
      setTimeout(() => setIsSnapshotFlash(false), 500);

      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx && videoRef.current) {
          ctx.drawImage(videoRef.current, 0, 0);
          const url = canvas.toDataURL('image/jpeg', 0.5); // Increase compression
          const newSnapshot = {
            id: generateId(),
            url,
            reason,
            timestamp: Date.now()
          };
          setSnapshots(prev => {
            const updated = [newSnapshot, ...prev].slice(0, 4); // Keep last 4 to save space
            safeSaveToLocalStorage('sowa_snapshots', JSON.stringify(updated));
            safeSaveToLocalStorage('maya_snapshots', JSON.stringify(updated));
            return updated;
          });
        }
      }
    };

    const handleStartScenario = (e: Event) => {
      const customEvent = e as CustomEvent<{ scenario: string, vibe: string }>;
      const { scenario, vibe } = customEvent.detail;
      setActiveScenario(scenario);
      
      // Map scenarios to wallpapers
      if (scenario.toLowerCase().includes('cyberpunk')) setActiveWallpaper('https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80&w=2000');
      else if (scenario.toLowerCase().includes('cabin')) setActiveWallpaper('https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&q=80&w=2000');
      else if (scenario.toLowerCase().includes('space')) setActiveWallpaper('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000');
      else if (scenario.toLowerCase().includes('beach')) setActiveWallpaper('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000');
      else if (scenario.toLowerCase().includes('rain')) setActiveWallpaper('https://images.unsplash.com/photo-1534274988757-a28bf1f53917?auto=format&fit=crop&q=80&w=2000');
      else if (scenario.toLowerCase().includes('sunset')) setActiveWallpaper('https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=2000');
      else if (scenario.toLowerCase().includes('forest')) setActiveWallpaper('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=2000');
      else if (scenario.toLowerCase().includes('city') || scenario.toLowerCase().includes('tokyo')) setActiveWallpaper('https://images.unsplash.com/photo-1503891450247-ee5f8bbaf7ef?auto=format&fit=crop&q=80&w=2000');
    };

    const handleToggleWatchTogether = (e: Event) => {
      const customEvent = e as CustomEvent<{ action: 'on' | 'off' }>;
      const turnOn = customEvent.detail.action === 'on';
      
      if (turnOn && !isCameraOn && !isScreenOn) {
        // Voice command might trigger this, so we try to provide a smooth experience
        // but browsers still might block getDisplayMedia without a fresh gesture.
        // We'll try to trigger it and handle errors.
        toggleScreen('on');
      }
      setIsWatchingTogether(turnOn);
    };

    const handleRestoreSessionContext = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (customEvent.detail.mood) setMood(customEvent.detail.mood);
        if (customEvent.detail.voice) setSelectedVoice(customEvent.detail.voice);
      }
    };

    const handleGenerateImage = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string, reason: string }>;
      const { url, reason } = customEvent.detail;
      
      const newSnapshot = {
        id: generateId(),
        url,
        reason,
        timestamp: Date.now()
      };
      setSnapshots(prev => {
        const updated = [newSnapshot, ...prev].slice(0, 4); // Keep last 4 to save space
        safeSaveToLocalStorage('sowa_snapshots', JSON.stringify(updated));
        safeSaveToLocalStorage('maya_snapshots', JSON.stringify(updated));
        return updated;
      });
      // Vision is stored, no need to open Hub immediately every time
    };

    const handleSocialPost = (e: Event) => {
      const customEvent = e as CustomEvent<{ platform: string, content: string, manual?: boolean }>;
      setSocialNotif(customEvent.detail);
      setTimeout(() => setSocialNotif(null), 6000);
    };

    window.addEventListener('sowa-restore-session-context', handleRestoreSessionContext);
    window.addEventListener('maya-restore-session-context', handleRestoreSessionContext);
    window.addEventListener('sowa-change-mood', handleMoodChange);
    window.addEventListener('maya-change-mood', handleMoodChange);
    window.addEventListener('sowa-set-timer', handleSetTimer);
    window.addEventListener('maya-set-timer', handleSetTimer);
    window.addEventListener('sowa-manage-timer', handleManageTimer);
    window.addEventListener('maya-manage-timer', handleManageTimer);
    window.addEventListener('sowa-tool-executed', handleToolExecuted);
    window.addEventListener('maya-tool-executed', handleToolExecuted);
    window.addEventListener('sowa-scan-vision', handleScanVision);
    window.addEventListener('maya-scan-vision', handleScanVision);
    window.addEventListener('sowa-take-snapshot', handleTakeSnapshot);
    window.addEventListener('maya-take-snapshot', handleTakeSnapshot);
    window.addEventListener('sowa-start-scenario', handleStartScenario);
    window.addEventListener('maya-start-scenario', handleStartScenario);
    window.addEventListener('sowa-toggle-watch-together', handleToggleWatchTogether);
    window.addEventListener('maya-toggle-watch-together', handleToggleWatchTogether);
    window.addEventListener('sowa-navigate-hub', handleNavigateHub);
    window.addEventListener('maya-navigate-hub', handleNavigateHub);
    window.addEventListener('sowa-navigate-settings', handleNavigateSettings);
    window.addEventListener('maya-navigate-settings', handleNavigateSettings);
    window.addEventListener('sowa-generate-image', handleGenerateImage);
    window.addEventListener('maya-generate-image', handleGenerateImage);
    window.addEventListener('sowa-social-post', handleSocialPost);
    window.addEventListener('maya-social-post', handleSocialPost);
    return () => {
      window.removeEventListener('sowa-restore-session-context', handleRestoreSessionContext);
      window.removeEventListener('maya-restore-session-context', handleRestoreSessionContext);
      window.removeEventListener('sowa-change-mood', handleMoodChange);
      window.removeEventListener('maya-change-mood', handleMoodChange);
      window.removeEventListener('sowa-set-timer', handleSetTimer);
      window.removeEventListener('maya-set-timer', handleSetTimer);
      window.removeEventListener('sowa-manage-timer', handleManageTimer);
      window.removeEventListener('maya-manage-timer', handleManageTimer);
      window.removeEventListener('sowa-tool-executed', handleToolExecuted);
      window.removeEventListener('maya-tool-executed', handleToolExecuted);
      window.removeEventListener('sowa-scan-vision', handleScanVision);
      window.removeEventListener('maya-scan-vision', handleScanVision);
      window.removeEventListener('sowa-take-snapshot', handleTakeSnapshot);
      window.removeEventListener('maya-take-snapshot', handleTakeSnapshot);
      window.removeEventListener('sowa-start-scenario', handleStartScenario);
      window.removeEventListener('maya-start-scenario', handleStartScenario);
      window.removeEventListener('sowa-toggle-watch-together', handleToggleWatchTogether);
      window.removeEventListener('maya-toggle-watch-together', handleToggleWatchTogether);
      window.removeEventListener('sowa-navigate-hub', handleNavigateHub);
      window.removeEventListener('maya-navigate-hub', handleNavigateHub);
      window.removeEventListener('sowa-navigate-settings', handleNavigateSettings);
      window.removeEventListener('maya-navigate-settings', handleNavigateSettings);
      window.removeEventListener('sowa-generate-image', handleGenerateImage);
      window.removeEventListener('maya-generate-image', handleGenerateImage);
      window.removeEventListener('sowa-social-post', handleSocialPost);
      window.removeEventListener('maya-social-post', handleSocialPost);
    };
  }, []);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimers(prev => {
        let newCompleted: { id: string, label: string }[] = [];
        
        const nextTimers = prev.map(t => {
          if (t.isPaused) return t;
          const nextTime = Math.max(0, t.timeLeft - 1);
          if (t.timeLeft > 0 && nextTime === 0) {
            newCompleted.push({ id: t.id, label: t.label });
          }
          return { ...t, timeLeft: nextTime };
        });

        if (newCompleted.length > 0) {
          if (alarmAudioRef.current) {
            alarmAudioRef.current.play().catch(e => console.log("Audio play failed:", e));
          }
          setCompletedTimers(curr => {
            const existingIds = new Set(curr.map(c => c.id));
            const trulyNew = newCompleted.filter(c => !existingIds.has(c.id));
            return [...curr, ...trulyNew];
          });
        }
        
        return nextTimers.filter(t => t.timeLeft > 0);
      });
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    setShowVolume(true);
    if (volumeTimeout.current) clearTimeout(volumeTimeout.current);
    volumeTimeout.current = setTimeout(() => setShowVolume(false), 2000);
  }, [appVolume]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    const handleInteraction = () => {
      if (lastAction) setLastAction(null);
    };
    
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("mousedown", handleInteraction);
    document.addEventListener("keydown", handleInteraction);
    
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("mousedown", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, [lastAction, setLastAction]);

  // Proactive Brain: Initiate conversation if idle
  useEffect(() => {
    if (state === 'disconnected' || state === 'connecting' || state === 'error') return;

    let idleTimeout: any;
    
    const resetIdle = () => {
      if (idleTimeout) clearTimeout(idleTimeout);
      const randomMinutes = Math.floor(Math.random() * 5) + 3; // 3 to 8 minutes
      idleTimeout = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sowa-proactive-nudge'));
        window.dispatchEvent(new CustomEvent('maya-proactive-nudge'));
      }, 60000 * randomMinutes);
    };

    // Reset idle on volume activity or tool execution
    if (volume > 0.1 || isToolExecuting) {
      resetIdle();
    }

    resetIdle();
    return () => clearTimeout(idleTimeout);
  }, [state, volume, isToolExecuting]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Keep it on screen
    const x = Math.min(e.clientX, window.innerWidth - 224); // 224 is w-56
    const y = Math.min(e.clientY, window.innerHeight - 250);
    setContextMenu({ x, y });
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const isActive = state !== 'disconnected';
  const isSpeaking = state === 'speaking';
  const isPresetWallpaper = ['atmosphere', 'nebula', 'void'].includes(activeWallpaper);

  // Frame capture loop for Real-time Vision
  useEffect(() => {
    let interval: any;
    if (isActive && (isCameraOn || isScreenOn)) {
      interval = setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const context = canvasRef.current.getContext('2d');
          if (context) {
            context.drawImage(videoRef.current, 0, 0, 320, 240);
            const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
            sendVideoFrame(base64, 'image/jpeg');
          }
        }
      }, 400); // 400ms for smoother stream
    }
    return () => clearInterval(interval);
  }, [isActive, isCameraOn, isScreenOn, sendVideoFrame]);

  // Passive Reaction Loop for "Watch Together"
  useEffect(() => {
    let watchInterval: any;
    if (isActive && isWatchingTogether && (isCameraOn || isScreenOn)) {
      // Periodic check every 4-7 seconds (more frequent for better reactivity)
      const checkReaction = () => {
        if (state === 'listening' && !isPaused) {
          // Send a powerful nudge to the model to react to its own "sight"
          const prompt = "[PROACTIVE REACTION NUDGE: You are watching this content WITH the user right now. You are in WATCH TOGETHER mode. Look at the recent video frames. Detect the GENRE (Horror, Action, Romance, Comedy) and the current EMOTIONAL TONE. REACT IMMEDIATELY, VOCALLY, and NATURALLY. If there's a jumpscare, SCREAM. If it's a joke, LAUGH. If it's intense, get HYPE. If it's romantic, GUSHHH. Speak out of your own will. Match the scene's BPM and vibe perfectly. No robot talk.]";
          window.dispatchEvent(new CustomEvent('sowa-proactive-nudge', { detail: { prompt } }));
          window.dispatchEvent(new CustomEvent('maya-proactive-nudge', { detail: { prompt } }));
        }
        
        const nextInterval = Math.floor(Math.random() * 3000) + 4000;
        watchInterval = setTimeout(checkReaction, nextInterval);
      };
      
      watchInterval = setTimeout(checkReaction, 2000);
    }
    return () => clearTimeout(watchInterval);
  }, [isActive, isWatchingTogether, isCameraOn, isScreenOn, state, isPaused]);

  const toggleCamera = async (forceState?: 'on' | 'off') => {
    const turnOn = forceState === 'on' || (forceState === undefined && !isCameraOn);
    
    if (!turnOn) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      setIsCameraOn(false);
      if (isScreenOn && screenStreamRef.current && videoRef.current) {
        videoRef.current.srcObject = screenStreamRef.current;
      }
    } else {
      try {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(t => t.stop());
          screenStreamRef.current = null;
        }
        setIsScreenOn(false);

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        cameraStreamRef.current = stream;
        setIsCameraOn(true);
      } catch (err: any) {
        console.error("Failed to start camera:", err);
        const errName = err.name || "";
        const errMsg = err.message || "";

        const isUserCancel = 
          errName === 'NotAllowedError' || 
          errName === 'AbortError' || 
          errMsg.toLowerCase().includes('permission denied') ||
          errMsg.toLowerCase().includes('user cancelled');

        const isGestureError = 
          errMsg.toLowerCase().includes('user activation') || 
          errMsg.toLowerCase().includes('gesture');

        if (isGestureError) {
          alert("Sowa AI tried to turn on your camera, but browsers require you to click the 'Camera' button manually for security. Please click the camera icon in the bottom bar!");
        } else if (!isUserCancel) {
          alert(`Camera access failed: ${errMsg}. Please check your browser permissions.`);
        }
      }
    }
  };

  const toggleScreen = async (forceState?: 'on' | 'off') => {
    const turnOn = forceState === 'on' || (forceState === undefined && !isScreenOn);

    if (!turnOn) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenOn(false);
      if (isCameraOn && cameraStreamRef.current && videoRef.current) {
         videoRef.current.srcObject = cameraStreamRef.current;
      } else if (videoRef.current) {
         videoRef.current.srcObject = null;
      }
    } else {
      try {
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach(t => t.stop());
          cameraStreamRef.current = null;
        }
        setIsCameraOn(false);

        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        
        // Handle user stopping screen share via browser UI
        stream.getVideoTracks()[0].onended = () => {
           toggleScreen('off');
        };

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        screenStreamRef.current = stream;
        setIsScreenOn(true);
      } catch (err: any) {
        console.error("Failed to start screen share:", err);
        const errName = err.name || "";
        const errMsg = err.message || "";
        
        const isUserCancel = 
          errName === 'NotAllowedError' || 
          errName === 'AbortError' || 
          errMsg.toLowerCase().includes('permission denied') ||
          errMsg.toLowerCase().includes('user cancelled');

        const isGestureError = 
          errMsg.toLowerCase().includes('user activation') || 
          errMsg.toLowerCase().includes('gesture');

        if (isGestureError) {
          alert("Sowa AI tried to start screen sharing, but browsers require you to click the 'Screen Share' button manually for security. Please click the icon in the bottom bar!");
        } else if (!isUserCancel) {
          alert(`Screen share failed: ${errMsg}. If you are in a preview, make sure you have allowed screen sharing permissions in your browser for this site.`);
        }
      }
    }
  };

  // Listen to Sowa AI Voice Commands
  useEffect(() => {
    const handleCameraControl = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.action) {
        toggleCamera(customEvent.detail.action);
      }
    };
    const handleScreenControl = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.action) {
        toggleScreen(customEvent.detail.action);
      }
    };

    window.addEventListener('sowa-toggle-camera', handleCameraControl);
    window.addEventListener('maya-toggle-camera', handleCameraControl);
    window.addEventListener('sowa-toggle-screen', handleScreenControl);
    window.addEventListener('maya-toggle-screen', handleScreenControl);
    return () => {
      window.removeEventListener('sowa-toggle-camera', handleCameraControl);
      window.removeEventListener('maya-toggle-camera', handleCameraControl);
      window.removeEventListener('sowa-toggle-screen', handleScreenControl);
      window.removeEventListener('maya-toggle-screen', handleScreenControl);
    };
  }, [isCameraOn, isScreenOn]);

  const menuItemsVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        type: "spring" as any,
        stiffness: 260,
        damping: 20,
      },
    }),
  };

  const contextMenuVariants = {
    hidden: { opacity: 0, scale: 0.9, y: -10, filter: 'blur(10px)' },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      filter: 'blur(0px)',
      transition: {
        type: "spring" as any,
        damping: 25,
        stiffness: 300
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: -10, 
      filter: 'blur(10px)',
      transition: { duration: 0.2 }
    }
  };

  return (
    <main 
      className="fixed inset-0 flex flex-col items-center justify-center bg-transparent text-white font-sans overflow-hidden select-none transition-all duration-1000"
      onContextMenu={handleContextMenu}
      style={!isPresetWallpaper ? { 
        backgroundImage: `url(${activeWallpaper})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        backgroundRepeat: 'no-repeat' 
      } : {}}
    >
      {/* Background Aura / Theme Layer */}
      <motion.div 
        animate={{ 
          opacity: isActive ? 0.4 + (volume * 0.4) : 0.4,
          scale: isActive ? 1 + (volume * 0.05) : 1
        }}
        className={cn(
          "absolute inset-0 z-0 pointer-events-none transition-all duration-1000",
          isPresetWallpaper ? (mood === 'serious' ? 'bg-mood-serious' : 
                               mood === 'casual' ? 'bg-mood-casual' : 
                               mood === 'formal' ? 'bg-mood-formal' : 
                               mood === '18+' ? 'bg-mood-18plus' : activeWallpaper) : "bg-black/40 backdrop-blur-[2px]"
        )} 
      />
      
      {/* Dynamic Animated Nebula Overlay (Only for preset wallpapers) */}
      {isPresetWallpaper && (
        <motion.div 
          animate={{ 
            opacity: isActive ? 0.2 + (volume * 0.5) : 0.4,
            filter: isActive ? `blur(${80 - (volume * 20)}px)` : 'blur(80px)'
          }}
          className={cn(
            "absolute inset-0 z-0 pointer-events-none transition-all duration-1000",
            activeWallpaper === 'nebula' ? 'nebula' : 'atmosphere'
          )} 
        />
      )}

      {/* Cybernetic Dot Matrix Mesh Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_85%)]" />

      {/* Snapshot Flash */}
      <AnimatePresence>
        {isSnapshotFlash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white pointer-events-none"
            transition={{ duration: 0.1 }}
          />
        )}
      </AnimatePresence>

      {/* Social Post Notification */}
      <AnimatePresence>
        {socialNotif && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] w-[320px] glass-panel p-4 flex items-center gap-4 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
              socialNotif.platform === 'twitter' ? "bg-[#1da1f2]" : 
              socialNotif.platform === 'linkedin' ? "bg-[#0077b5]" : 
              socialNotif.platform === 'telegram' ? "bg-[#0088cc]" : 
              socialNotif.platform === 'google_chat' ? "bg-[#00a651]" : "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500"
            )}>
              {socialNotif.platform === 'twitter' ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              ) : socialNotif.platform === 'linkedin' ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              ) : socialNotif.platform === 'telegram' ? (
                <svg className="w-5 h-5 text-white mr-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.89 8.07l-2.01 9.47c-.15.68-.56.84-1.12.52l-3.04-2.24-1.47 1.41c-.16.16-.3.3-.61.3l.22-3.11 5.67-5.11c.25-.22-.05-.34-.38-.12L8.14 13.5l-3.02-.94c-.66-.21-.67-.66.14-.97l11.78-4.54c.54-.2 1.02.13.85 1.02z"/></svg>
              ) : socialNotif.platform === 'google_chat' ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2.206 13.914a1.706 1.706 0 111.706-1.706 1.706 1.706 0 01-1.706 1.706zm19.588 0a1.706 1.706 0 111.706-1.706 1.706 1.706 0 01-1.706 1.706zM7.324 13.914a1.706 1.706 0 111.706-1.706 1.706 1.706 0 01-1.706 1.706zm9.352 0a1.706 1.706 0 111.706-1.706 1.706 1.706 0 01-1.706 1.706zM12 13.914a1.706 1.706 0 111.706-1.706 1.706 1.706 0 01-1.706 1.706z"/></svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{socialNotif.platform.replace('_', ' ')}</span>
                <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              </div>
              <p className="text-[11px] font-bold text-white mb-0.5">
                {socialNotif.platform === 'google_chat' ? "Neural Transmission" : socialNotif.manual ? "Post Initiated" : "Posted Immediately"}
              </p>
              <p className="text-[10px] text-white/40 line-clamp-1 italic">
                "{socialNotif.content}"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "absolute top-20 sm:top-6 left-1/2 sm:left-6 -translate-x-1/2 sm:-translate-x-0 z-40 rounded-2xl sm:rounded-3xl overflow-hidden glass-panel shadow-2xl transition-all duration-700",
        (isCameraOn || isScreenOn) ? "w-48 h-36 sm:w-72 sm:h-48 opacity-100 scale-100 ring-2 ring-white/10" : "w-0 h-0 opacity-0 scale-95",
        (isCameraOn && !isPaused) ? "ring-[#ff4e00]/50 shadow-[0_0_30px_rgba(255,78,0,0.2)]" : "",
        (isScreenOn && !isPaused) ? "ring-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)]" : ""
      )}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-black/50" />
        
        {/* Status indicator */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/5">
           <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isCameraOn ? "bg-red-500" : "bg-blue-500")} />
           <span className="text-[8px] font-bold tracking-widest text-white/60 uppercase">
             {isCameraOn ? "CAM" : "SCR"}
           </span>
        </div>
      </div>

      {/* Hidden Canvas for frame capture */}
      <canvas ref={canvasRef} width={320} height={240} className="hidden" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 sm:p-10 flex justify-between items-start z-30 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 sm:gap-6 pointer-events-auto"
        >
          <div className="relative group">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/[0.03] border border-white/15 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-serif italic text-xl sm:text-2xl shadow-2xl transition-all group-hover:scale-105 group-hover:bg-white/[0.08] group-hover:border-white/30">
              S
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-t-cyan-400/50 border-r-transparent border-b-transparent border-l-transparent rounded-xl sm:rounded-2xl"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-cyan-400 rounded-full blur-[8px] opacity-60 animate-pulse" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-3xl font-serif font-medium tracking-tight text-white/95 drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">Sowa AI</h1>
              <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-[8px] sm:text-[9px] font-black text-emerald-300 uppercase tracking-widest">Active</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 shadow-inner">
                <Brain className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-400" />
                <span className="text-[8px] sm:text-[10px] font-black text-cyan-300 uppercase tracking-widest">Neural v{evolution.level}</span>
              </div>

              {/* Instant Mood Selector Badge */}
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[8px] sm:text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm transition-all",
                mood === 'serious' ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" :
                mood === 'casual' ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" :
                mood === 'formal' ? "bg-amber-500/10 border-amber-500/30 text-amber-300" :
                "bg-rose-500/10 border-rose-500/30 text-rose-300"
              )}>
                <currentMoodObj.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>{currentMoodObj.label}</span>
              </div>
              
              <div className="relative w-16 sm:w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${evolution.exp}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-4 pointer-events-auto">
          {/* Quick Hub Access */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 glass-panel rounded-full"
          >
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsChatOpen(true)}
              className="p-2 sm:p-3.5 rounded-full sm:rounded-2xl transition-all text-white/60 hover:text-white"
              aria-label="Neural Link"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMemoryOpen(true)}
              className="p-2 sm:p-3.5 rounded-full sm:rounded-2xl transition-all text-white/60 hover:text-purple-400"
              aria-label="Memory Hub"
            >
              <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
            
            <div className="w-px h-5 sm:h-6 bg-white/10 mx-0.5 sm:mx-1" />

            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  "p-2 sm:p-3.5 rounded-full sm:rounded-2xl transition-all",
                  isMenuOpen ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                )}
                aria-expanded={isMenuOpen}
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(20px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(20px)' }}
                    className="absolute right-0 top-full mt-4 w-80 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden z-50 p-2"
                  >
                    {/* Sowa AI Core Status */}
                    <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-inner">
                          S
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white/95">Sowa AI</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full", (state === 'listening' || state === 'speaking') ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" : state === 'connecting' ? "bg-amber-400 animate-pulse" : "bg-white/30")} />
                            <span className="text-[9px] font-medium text-white/40 uppercase tracking-wider">
                              {state === 'speaking' ? 'Speaking' : state === 'listening' ? 'Listening' : state === 'connecting' ? 'Connecting' : 'Standby'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {[
                      { icon: Settings2, label: "System Settings", sub: "Core Configuration", onClick: () => { setIsSettingsOpen(true); setIsMenuOpen(false); }, color: "text-orange-400", bgColor: "bg-orange-500/10" },
                      { icon: Brain, label: "Memory Hub", sub: "Cognitive Insights", onClick: () => { setHubTab('insights'); setIsMemoryOpen(true); setIsMenuOpen(false); }, color: "text-purple-400", bgColor: "bg-purple-500/10" },
                      { icon: Search, label: "Web Recon", sub: "Digital Search & URL", onClick: () => { setHubTab('web'); setIsMemoryOpen(true); setIsMenuOpen(false); }, color: "text-blue-400", bgColor: "bg-blue-500/10" }
                    ].map((item, i) => (
                      <motion.button
                        key={`menu-item-${i}`}
                        custom={i}
                        variants={menuItemsVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={item.onClick}
                        className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-white/[0.06] transition-all group"
                      >
                        <div className={cn("p-2 rounded-xl group-hover:scale-110 transition-transform", item.bgColor, item.color)}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white/85">{item.label}</span>
                          <span className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">{item.sub}</span>
                        </div>
                      </motion.button>
                    ))}

                    {/* Quick Mood Grid */}
                    <div className="p-5 bg-white/[0.02] rounded-b-[40px] border-t border-white/5">
                      <div className="flex items-center justify-between mb-3 px-2">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Neural Mode</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                          <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider">{currentMoodObj.label}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {moods.filter(m => CORE_MOODS.includes(m.id)).map(m => (
                          <motion.button
                            key={`menu-mood-${m.id}`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setMood(m.id); setIsMenuOpen(false); }}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-2xl border transition-all text-left",
                              mood === m.id 
                                ? "bg-white/15 border-cyan-400/40 shadow-lg shadow-cyan-500/10 text-white" 
                                : "border-white/5 bg-white/[0.02] hover:bg-white/10 text-white/60"
                            )}
                          >
                            <m.icon className={cn("w-4 h-4 shrink-0", m.color)} />
                            <span className="text-xs font-semibold">{m.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="flex items-center gap-2.5 glass-panel rounded-full px-4 py-2 sm:px-5 sm:py-2.5 shadow-lg border border-white/10"
          >
            <div className="relative flex items-center justify-center shrink-0">
              <motion.div 
                animate={{
                  scale: isActive ? [1, 1.4, 1] : 1,
                  opacity: isActive ? [0.6, 1, 0.6] : 0.8
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  isActive 
                    ? (isPaused ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]") 
                    : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                )} 
              />
            </div>
            <AnimatePresence mode="wait">
              <motion.span 
                key={isPaused ? 'paused' : state}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2 }}
                className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-white/70 whitespace-nowrap"
              >
                {isPaused ? 'Paused' : state}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        {/* Interaction Info Floating Layer */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-12 pointer-events-none z-10 w-full">
          {/* Status Prompt v2.0 */}
          <AnimatePresence mode="wait">
            {lastAction && (
              <motion.div 
                key="last-action-prompter"
                initial={{ opacity: 0, scale: 0.8, y: -20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.1, y: 20, filter: 'blur(10px)' }}
                transition={{ type: 'spring', damping: 18, stiffness: 120 }}
                className="px-8 py-4 bg-black/40 border border-white/10 rounded-full text-[14px] text-white/90 font-serif italic backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-t-white/20 pointer-events-auto flex items-center gap-3"
              >
                <div className="relative flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-[#ff4e00] relative z-10 animate-pulse" />
                  <motion.div 
                    animate={{ scale: [1, 2, 1], opacity: [0, 0.4, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-[#ff4e00] rounded-full blur-md"
                  />
                </div>
                <span>
                  <span className="font-sans font-bold text-white/20 uppercase text-[9px] mr-2 tracking-[0.3em] not-italic">Neural Process:</span>
                  {(lastAction.startsWith("Sowa") || lastAction.startsWith("Maya")) ? lastAction.replace(/^(Sowa|Maya)(\s+is\s+|\s+:?\s*)/i, "") : lastAction}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Central Orb Container */}
          <motion.div 
            className="relative flex items-center justify-center pointer-events-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              y: isActive ? [-6, 6, -6] : [-2, 2, -2]
            }}
            transition={{ 
              scale: { type: "spring", damping: 20, stiffness: 100, delay: 0.2 },
              opacity: { duration: 0.4 },
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <motion.button
              onClick={(!isActive && wifiEnabled) ? handleConnectWithKeyCheck : undefined}
              whileHover={{ scale: 1.06, filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.94 }}
              aria-label={isActive ? "Sowa AI is listening" : "Tap to connect to Sowa AI"}
              className={cn(
                "relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 rounded-full transition-all duration-700 outline-none focus-visible:ring-4 focus-visible:ring-white/30",
                (!isActive && wifiEnabled) ? "cursor-pointer group" : (!wifiEnabled && !isActive ? "opacity-50 cursor-not-allowed" : "")
              )}
            >
              {/* Visualizer Orb */}
              <VoiceVisualizer 
                state={state} 
                volume={volume} 
                mood={mood}
                isPaused={isPaused} 
                isEvolutionLearning={evolution.isLearning}
                evolutionLevel={evolution.level}
                className="w-full h-full z-10" 
              />

              {/* Distinct Tool Execution Shimmer/Glow */}
              <AnimatePresence>
                {isToolExecuting && (
                  <>
                    <motion.div
                      key="shimmer-ring"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: [0, 0.9, 0], scale: [0.9, 1.15, 1.25] }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border-[3px] border-white/60 pointer-events-none z-20 shadow-[0_0_40px_rgba(255,255,255,0.8)]"
                    />
                    <motion.div
                      key="shimmer-fill"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: [0, 0.4, 0], scale: [0.95, 1.05, 1.1] }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                      className="absolute inset-0 rounded-full bg-white pointer-events-none z-20 mix-blend-overlay"
                    />
                  </>
                )}

            {isScanning && (
              <>
                <motion.div
                  key="scan-line"
                  initial={{ top: "-10%" }}
                  animate={{ top: "110%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-[-10%] right-[-10%] h-[2px] bg-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,1)] z-30 pointer-events-none"
                />
                <motion.div
                  key="scan-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-full z-20 pointer-events-none overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,rgba(34,211,238,0.1)_21%,transparent_22%)] bg-[length:20px_20px]" />
                </motion.div>
                <motion.div
                   key="scan-outer"
                   animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                   transition={{ duration: 1, repeat: Infinity }}
                   className="absolute inset-[-20px] rounded-full border border-cyan-400/30 blur-sm pointer-events-none z-20"
                />
              </>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Status Indicator inside orb context if needed, or right below */}
        <AnimatePresence>
          {!wifiEnabled && !isActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-32 whitespace-nowrap bg-red-500/20 text-red-500 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-red-500/30"
            >
              Offline (Wi-Fi Disabled)
            </motion.div>
          )}

          {wifiEnabled && !isActive && isListeningForWake && (
            <motion.div
              initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(5px)' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-36 whitespace-nowrap flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/60 border border-cyan-500/30 text-cyan-300 text-xs font-medium shadow-[0_0_25px_rgba(6,182,212,0.2)] backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>Say <strong className="text-white font-bold tracking-wide">"Hey Sowa"</strong> to wake up</span>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </div>
    </div>

      {/* Active Timers Floating Pop-up */}
      <div className="fixed top-24 right-6 z-50 flex flex-col items-end gap-3 pointer-events-auto">
        <AnimatePresence>
          {timers.map(timer => (
            <motion.div
              layout
              key={`active-timer-${timer.id}`}
              initial={{ opacity: 0, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 50 }}
              className={cn(
                "inline-flex items-center gap-4 px-3 py-3 glass-panel rounded-full text-white font-serif backdrop-blur-3xl relative group min-w-[240px] pr-5 shadow-2xl transition-colors duration-500 border",
                timer.isPaused ? "border-orange-500/30 bg-orange-500/10" : "border-[#ff4e00]/30 bg-[#ff4e00]/10"
              )}
            >
              {/* Circular Progress Element */}
              <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                 {/* Glowing backdrop pulse */}
                 {!timer.isPaused && (
                   <div className="absolute inset-0 rounded-full blur-md opacity-40 animate-pulse bg-[#ff4e00]" />
                 )}
                 <svg className="relative z-10 w-full h-full -rotate-90 transform" viewBox="0 0 40 40">
                   <circle cx="20" cy="20" r="16" fill="transparent" stroke="currentColor" className="text-white/10" strokeWidth="3" />
                   <circle 
                      cx="20" cy="20" r="16" fill="transparent" stroke="currentColor" 
                      className={cn("transition-all duration-1000 ease-linear", timer.isPaused ? "text-orange-400" : "text-[#ff4e00]")} 
                      strokeWidth="3" 
                      strokeDasharray="100.5" 
                      strokeDashoffset={100.5 - (timer.timeLeft / timer.duration) * 100.5}
                      strokeLinecap="round"
                   />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center z-10">
                    {timer.isPaused ? <Pause className="w-3.5 h-3.5 text-orange-400 ml-0.5" /> : <TimerIcon className="w-4 h-4 text-[#ff4e00]" />}
                 </div>
              </div>
              
              {/* Text Info */}
              <div className="flex flex-col items-start flex-1 min-w-0 pr-12">
                <div className="flex items-center gap-2 w-full">
                  {!timer.isPaused && <div className="w-1.5 h-1.5 bg-[#ff4e00] rounded-full animate-ping shrink-0" />}
                  <span className="text-[11px] font-sans font-medium text-white/60 truncate w-full uppercase tracking-wider">
                      {timer.label}
                  </span>
                </div>
                <motion.span 
                  animate={{ scale: !timer.isPaused && timer.timeLeft < 10 ? [1, 1.05, 1] : 1 }}
                  transition={{ repeat: !timer.isPaused && timer.timeLeft < 10 ? Infinity : 0, duration: 1 }}
                  className="font-sans font-bold text-xl leading-none mt-0.5" 
                  style={{ color: timer.isPaused ? '#fb923c' : '#ff4e00' }}
                >
                  {Math.floor(timer.timeLeft / 60)}:{(timer.timeLeft % 60).toString().padStart(2, '0')}
                </motion.span>
              </div>

              {/* Timer Controls (Always Visible) */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity duration-300 z-20 bg-black/40 p-1 rounded-full backdrop-blur-md">
                <button 
                  onClick={() => {
                    setTimers(prev => prev.map(t => t.id === timer.id ? { ...t, isPaused: !t.isPaused } : t));
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  aria-label={timer.isPaused ? `Resume timer ${timer.label}` : `Pause timer ${timer.label}`}
                >
                  {timer.isPaused ? <Play className="w-3.5 h-3.5 text-white fill-white" /> : <Pause className="w-3.5 h-3.5 text-white fill-white" />}
                </button>
                <button 
                  onClick={() => {
                    setTimers(prev => prev.filter(t => t.id !== timer.id));
                  }}
                  className="p-1.5 hover:bg-red-500/80 rounded-full transition-colors text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  aria-label={`Delete timer ${timer.label}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Interaction Info */}
      <div className="absolute bottom-32 text-center space-y-6 pointer-events-auto z-40 flex flex-col items-center">
        <AnimatePresence>
          {showVolume && (
            <motion.div
              key="volume-indicator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-6 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center gap-3 shadow-2xl mb-2"
            >
              <Volume2 className="w-4 h-4 text-blue-400" />
              <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${appVolume * 100}%` }}
                   className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </div>
              <span className="text-[10px] font-bold text-white/60 w-8">{Math.round(appVolume * 100)}%</span>
            </motion.div>
          )}

          {error && (
            <motion.div 
              key="error-message"
              initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              className="max-w-md w-full px-8 py-8 bg-black/60 border border-red-500/20 rounded-[32px] text-sm text-red-100 font-medium text-center shadow-2xl backdrop-blur-3xl z-50 overflow-hidden ring-1 ring-white/10"
            >
              <div className="flex flex-col items-center gap-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 animate-pulse rounded-full" />
                  <Info className="w-10 h-10 text-red-500 relative z-10" />
                </div>
                <div className="space-y-3">
                  <p className="text-white font-serif italic text-lg">"Something feels... misaligned."</p>
                  <p className="text-red-200/50 text-[11px] leading-relaxed uppercase tracking-wider font-bold">{error}</p>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => connect()}
                  className="w-full mt-4 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all text-xs font-black uppercase tracking-[0.2em] shadow-xl border border-white/10"
                >
                  Restore Link
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    {/* Bottom Controls */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center z-40 pointer-events-none">
        <AnimatePresence>
          {isActive && (
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex items-center gap-3 p-2.5 bg-black/60 backdrop-blur-3xl rounded-[36px] border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)] pointer-events-auto"
              role="toolbar" 
              aria-label="Media Controls"
            >
              <div className="flex items-center gap-2 px-2">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleCamera()}
                  className={cn(
                    "relative p-3.5 rounded-2xl transition-all duration-300 active:scale-95 border",
                    isCameraOn 
                      ? "text-rose-400 bg-rose-500/15 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.35)]" 
                      : "text-white/50 hover:text-white border-transparent hover:bg-white/[0.06]"
                  )}
                  title={isCameraOn ? "Turn off camera" : "Turn on camera"}
                >
                  {isCameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                  {isCameraOn && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] animate-pulse" />
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleScreen()}
                  className={cn(
                    "relative p-3.5 rounded-2xl transition-all duration-300 active:scale-95 border",
                    isScreenOn 
                      ? "text-cyan-400 bg-cyan-500/15 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.35)]" 
                      : "text-white/50 hover:text-white border-transparent hover:bg-white/[0.06]"
                  )}
                  title={isScreenOn ? "Stop sharing" : "Share screen"}
                >
                  {isScreenOn ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
                  {isScreenOn && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)] animate-pulse" />
                  )}
                </motion.button>
              </div>

              <div className="w-px h-8 bg-white/15" />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={togglePause}
                className={cn(
                  "flex items-center gap-3 px-8 py-3.5 rounded-2xl transition-all duration-300 shadow-xl text-xs font-black uppercase tracking-[0.2em] border",
                  isPaused 
                    ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black border-amber-300/50 shadow-amber-500/25" 
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-white border-white/15 shadow-black/50"
                )}
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                <span>{isPaused ? "Resume" : "Pause"}</span>
              </motion.button>

              <div className="w-px h-8 bg-white/15" />

              <div className="px-2">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={disconnect}
                  className="p-3.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 rounded-2xl transition-all text-rose-400 hover:text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                  aria-label="End Link"
                >
                  <MicOff className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Context Menu */}
      <AnimatePresence>
        {completedTimers.map((ct) => (
          <motion.div
            key={`completed-timer-alert-${ct.id}`}
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] glass-panel rounded-3xl p-8 flex flex-col items-center shadow-[0_0_50px_rgba(255,78,0,0.3)] border border-[#ff4e00]/20 backdrop-blur-3xl min-w-[300px]"
          >
             <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center mb-6 relative">
                 <div className="absolute inset-0 rounded-full blur-xl bg-[#ff4e00] animate-pulse opacity-50" />
                 <TimerIcon className="w-10 h-10 text-white relative z-10 animate-bounce" />
             </div>
             <h2 className="text-3xl font-serif font-bold text-white mb-2 tracking-tight">Timer Ended</h2>
             <p className="text-white/80 text-xl mb-6 font-medium">{ct.label}</p>
             
             {/* Alarm Settings UI */}
             <div className="w-full flex justify-between gap-4 mb-8 bg-black/20 rounded-xl p-4 border border-white/5">
                 <div className="flex-1 flex flex-col gap-1.5">
                   <label className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Alarm Sound</label>
                   <select 
                     value={alarmSound} 
                     onChange={(e) => setAlarmSound(e.target.value)}
                     className="bg-white/10 text-white text-sm outline-none border border-white/10 rounded-lg px-2 py-1.5 hover:bg-white/20 transition-colors cursor-pointer"
                   >
                     {Object.entries(ALARM_SOUNDS).map(([key, sound]) => (
                       <option key={`timer-alert-${ct.id}-opt-${key}`} value={key} className="bg-black">{sound.label}</option>
                     ))}
                   </select>
                 </div>
                 <div className="flex-1 flex flex-col gap-1.5">
                   <label className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Volume</label>
                   <div className="flex items-center gap-2 h-full"> 
                     <Volume2 className="w-4 h-4 text-white/40" />
                     <input 
                       type="range" 
                       min="0" max="1" step="0.1" 
                       value={alarmVolume} 
                       onChange={(e) => setAlarmVolume(parseFloat(e.target.value))}
                       className="w-full accent-[#ff4e00]"
                     />
                   </div>
                 </div>
             </div>

             <button
                 onClick={() => {
                   setCompletedTimers(prev => {
                     const next = prev.filter(t => t.id !== ct.id);
                     if (next.length === 0 && alarmAudioRef.current) {
                        alarmAudioRef.current.pause();
                        alarmAudioRef.current.currentTime = 0;
                     }
                     return next;
                   });
                 }}
                 className="px-10 py-3.5 bg-gradient-to-r from-[#ff4e00] to-orange-500 hover:from-orange-500 hover:to-[#ff4e00] transition-all rounded-full font-bold text-white shadow-lg active:scale-95 uppercase tracking-widest text-sm pointer-events-auto focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500"
                 aria-label={`Dismiss timer: ${ct.label}`}
             >
                 Dismiss
             </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            variants={contextMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-[100] w-64 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[40px] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Actions */}
            <div className="py-2">
              {/* Mood (Hover to expand or click to cycle next, let's just show a sub-title) */}
              <div className="px-4 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest border-b border-white/5 mb-1">
                Quick Actions
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setIsContextMenuMoodOpen(!isContextMenuMoodOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:bg-white/10 rounded-xl"
                  role="menuitem"
                  aria-haspopup="true"
                  aria-expanded={isContextMenuMoodOpen}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-pink-400" aria-hidden="true" />
                    <span className="text-sm font-medium text-white/90">Change Mood</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{currentMoodObj.label}</span>
                    <ChevronDown className={cn("w-4 h-4 text-white/40 transition-transform duration-200", isContextMenuMoodOpen && "rotate-180")} aria-hidden="true" />
                  </div>
                </button>
                
                {/* Inline Expandable Mood Selector */}
                <AnimatePresence>
                  {isContextMenuMoodOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-white/[0.03] rounded-2xl border border-white/5 my-1.5 p-1.5 flex flex-col gap-1"
                      role="menu"
                      aria-label="Mood options"
                    >
                      {moods.filter(m => CORE_MOODS.includes(m.id)).map((m) => (
                        <button
                          key={`context-menu-mood-${m.id}`}
                          role="menuitem"
                          onClick={() => {
                            setMood(m.id);
                            setContextMenu(null);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all",
                            mood === m.id 
                              ? "bg-white/15 text-white font-bold shadow-sm" 
                              : "text-white/60 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <m.icon className={cn("w-4 h-4", m.color)} aria-hidden="true" />
                            <span className="text-xs font-medium">{m.label}</span>
                          </div>
                          {mood === m.id && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/30">
                              Active
                            </span>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => { setIsSettingsOpen(true); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:bg-white/10"
                role="menuitem"
              >
                <Settings2 className="w-4 h-4 text-orange-400" aria-hidden="true" />
                <span className="text-sm font-medium text-white/80">Access Settings</span>
              </button>

              <button 
                onClick={() => { setIsMemoryOpen(true); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:bg-white/10"
                role="menuitem"
              >
                <Brain className="w-4 h-4 text-purple-400" aria-hidden="true" />
                <span className="text-sm font-medium text-white/80">Show Memory</span>
              </button>

              <div className="mx-4 my-1 h-px bg-white/10" role="separator" />
              
              <button 
                onClick={() => { 
                  setIsChatOpen(true); 
                  setContextMenu(null);
                  // Give a small delay to allow modal to mount then trigger event
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('sowa-trigger-image-upload'));
                    window.dispatchEvent(new CustomEvent('maya-trigger-image-upload'));
                  }, 100);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:bg-white/10"
                role="menuitem"
              >
                <Camera className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                <span className="text-sm font-medium text-white/80">Analyze Image</span>
              </button>

              <button 
                onClick={() => { setSettingsTab('pc'); setIsSettingsOpen(true); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:bg-white/10"
                role="menuitem"
              >
                <ImageIcon className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span className="text-sm font-medium text-white/80">Change Wallpaper</span>
              </button>

              {isActive && (
                <>
                  <div className="mx-4 my-1 h-px bg-white/10" role="separator" />
                  <button 
                    onClick={() => { disconnect(); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-red-500/20 group focus-visible:outline-none focus-visible:bg-red-500/20"
                    role="menuitem"
                  >
                    <MicOff className="w-4 h-4 text-red-500/70 group-hover:text-red-400" aria-hidden="true" />
                    <span className="text-sm font-medium text-red-500/70 group-hover:text-red-400">End Session</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        initialTab={settingsTab}
        currentMood={mood}
        onMoodChange={setMood}
      />

      <MemoryHub 
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memory={memory}
        history={history}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSwitchSession={(id) => {
          switchSession(id);
          setIsMemoryOpen(false);
          disconnect(); // Ensure session is clean for reconnect
          setTimeout(connect, 500);
        }}
        snapshots={snapshots}
        evolution={evolution}
        activeTab={hubTab}
        onTabChange={setHubTab}
        hubUrl={hubUrl}
        onHubUrlChange={setHubUrl}
        onClearMemory={() => {
          setMemory([]);
          safeSaveToLocalStorage('sowa_memory', JSON.stringify([]));
          safeSaveToLocalStorage('maya_memory', JSON.stringify([]));
        }}
        onClearHistory={() => {
          setHistory([]);
          safeSaveToLocalStorage('sowa_history', JSON.stringify([]));
          safeSaveToLocalStorage('maya_history', JSON.stringify([]));
        }}
        onClearSessions={clearSessions}
        onDeleteSnapshot={(id) => {
          setSnapshots(prev => {
            const updated = prev.filter(s => s.id !== id);
            safeSaveToLocalStorage('sowa_snapshots', JSON.stringify(updated));
            safeSaveToLocalStorage('maya_snapshots', JSON.stringify(updated));
            return updated;
          });
        }}
        onDeleteSession={deleteSession}
        onDeleteHistoryItem={deleteHistoryItem}
      />

      {/* Bio-Sense Vision Overlay */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 pointer-events-none overflow-hidden"
          >
            {/* Corner Bracket Graphics */}
            <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-cyan-400/40" />
            <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-cyan-400/40" />
            <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-cyan-400/40" />
            <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-cyan-400/40" />
            
            {/* Scan Line */}
            <motion.div 
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-[2px] bg-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,1)] z-20"
            />

            {/* Neural Data Stream Animation */}
            <div className="absolute top-1/2 left-6 -translate-y-1/2 flex flex-col gap-2">
              {[...Array(8)].map((_, i) => (
                <motion.div 
                  key={`data-node-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: [0, 0.6, 0], x: [0, 10, 0] }}
                  transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                  className="w-16 h-[1px] bg-cyan-400/30"
                />
              ))}
            </div>

            <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-2 bg-black/40 backdrop-blur-md rounded-full border border-cyan-500/30">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">BIO-SENSE SCANNING</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Initial Setup & Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={() => {
          setIsOnboardingOpen(false);
          setTimeout(() => {
            connect();
          }, 300);
        }}
      />

      {/* Dynamic Brightness Filter Overlay - Covers everything but pointer-events-none */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-[100] bg-black" 
        style={{ opacity: 1 - (pcBrightness / 100) }} 
      />
    </main>
  );
}
