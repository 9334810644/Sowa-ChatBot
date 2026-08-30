import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Power } from 'lucide-react';

interface VoiceVisualizerProps {
  state: string;
  volume: number;
  mood?: string;
  isPaused?: boolean;
  isEvolutionLearning?: boolean;
  evolutionLevel?: number;
  className?: string;
}

export default function VoiceVisualizer({ state, volume, mood = 'formal', isPaused = false, isEvolutionLearning = false, evolutionLevel = 1, className }: VoiceVisualizerProps) {
  const isSpeaking = state === 'speaking' && !isPaused;
  const isListening = state === 'listening' && !isPaused;
  const isIdle = state === 'disconnected' || state === 'error';
  const isConnecting = state === 'connecting';
  
  const isActive = isSpeaking || isListening || isPaused;

  // Dynamic scale and opacity based on state and volume
  let baseScale = 1;
  let opacity = 1;
  let animationSpeed = 1;

  if (isIdle) {
    baseScale = 0.85;
    opacity = 0.4;
    animationSpeed = 0.3; // Slow, subtle shifting
  } else if (isConnecting) {
    baseScale = 0.9;
    opacity = 0.6;
    animationSpeed = 2; // Fast pulsing while connecting
  } else if (isPaused) {
    baseScale = 0.9;
    opacity = 0.5;
    animationSpeed = 0.1; // Very slow, almost frozen
  } else if (isListening) {
    baseScale = 1 + volume * 0.5; // Slight reaction to background noise
    opacity = 0.8;
    animationSpeed = 1; // Normal speed
  } else if (isSpeaking) {
    baseScale = 1.1 + volume * 1.5; // High reaction to speech
    opacity = 1;
    animationSpeed = 1.5 + volume; // Faster when speaking louder
  }

  // Sassy color palettes based on mood and state
  let colors = { c1: 'bg-indigo-500', c2: 'bg-blue-600', c3: 'bg-slate-400' }; // Default Serious

  if (isIdle || isConnecting) {
    colors = { c1: 'bg-indigo-500', c2: 'bg-blue-600', c3: 'bg-slate-500' };
  } else if (isPaused) {
    colors = { c1: 'bg-orange-400', c2: 'bg-amber-500', c3: 'bg-yellow-500' };
  } else if (isEvolutionLearning) {
    colors = { c1: 'bg-cyan-400', c2: 'bg-purple-600', c3: 'bg-white' };
  } else if (isListening) {
    colors = { c1: 'bg-cyan-400', c2: 'bg-fuchsia-500', c3: 'bg-indigo-500' };
  } else {
    // Mode-specific speaking colors
    switch (mood) {
      case 'casual':
        colors = { c1: 'bg-cyan-400', c2: 'bg-blue-500', c3: 'bg-indigo-400' };
        break;
      case 'formal':
        colors = { c1: 'bg-amber-400', c2: 'bg-yellow-500', c3: 'bg-orange-400' };
        break;
      case '18+':
        colors = { c1: 'bg-rose-500', c2: 'bg-red-700', c3: 'bg-purple-900' };
        break;
      case 'serious':
      default:
        colors = { c1: 'bg-indigo-500', c2: 'bg-blue-600', c3: 'bg-slate-400' };
    }
  }

  if (isEvolutionLearning) {
    animationSpeed = 3; // Fast neural processing
  }

  // Evolution Morphing: Scale complexity based on level
  const evolutionScale = 1 + (evolutionLevel - 1) * 0.05;
  const evolutionBlur = Math.max(10, 40 - (evolutionLevel - 1) * 2); // gets "sharper" as it evolves
  const evolutionOpacity = Math.min(0.8, 0.4 + (evolutionLevel - 1) * 0.02);

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Background Living Aura */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0.05, 0.15, 0.05], 
              scale: [1, 1.4, 1],
              rotate: [0, 180, 360]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className={cn(
              "absolute inset-0 rounded-full blur-3xl z-0 pointer-events-none opacity-20",
              isSpeaking ? "bg-white/10" : "bg-purple-500/5"
            )}
            style={{ filter: 'blur(80px)' }}
          />
        )}
      </AnimatePresence>

      {/* Siri Orb Container */}
      <motion.div 
        className="relative w-full h-full flex items-center justify-center"
        animate={
          isIdle 
            ? { scale: [0.85 * evolutionScale, 0.88 * evolutionScale, 0.85 * evolutionScale], opacity: [0.35, 0.45, 0.35] }
            : { scale: baseScale * evolutionScale, opacity: opacity }
        }
        transition={
          isIdle
            ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
            : { type: "spring", stiffness: 150, damping: 15, mass: 0.5 }
        }
      >
        {/* Layer 1 */}
        <motion.div
          className={cn("absolute w-64 h-64 rounded-full mix-blend-screen transition-colors duration-1000", colors.c1)}
          style={{ filter: `blur(${evolutionBlur * 1.2}px)`, opacity: evolutionOpacity }}
          animate={{
            rotate: [0, 360],
            scale: [1, 1.4, 1],
            x: [0, 40, -40, 0],
            y: [0, -40, 40, 0],
          }}
          transition={{ duration: 7 / (animationSpeed * evolutionScale), repeat: Infinity, ease: "linear" }}
        />
        {/* Layer 2 */}
        <motion.div
          className={cn("absolute w-56 h-56 rounded-full mix-blend-screen transition-colors duration-1000", colors.c2)}
          style={{ filter: `blur(${evolutionBlur}px)`, opacity: evolutionOpacity + 0.2 }}
          animate={{
            rotate: [360, 0],
            scale: [1.2, 0.8, 1.2],
            x: [0, -50, 50, 0],
            y: [0, 50, -50, 0],
          }}
          transition={{ duration: 9 / (animationSpeed * evolutionScale), repeat: Infinity, ease: "linear" }}
        />
        {/* Layer 3 */}
        <motion.div
          className={cn("absolute w-48 h-48 rounded-full mix-blend-screen transition-colors duration-1000", colors.c3)}
          style={{ filter: `blur(${evolutionBlur * 0.8}px)`, opacity: evolutionOpacity + 0.1 }}
          animate={{
            rotate: [0, -360],
            scale: [1, 1.3, 1],
            x: [60, 0, -60, 60],
            y: [-60, 0, 60, -60],
          }}
          transition={{ duration: 11 / (animationSpeed * evolutionScale), repeat: Infinity, ease: "linear" }}
        />

        {/* Dynamic Evolution Ring (Appears at Level 5+) */}
        {evolutionLevel >= 5 && (
          <motion.div
            className="absolute w-80 h-80 rounded-full border border-white/5 mix-blend-overlay"
            animate={{ rotate: 360, scale: [0.95, 1.05, 0.95] }}
            transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
          />
        )}

        {/* Level 10+ Pulse Ring */}
        {evolutionLevel >= 10 && (
          <motion.div
            className="absolute w-96 h-96 rounded-full border-2 border-cyan-400/10 mix-blend-overlay"
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Evolution Effect (Electric Pulse) */}
        {isEvolutionLearning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0.2, 0.6, 0.2], 
              scale: [1, 1.25, 1],
              rotate: [0, 90, 180, 270, 360]
            }}
            className="absolute w-72 h-72 rounded-full border-2 border-cyan-400/40 mix-blend-overlay filter blur-xl shadow-[0_0_60px_rgba(34,211,238,0.5)]"
            transition={{ duration: 0.3, repeat: Infinity, ease: "linear" }}
          />
        )}
        {/* Center Glow */}
        <motion.div
          className="absolute w-32 h-32 bg-white/20 rounded-full mix-blend-overlay filter blur-xl"
          animate={{
            scale: isActive ? [1, 1.8, 1] : [1, 1.2, 1],
            opacity: isActive ? [0.4, 0.9, 0.4] : [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 3 / animationSpeed, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Sharp Pulse */}
        {isSpeaking && (
           <motion.div
             className="absolute w-40 h-40 border-2 border-white/10 rounded-full"
             animate={{
               scale: [1, 1.5, 1],
               opacity: [0, 0.2, 0],
             }}
             transition={{ duration: 0.8, repeat: Infinity }}
           />
        )}
      </motion.div>
      
      {/* Idle Power Button Overlay */}
      {isIdle && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-40 h-40 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl group-hover:bg-white/10 transition-colors">
            <Power className="w-12 h-12 text-white/40 group-hover:text-white/80 transition-colors z-10" />
          </div>
        </div>
      )}
    </div>
  );
}
