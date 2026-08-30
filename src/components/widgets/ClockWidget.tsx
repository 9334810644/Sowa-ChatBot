import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  const dateStr = time.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <motion.div
      drag
      dragMomentum={true}
      dragElastic={0.1}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="p-6 rounded-[28px] glass-card backdrop-blur-3xl border border-white/10 shadow-2xl min-w-[220px] cursor-grab active:cursor-grabbing select-none group"
    >
      <div className="flex flex-col items-center">
        <div className="flex items-baseline gap-1.5">
          <span className="text-5xl font-black tracking-tight text-white/95 drop-shadow-[0_2px_15px_rgba(255,255,255,0.15)]">
            {displayHours}:{minutes}
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
              {ampm}
            </span>
            <span className="text-[10px] font-mono text-cyan-400/80 font-bold">
              :{seconds}
            </span>
          </div>
        </div>
        <div className="mt-2.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/5 text-[10px] font-bold text-white/60 uppercase tracking-[0.2em]">
          {dateStr}
        </div>
      </div>
    </motion.div>
  );
}
