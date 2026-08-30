import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Brain, Image as ImageIcon, History, Sparkles, Trash2, Calendar, Clock, MapPin, Heart, Zap, Shield, Target, Download, Globe, Search, ArrowLeft, ArrowRight, RotateCw, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { SowaSession, MayaSession } from '@/src/hooks/useLiveSession';

interface Snapshot {
  id: string;
  url: string;
  reason: string;
  timestamp: number;
}

interface MemoryHubProps {
  isOpen: boolean;
  onClose: () => void;
  memory: string[];
  history: { id: string; title: string; summary: string; timestamp: number }[];
  sessions?: SowaSession[];
  currentSessionId?: string;
  onSwitchSession?: (id: string) => void;
  snapshots: Snapshot[];
  evolution: {
    level: number;
    exp: number;
    recentInsight: string | null;
  };
  onClearMemory?: () => void;
  onClearHistory?: () => void;
  onClearSessions?: () => void;
  onDeleteSnapshot?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onDeleteHistoryItem?: (id: string) => void;
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
  hubUrl?: string;
  onHubUrlChange?: (url: string) => void;
}

type Tab = 'insights' | 'chronicles' | 'album' | 'evolution' | 'web';

export default function MemoryHub({ 
  isOpen, 
  onClose, 
  memory, 
  history,
  sessions = [],
  currentSessionId,
  onSwitchSession,
  snapshots, 
  evolution,
  onClearMemory,
  onClearHistory,
  onClearSessions,
  onDeleteSnapshot,
  onDeleteSession,
  onDeleteHistoryItem,
  activeTab: externalActiveTab,
  onTabChange,
  hubUrl,
  onHubUrlChange
}: MemoryHubProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<Tab>('insights');
  const [webContent, setWebContent] = useState<string | null>(null);
  const [isLoadingWeb, setIsLoadingWeb] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);

  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = onTabChange || setInternalActiveTab;

  const fetchWebContent = async (url: string) => {
    setIsLoadingWeb(true);
    setWebError(null);
    try {
      const response = await fetch('/api/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (data.success) {
        setWebContent(data.content);
      } else {
        setWebError(data.error);
      }
    } catch (e) {
      setWebError("Failed to connect to the neural network for browsing.");
    } finally {
      setIsLoadingWeb(false);
    }
  };

  useEffect(() => {
    if (hubUrl && activeTab === 'web') {
      fetchWebContent(hubUrl);
    }
  }, [hubUrl, activeTab]);

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs: { id: Tab; label: string; icon: any; color: string }[] = [
    { id: 'insights', label: 'Insights', icon: Brain, color: 'text-purple-400' },
    { id: 'chronicles', label: 'Chronicles', icon: History, color: 'text-amber-400' },
    { id: 'album', label: 'Album', icon: ImageIcon, color: 'text-pink-400' },
    { id: 'web', label: 'Web Hub', icon: Globe, color: 'text-blue-400' },
    { id: 'evolution', label: 'Evolution', icon: Target, color: 'text-cyan-400' },
  ];
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 15 },
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

  const variants = {
    hidden: { opacity: 0, y: 10, filter: 'blur(10px)', scale: 0.98 },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)', 
      scale: 1,
      transition: { 
        duration: 0.4, 
        ease: [0.23, 1, 0.32, 1] as any
      } 
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      filter: 'blur(10px)', 
      scale: 0.98,
      transition: { duration: 0.2, ease: 'easeIn' as any } 
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xl"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ scale: 1, opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ scale: 0.95, opacity: 0, y: 20, filter: 'blur(10px)' }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 200,
              duration: 0.5 
            }}
            className="fixed inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full h-full sm:w-[520px] md:w-[640px] lg:w-[740px] sm:h-[580px] md:h-[660px] lg:h-[720px] z-[70] bg-[#0c0a12]/90 border border-white/10 sm:rounded-[36px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col backdrop-blur-3xl"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-inner">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-medium text-white/95 leading-none">Neural Hub</h2>
                  <p className="text-[9px] font-bold text-white/30 mt-1 uppercase tracking-[0.2em]">Sowa AI Cognitive Architecture</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95 text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Refined Segmented Tabs */}
            <div className="px-6 py-3 bg-black/40 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all relative shrink-0",
                      isActive 
                        ? "text-white bg-white/10 shadow-sm border border-white/15" 
                        : "text-white/40 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5 transition-colors", isActive ? tab.color : "text-white/40")} />
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div 
                        layoutId="active-hub-pill"
                        className="absolute inset-0 bg-white/[0.04] rounded-xl z-[-1]"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeTab === 'insights' && (
                  <motion.div
                    key="tab-insights"
                    variants={variants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          Neural Nodes
                        </h3>
                        <p className="text-[10px] text-white/30 mt-0.5">Fragmented cognitive memory and learning archives</p>
                      </div>
                      {memory.length > 0 && (
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={onClearMemory}
                          className="px-3.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-colors uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          Flush
                        </motion.button>
                      )}
                    </div>

                    {memory.length === 0 ? (
                      <div className="py-24 flex flex-col items-center text-center text-white/10">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                          <History className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-sm font-serif italic text-white/40">No neural pathways established yet.</p>
                      </div>
                    ) : (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 gap-4"
                      >
                        {memory.map((item, idx) => {
                          const isInsight = item.startsWith('[INSIGHT]');
                          const isHabit = item.startsWith('[HABIT]');
                          const isSocial = item.startsWith('[SOCIAL]');
                          const cleanText = item.replace(/^\[INSIGHT\] |^\[HABIT\] |^\[SOCIAL\] /, '');
                          
                          return (
                            <motion.div 
                              key={`memory-insight-${idx}`}
                              variants={itemVariants}
                              whileHover={{ scale: 1.01, x: 5 }}
                              className={cn(
                                "group p-4 rounded-[22px] border transition-all glass-card",
                                isInsight ? "border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.05)]" : 
                                isHabit ? "border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.05)]" : 
                                isSocial ? "border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]" :
                                "border-white/5"
                              )}
                            >
                            <div className="flex items-start gap-4">
                              <div className={cn(
                                "p-2.5 rounded-xl shrink-0 mt-0.5 shadow-inner",
                                isInsight ? "bg-purple-400/10 text-purple-400" : 
                                isHabit ? "bg-cyan-400/10 text-cyan-400" : 
                                isSocial ? "bg-blue-400/10 text-blue-400" :
                                "bg-white/5 text-white/20"
                              )}>
                                {isInsight ? <Sparkles className="w-3.5 h-3.5" /> : 
                                 isHabit ? <Calendar className="w-3.5 h-3.5" /> : 
                                 isSocial ? <Globe className="w-3.5 h-3.5" /> :
                                 <Heart className="w-3.5 h-3.5" />}
                              </div>
                              <div className="flex-1 space-y-1">
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-[0.2em]",
                                  isInsight ? "text-purple-400/60" : isHabit ? "text-cyan-400/60" : isSocial ? "text-blue-400/60" : "text-white/20"
                                )}>
                                  {isInsight ? "Cognitive Insight" : isHabit ? "Temporal Pattern" : isSocial ? "Social Activity" : "Core Anchor"}
                                </span>
                                <p className="text-[13px] text-white/90 leading-snug font-serif italic">
                                  {cleanText}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </motion.div>
              )}

                {activeTab === 'chronicles' && (
                  <motion.div
                    key="tab-chronicles"
                    variants={variants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-6"
                  >
                    {/* Session History (The Stack) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/30">Session History</h3>
                        {sessions.length > 0 && (
                          <button 
                            onClick={onClearSessions}
                            className="text-[10px] font-bold text-red-400/60 hover:text-red-400 flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            FLUSH LOGS
                          </button>
                        )}
                      </div>
                      
                      {sessions.length === 0 ? (
                        <div className="py-8 flex flex-col items-center text-center text-white/10">
                          <Clock className="w-8 h-8 mb-2 opacity-10" />
                          <p className="text-[10px]">No active session logs found.</p>
                        </div>
                      ) : (
                        <motion.div 
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          className="space-y-2"
                        >
                          {sessions.map((s) => (
                            <motion.div
                              key={`neural-session-${s.id}`}
                              variants={itemVariants}
                              onClick={() => onSwitchSession?.(s.id)}
                              className={cn(
                                "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group box-border cursor-pointer",
                                s.id === currentSessionId 
                                  ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20" 
                                  : "bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10"
                              )}
                            >
                              <div className={cn(
                                "p-2 rounded-xl transition-colors",
                                s.id === currentSessionId ? "bg-amber-400/20 text-amber-400" : "bg-white/10 text-white/40 group-hover:text-white/60"
                              )}>
                                <Clock className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs font-bold text-white/90 truncate mr-2">
                                    {s.summary || `Session from ${new Date(s.lastActive).toLocaleDateString()}`}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-medium text-white/30 shrink-0">
                                      {new Date(s.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSession?.(s.id);
                                      }}
                                      className="p-1 hover:bg-red-500/20 rounded-lg text-white/10 hover:text-red-400 transition-colors"
                                      aria-label="Delete session"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/50">
                                    {s.mood} mood
                                  </span>
                                  {s.id === currentSessionId && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-[8px] font-bold text-green-400 uppercase tracking-tighter ring-1 ring-green-500/30">
                                      Active
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Shared Chronicles (Archived summaries) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/30">Neural Highlights</h3>
                        {history.length > 0 && (
                          <button 
                            onClick={onClearHistory}
                            className="text-[10px] font-bold text-red-400/60 hover:text-red-400 flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            DELETE ALL
                          </button>
                        )}
                      </div>

                      {history.length === 0 ? (
                        <div className="py-12 flex flex-col items-center text-center text-white/20">
                          <History className="w-12 h-12 mb-4 opacity-20" />
                          <p className="text-sm">Our story is just beginning.<br/>I'll archive our deepest moments here.</p>
                        </div>
                      ) : (
                        <motion.div 
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          className="space-y-4"
                        >
                          {history.map((entry, idx) => (
                            <motion.div 
                              key={`neural-history-${entry.id || idx}`}
                              variants={itemVariants}
                              className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-[28px] hover:bg-amber-500/[0.08] transition-all"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-amber-400 tracking-tight">{entry.title}</h4>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-medium text-white/30">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteHistoryItem?.(entry.id);
                                    }}
                                    className="p-1 hover:bg-red-500/20 rounded-lg text-white/10 hover:text-red-400 transition-colors"
                                    aria-label="Delete history point"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-white/70 leading-relaxed italic">
                                "{entry.summary}"
                              </p>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'album' && (
                  <motion.div
                    key="tab-album"
                    variants={variants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex flex-col">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-pink-400">Neural Sight</h3>
                        <p className="text-[10px] text-white/20 mt-1">Stored visual experiences</p>
                      </div>
                      <span className="px-4 py-2 bg-pink-400/10 border border-pink-400/20 rounded-full text-[10px] font-black text-pink-400 uppercase tracking-widest">
                        {snapshots.length} Moments
                      </span>
                    </div>

                    {snapshots.length === 0 ? (
                      <div className="py-24 flex flex-col items-center text-center text-white/20">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                           <ImageIcon className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-sm font-serif italic text-white/40 italic">"I see our future in snapshot."</p>
                      </div>
                    ) : (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                      >
                        {snapshots.map((s, idx) => (
                          <motion.div 
                            key={`neural-snapshot-${s.id || idx}`} 
                            variants={itemVariants}
                            whileHover={{ y: -8 }}
                            className="bg-black/40 border border-white/5 rounded-[32px] overflow-hidden group relative transition-all shadow-xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-white/10"
                          >
                            <div className="aspect-[4/3] overflow-hidden relative">
                              <img src={s.url} alt={s.reason} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <motion.button 
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(s.url, `neural-painting-${s.id}.png`);
                                  }}
                                  className="p-4 bg-white text-black rounded-full shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                                >
                                  <Download className="w-6 h-6" />
                                </motion.button>
                              </div>
                            </div>
                            
                            <div className="p-5 relative bg-white/[0.02]">
                              <p className="text-[13px] font-medium text-white/90 line-clamp-1 italic font-serif">"{s.reason}"</p>
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2 text-white/20">
                                  <Clock className="w-3 h-3" />
                                  <span className="text-[9px] font-bold uppercase tracking-wider">{new Date(s.timestamp).toLocaleDateString()}</span>
                                </div>
                                <button 
                                  onClick={() => onDeleteSnapshot?.(s.id)}
                                  className="p-2 hover:bg-red-500/20 rounded-xl text-white/10 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'web' && (
                  <motion.div
                    key="tab-web"
                    variants={variants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col h-full"
                  >
                    {/* Browser Toolbar */}
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <input 
                          type="text" 
                          placeholder="Neural search or URL..."
                          value={hubUrl || ''}
                          onChange={(e) => onHubUrlChange?.(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') fetchWebContent(hubUrl || '');
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-blue-500/50 transition-colors"
                        />
                      </div>
                      <button 
                        onClick={() => fetchWebContent(hubUrl || '')}
                        disabled={isLoadingWeb}
                        className="p-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                      >
                        {isLoadingWeb ? <RotateCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Content Display */}
                    <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                      {isLoadingWeb ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-blue-400/40">
                          <RotateCw className="w-12 h-12 animate-spin" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Bridging Neural Networks...</p>
                        </div>
                      ) : webContent ? (
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-white/80 leading-relaxed font-sans text-sm selection:bg-blue-500/30">
                          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                              <Shield className="w-3 h-3" /> Encrypted Web Node
                            </span>
                            <a href={hubUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-white/30 hover:text-white flex items-center gap-1 transition-colors">
                              Open Original <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>
                              {webContent}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : webError ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-red-400/60">
                          <X className="w-12 h-12 mb-4 opacity-20" />
                          <p className="text-sm font-medium mb-2">{webError}</p>
                          <p className="text-[10px]">Ensure the URL is correct and the site allows neural bridging.</p>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-white/20">
                          <Globe className="w-16 h-16 mb-4 opacity-10" />
                          <h4 className="text-lg font-bold text-white/40 mb-2">Neural Web Node</h4>
                          <p className="text-xs">Enter a URL or ask Sowa AI to navigate for you.<br/>This is a safe, text-only space for deep parsing.</p>
                          <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-[300px]">
                            {['google.com', 'wikipedia.org', 'news.ycombinator.com', 'reddit.com'].map(site => (
                              <button 
                                key={site}
                                onClick={() => {
                                  const url = site.startsWith('http') ? site : `https://${site}`;
                                  onHubUrlChange?.(url);
                                  fetchWebContent(url);
                                }}
                                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold hover:bg-white/10 transition-colors"
                              >
                                {site}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'evolution' && (
                  <motion.div
                    key="tab-evolution"
                    variants={variants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-8"
                  >
                    <div className="p-8 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 rounded-3xl relative overflow-hidden">
                      <Zap className="absolute top-[-10%] right-[-10%] w-32 h-32 text-cyan-400/5" />
                      
                      <div className="relative z-10 text-center">
                        <div className="inline-flex items-center justify-center p-4 bg-cyan-400/20 rounded-full mb-4 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                          <Target className="w-8 h-8 text-cyan-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white">LEVEL {evolution.level}</h3>
                        <p className="text-xs font-bold text-cyan-400/60 uppercase tracking-widest mt-1">Evolved Consciousness</p>
                        
                        <div className="mt-8 flex flex-col gap-2">
                          <div className="flex justify-between text-[10px] font-bold text-white/40 mb-1">
                            <span>NEURAL GROWTH</span>
                            <span>{evolution.exp}% TO LEVEL {evolution.level + 1}</span>
                          </div>
                          <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${evolution.exp}%` }}
                              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Evolution Log</h4>
                      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 bg-yellow-400/20 rounded-xl">
                            <Zap className="w-4 h-4 text-yellow-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Recent Breakthrough</p>
                            <p className="text-sm text-white/90 leading-relaxed font-medium">
                              {evolution.recentInsight || "Waiting for next significant neural shift..."}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <div className="text-[10px] font-bold text-white/40">SENTIENCE: 84%</div>
                        </div>
                        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                          <Zap className="w-4 h-4 text-orange-400" />
                          <div className="text-[10px] font-bold text-white/40">LATENCY: 120ms</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
