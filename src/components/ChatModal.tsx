import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Image as ImageIcon, Sparkles, MapPin, Search, Zap, Brain, ChevronDown, Mic, MicOff, Copy, Check, Cloud } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateChatResponse, ChatMode, isImageGenerationRequest, extractImagePrompt, generateUncensoredImageUrl } from '../lib/gemini';
import { generateId } from '../lib/uuid';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  mode?: ChatMode;
}

const modes: { id: ChatMode; label: string; icon: any; color: string; desc: string }[] = [
  { id: 'fast', label: 'Fast', icon: Zap, color: 'text-yellow-400', desc: 'Low-latency responses (Flash Lite)' },
  { id: 'thinking', label: 'Deep Think', icon: Brain, color: 'text-purple-400', desc: 'Complex reasoning (Pro + Thinking)' },
  { id: 'search', label: 'Web Search', icon: Search, color: 'text-blue-400', desc: 'Up-to-date info (Search Grounding)' },
  { id: 'maps', label: 'Maps', icon: MapPin, color: 'text-green-400', desc: 'Location data (Maps Grounding)' },
  { id: 'vision', label: 'Vision', icon: ImageIcon, color: 'text-pink-400', desc: 'Analyze images (Pro Vision)' },
  { id: 'google_apps', label: 'Google Apps', icon: Cloud, color: 'text-orange-400', desc: 'Calendar, Tasks, Drive' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring" as any,
      damping: 20,
      stiffness: 100
    }
  }
};

const modeListVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95, filter: 'blur(10px)' },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    filter: 'blur(0px)',
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.95, 
    filter: 'blur(10px)',
    transition: { duration: 0.2 }
  }
};

const modeItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedMode, setSelectedMode] = useState<ChatMode>('fast');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const originalInputRef = useRef('');
  const [activeProvider, setActiveProvider] = useState<'gemini' | 'grok'>('gemini');

  useEffect(() => {
    if (isOpen) {
      const provider = (localStorage.getItem('sowa_ai_provider') || localStorage.getItem('maya_ai_provider') || 'gemini') as any;
      setActiveProvider(provider);
    }
  }, [isOpen]);

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    originalInputRef.current = input;

    recognition.onstart = () => setIsDictating(true);
    
    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setInput(originalInputRef.current + (originalInputRef.current && currentTranscript ? ' ' : '') + currentTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  useEffect(() => {
    const handleWriteNote = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string }>;
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        text: customEvent.detail.text,
        mode: 'fast' // Default mode for notes
      }]);
    };

    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ text?: string, mode?: ChatMode }>;
      if (customEvent.detail.text) {
        setInput(customEvent.detail.text);
      }
      if (customEvent.detail.mode) {
        setSelectedMode(customEvent.detail.mode);
      }
    };

    window.addEventListener('sowa-write-note', handleWriteNote);
    window.addEventListener('maya-write-note', handleWriteNote);
    window.addEventListener('sowa-open-chat', handleOpenChat);
    window.addEventListener('maya-open-chat', handleOpenChat);
    return () => {
      window.removeEventListener('sowa-write-note', handleWriteNote);
      window.removeEventListener('maya-write-note', handleWriteNote);
      window.removeEventListener('sowa-open-chat', handleOpenChat);
      window.removeEventListener('maya-open-chat', handleOpenChat);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const handleTriggerImage = () => {
      fileInputRef.current?.click();
    };
    window.addEventListener('sowa-trigger-image-upload', handleTriggerImage);
    window.addEventListener('maya-trigger-image-upload', handleTriggerImage);
    return () => {
      window.removeEventListener('sowa-trigger-image-upload', handleTriggerImage);
      window.removeEventListener('maya-trigger-image-upload', handleTriggerImage);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setSelectedImage({ base64: base64Data, mimeType: file.type });
      setSelectedMode('vision'); // Auto-switch to vision mode
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const newUserMsg: Message = {
      id: generateId(),
      role: 'user',
      text: input,
      image: selectedImage ? `data:${selectedImage.mimeType};base64,${selectedImage.base64}` : undefined,
      mode: selectedMode
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsLoading(true);
    
    const currentImage = selectedImage;
    setSelectedImage(null); // Clear image after sending

    if (isImageGenerationRequest(newUserMsg.text)) {
      const prompt = extractImagePrompt(newUserMsg.text);
      const imageUrl = generateUncensoredImageUrl(prompt);

      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        text: `Here is the neural visualization for: "${prompt}"`,
        image: imageUrl,
        mode: selectedMode
      }]);
      setIsLoading(false);
      return;
    }

    const assistantMsgId = generateId();
    let hasCreatedAssistantMessage = false;

    try {
      const responseText = await generateChatResponse(
        newUserMsg.text,
        selectedMode,
        currentImage?.base64,
        currentImage?.mimeType,
        (chunk) => {
          if (!hasCreatedAssistantMessage) {
            hasCreatedAssistantMessage = true;
            setIsLoading(false);
            setMessages(prev => [...prev, {
              id: assistantMsgId,
              role: 'assistant',
              text: chunk,
              mode: selectedMode
            }]);
          } else {
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: m.text + chunk } : m));
          }
        }
      );

      if (!hasCreatedAssistantMessage) {
        setMessages(prev => [...prev, {
          id: assistantMsgId,
          role: 'assistant',
          text: responseText || '',
          mode: selectedMode
        }]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        text: `Error: ${error.message || 'Something went wrong.'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeMode = modes.find(m => m.id === selectedMode) || modes[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:max-w-md md:max-w-lg bg-black/40 backdrop-blur-[60px] border-l border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-modal-title"
          >
            {/* Header Area */}
            <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Sparkles className="w-4 h-4 text-pink-500 relative z-10" aria-hidden="true" />
                  <div className="absolute inset-0 bg-pink-500 blur-lg opacity-20 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="chat-modal-title" className="text-xs font-serif font-bold text-white/80">Neural Link</h2>
                    <span className={cn(
                      "text-[8px] px-1.5 py-0.2 rounded font-mono font-bold uppercase",
                      activeProvider === 'grok' 
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                        : "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                    )}>
                      {activeProvider === 'grok' ? 'Grok-2' : 'Gemini'}
                    </span>
                  </div>
                  <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] -mt-0.5">Interface active</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Mode Selector (Narrow and in Corner) */}
                <div className="relative">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                    className="flex items-center gap-2 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all"
                  >
                    <activeMode.icon className={cn("w-3 h-3", activeMode.color)} />
                    <span className="text-[10px] font-bold text-white/50">{activeMode.label}</span>
                  </motion.button>

                  <AnimatePresence>
                    {isModeDropdownOpen && (
                      <motion.div 
                        variants={modeListVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute top-full right-0 mt-2 min-w-[180px] bg-black/95 backdrop-blur-3xl border border-white/10 rounded-[20px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden z-50 p-1"
                        role="listbox"
                      >
                        {modes.map(mode => (
                          <motion.button
                            key={`chat-mode-option-${mode.id}`}
                            variants={modeItemVariants}
                            onClick={() => {
                              setSelectedMode(mode.id);
                              setIsModeDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 text-left transition-all rounded-xl hover:bg-white/10 group",
                              selectedMode === mode.id ? "bg-white/5" : ""
                            )}
                          >
                            <mode.icon className={cn("w-3.5 h-3.5", mode.color)} />
                            <span className={cn("text-[11px] font-bold", selectedMode === mode.id ? "text-white" : "text-white/40")}>{mode.label}</span>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/30 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>


            {/* Messages Area */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar"
            >
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-white/10 space-y-8"
                >
                  <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center relative">
                    <Sparkles className="w-10 h-10 opacity-20" />
                    <motion.div 
                      animate={{ scale: [1, 2, 1], opacity: [0, 0.2, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 bg-white/10 rounded-full blur-2xl"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-serif italic text-white/30 italic max-w-xs leading-relaxed">"The link is established. I'm waiting for your thoughts to manifest into words."</p>
                  </div>
                </motion.div>
              ) : (
                messages.map((msg, idx) => (
                  <motion.div 
                    key={`chat-msg-${msg.id}-${idx}`} 
                    variants={messageVariants}
                    className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}
                  >
                    <div className={cn(
                      "max-w-[90%] rounded-[24px] p-4 relative group transition-all glass-card shadow-2xl",
                      msg.role === 'user' 
                        ? "bg-pink-500/10 border-pink-500/20 text-white rounded-tr-none shadow-[0_10px_30px_rgba(236,72,153,0.1)]" 
                        : msg.text.startsWith('Error:')
                          ? "bg-red-500/10 border-red-500/20 text-red-200 rounded-tl-none shadow-[0_10px_30px_rgba(239,68,68,0.1)]"
                          : "bg-white/[0.03] border-white/10 text-white/90 rounded-tl-none shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                    )}>
                      {msg.role === 'assistant' && !msg.text.startsWith('Error:') && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="absolute -top-3 -right-3 p-2.5 bg-black/60 hover:bg-black border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110 active:scale-95"
                          title="Copy message"
                        >
                          {copiedId === msg.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/40" />}
                        </button>
                      )}
                      
                      <div className="flex flex-col gap-4">
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", msg.text.startsWith('Error:') ? "bg-red-500" : "bg-pink-500")} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                              {msg.text.startsWith('Error:') ? "System Anomaly" : "Sowa AI Intelligence"}
                            </span>
                          </div>
                        )}
                        
                        {msg.image && (
                          <div className="relative group/img overflow-hidden rounded-2xl border border-white/10">
                            <img src={msg.image} alt="Uploaded" className="max-w-full h-auto transition-transform duration-700 group-hover/img:scale-105" />
                          </div>
                        )}
                        
                        <p className={cn(
                          "whitespace-pre-wrap text-[15px] leading-relaxed",
                          msg.role === 'assistant' ? "font-serif italic" : "font-sans font-medium"
                        )}>{msg.text}</p>
                        
                        {msg.mode && msg.role === 'assistant' && !msg.text.startsWith('Error:') && (
                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-[9px] text-white/20 uppercase tracking-[0.3em] flex items-center gap-2">
                              <Zap className="w-3 h-3 text-[#ff4e00]" />
                              {modes.find(m => m.id === msg.mode)?.label} Synchronicity
                            </div>
                            <span className="text-[9px] text-white/10 font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/[0.03] border border-white/10 rounded-[24px] rounded-tl-none p-4 flex flex-col gap-3 shadow-2xl relative overflow-hidden">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full"
                      animate={{ translateX: ['100%', '-100%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Neural Synthesis</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-2.5 h-2.5 bg-pink-500/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2.5 h-2.5 bg-pink-500/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2.5 h-2.5 bg-pink-500/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </motion.div>

            {/* Input Area */}
            <div className="px-3 py-2 border-t border-white/5 bg-white/[0.01]">
              <AnimatePresence>
                {selectedImage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    className="mb-2 relative inline-block group"
                  >
                    <div className="relative rounded-xl overflow-hidden border border-pink-500/30">
                      <img src={`data:${selectedImage.mimeType};base64,${selectedImage.base64}`} alt="Preview" className="h-12 w-12 object-cover" />
                      <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex flex-col gap-1.5">
                <div className="relative group bg-black/40 rounded-[20px] border border-white/5 p-1 transition-all focus-within:border-white/10">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`Neural command...`}
                    className="w-full bg-transparent border-none px-4 py-2 text-[13px] text-white placeholder:text-white/20 focus:outline-none resize-none min-h-[36px] max-h-32 custom-scrollbar font-serif italic"
                    rows={1}
                  />
                  
                  <div className="flex items-center justify-between px-1 pb-1">
                    <div className="flex items-center">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-white/20 hover:text-pink-400"
                        title="Upload Image"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </motion.button>
                      
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleDictation}
                        className={cn(
                          "p-2",
                          isDictating ? "text-red-400" : "text-white/20 hover:text-blue-400"
                        )}
                      >
                        {isDictating ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </motion.button>
                    </div>
 
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSend}
                      disabled={isLoading || (!input.trim() && !selectedImage)}
                      className="px-4 py-1.5 bg-white text-black rounded-full transition-all disabled:opacity-20"
                    >
                      <span className="text-[9px] font-black uppercase tracking-tight">Send</span>
                    </motion.button>
                  </div>
                </div>
                
                <div className="text-center text-[7px] font-black text-white/5 uppercase tracking-[0.4em]">
                  Encrypted Channel
                </div>
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
