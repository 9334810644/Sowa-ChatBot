import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout, X, Plus } from 'lucide-react';
import ClockWidget from './ClockWidget';
import WeatherWidget from './WeatherWidget';
import NotesWidget from './NotesWidget';
import { cn } from '@/src/lib/utils';

export default function DesktopWidgets() {
  const [showWidgets, setShowWidgets] = useState(true);
  
  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-8 flex flex-col gap-6">
      {/* Toggle Button */}
      <div className="flex justify-start pointer-events-auto">
        <button
          onClick={() => setShowWidgets(!showWidgets)}
          className={cn(
            "p-3 rounded-full glass-panel transition-all active:scale-95 group",
            showWidgets ? "text-orange-400 bg-orange-400/10" : "text-white/40 hover:text-white/60"
          )}
          title={showWidgets ? "Hide Widgets" : "Show Widgets"}
        >
          {showWidgets ? <X className="w-4 h-4" /> : <Layout className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {showWidgets && (
          <div className="flex-1 flex flex-col sm:flex-row gap-8 items-start pointer-events-auto overflow-y-auto sm:overflow-visible custom-scrollbar pt-12 sm:pt-0">
            <div className="flex flex-col gap-8 w-full sm:w-auto">
              <ClockWidget />
              <WeatherWidget />
            </div>
            <div className="w-full sm:w-auto sm:mt-12">
              <NotesWidget />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
