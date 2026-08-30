import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import { SessionState } from "../hooks/useLiveSession";

export interface SowaOrbProps {
  state: SessionState;
  className?: string;
}
export type MayaOrbProps = SowaOrbProps;

export default function SowaOrb({ state, className }: SowaOrbProps) {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isConnecting = state === 'connecting';
  const isError = state === 'error';

  // Dynamic vibrant colors based on state
  const primaryColor = isSpeaking ? "#f43f5e" : isError ? "#ef4444" : isListening ? "#06b6d4" : "#8b5cf6";
  const glowColor = isSpeaking ? "rgba(244, 63, 94, 0.65)" : isError ? "rgba(239, 68, 68, 0.65)" : isListening ? "rgba(6, 182, 212, 0.6)" : "rgba(139, 92, 246, 0.5)";

  return (
    <div className={cn("relative flex items-center justify-center w-full max-w-md h-64", className)}>
      {/* Background Volumetric Aura */}
      <motion.div
        animate={{
          scale: isListening ? [1, 1.2, 1] : isSpeaking ? [1.15, 1.45, 1.15] : [0.95, 1.05, 0.95],
          opacity: isListening ? [0.35, 0.7, 0.35] : isSpeaking ? [0.55, 0.9, 0.55] : [0.2, 0.35, 0.2],
          backgroundColor: primaryColor,
        }}
        transition={{
          duration: isSpeaking ? 1.4 : isListening ? 2.2 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute w-72 h-36 rounded-full blur-[100px] mix-blend-screen pointer-events-none"
      />

      {/* Orbiting Celestial Particle Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`orb-path-${i}`}
            initial={{ rotate: i * 60, opacity: 0 }}
            animate={{ 
              rotate: i * 60 + 360,
              opacity: isConnecting ? [0.2, 0.5, 0.2] : isSpeaking ? [0.35, 0.6, 0.35] : 0.18,
              scale: isSpeaking ? [1, 1.06, 1] : isListening ? [1, 1.03, 1] : 1
            }}
            transition={{ 
              rotate: { duration: 18 + i * 8, repeat: Infinity, ease: "linear" },
              opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className={cn(
              "absolute border rounded-[120px] transition-colors duration-700",
              isSpeaking ? "border-rose-400/30 border-dashed" : isListening ? "border-cyan-400/30 border-dashed" : "border-white/10 border-dashed"
            )}
            style={{
              width: `${280 + i * 70}px`,
              height: `${140 + i * 35}px`,
            }}
          />
        ))}
      </div>

      {/* Main Glass Orb Capsule */}
      <motion.div
        whileHover={{ scale: 1.04, y: -4 }}
        whileTap={{ scale: 0.96 }}
        animate={{
          scale: isSpeaking ? [1, 1.05, 1] : isListening ? [1, 1.02, 1] : isConnecting ? [0.98, 1.02, 0.98] : 1,
          y: isSpeaking ? [0, -6, 0] : isListening ? [0, -4, 0] : [0, -2, 0],
          boxShadow: isSpeaking 
            ? `0 0 110px ${glowColor}, inset 0 0 35px ${glowColor}, 0 20px 40px rgba(0,0,0,0.5)`
            : isListening 
            ? `0 0 75px ${glowColor}, inset 0 0 25px ${glowColor}, 0 15px 35px rgba(0,0,0,0.4)`
            : isError
            ? "0 0 50px rgba(239, 68, 68, 0.6), inset 0 0 20px rgba(239, 68, 68, 0.4)"
            : `0 0 45px ${glowColor}, inset 0 0 12px ${glowColor}`,
          background: isError 
            ? "linear-gradient(135deg, #ef4444, #991b1b)"
            : isSpeaking
            ? "linear-gradient(135deg, #fb7185, #e11d48, #be123c)"
            : isListening
            ? "linear-gradient(135deg, #38bdf8, #0284c7, #6366f1)"
            : "linear-gradient(135deg, #a78bfa, #7c3aed, #4c1d95)",
        }}
        transition={{
          duration: isSpeaking ? 1.2 : isListening ? 2 : 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          boxShadow: { duration: 0.4 }
        }}
        className="w-64 h-24 rounded-[48px] flex items-center justify-center relative z-10 overflow-hidden border border-white/30 backdrop-blur-3xl cursor-pointer select-none"
      >
        {/* Dynamic Expanding Resonance Waves */}
        {(isListening || isSpeaking || isConnecting) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`orb-wave-${i}`}
                animate={{
                  scale: [1, 2],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: isSpeaking ? 1.1 : 1.8,
                  repeat: Infinity,
                  delay: i * (isSpeaking ? 0.35 : 0.55),
                  ease: "easeOut",
                }}
                className={cn(
                  "absolute w-full h-full border rounded-[48px]",
                  isSpeaking ? "border-rose-300/60" : isListening ? "border-cyan-300/60" : "border-purple-300/40"
                )}
              />
            ))}
          </div>
        )}

        {/* Shimmer Light Sweep */}
        <motion.div 
          animate={{ x: ['-200%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
        />
        
        {/* Typographic Core */}
        <motion.div 
          animate={{
            letterSpacing: isSpeaking ? ["0.25em", "0.45em", "0.25em"] : "0.3em",
            opacity: isSpeaking ? [0.92, 1, 0.92] : 1,
            scale: isSpeaking ? [1, 1.06, 1] : 1
          }}
          transition={{ 
            duration: 1.2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-white text-4xl font-black tracking-[0.3em] z-20 select-none drop-shadow-[0_2px_20px_rgba(255,255,255,0.45)]"
        >
          SOWA
        </motion.div>
      </motion.div>

      {/* Live Status Badge */}
      <div className="absolute top-1/2 -right-12 md:-right-24 transform -translate-y-1/2 flex items-center gap-2.5">
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "w-2.5 h-2.5 rounded-full shadow-lg",
            isError ? "bg-red-500 shadow-red-500/50" : isSpeaking ? "bg-rose-400 shadow-rose-400/50" : isListening ? "bg-cyan-400 shadow-cyan-400/50" : "bg-purple-400 shadow-purple-400/50"
          )} 
        />
        <motion.p
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          key={state}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            "font-bold text-xs tracking-wider uppercase",
            isError ? "text-red-400" : isSpeaking ? "text-rose-300" : isListening ? "text-cyan-300" : "text-purple-300"
          )}
        >
          {state === 'disconnected' && "Sleeping"}
          {state === 'connecting' && "Waking..."}
          {state === 'listening' && "Listening"}
          {state === 'speaking' && "Speaking"}
          {state === 'error' && "Attention"}
        </motion.p>
      </div>
    </div>
  );
}
