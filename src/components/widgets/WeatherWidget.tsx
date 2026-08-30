import React from 'react';
import { motion } from 'motion/react';
import { Cloud, Sun, CloudRain, Wind } from 'lucide-react';

interface WeatherData {
  temp: number;
  condition: string;
  location: string;
  forecast: { day: string, temp: number, icon: any }[];
}

export default function WeatherWidget() {
  // Mock data - In a real app, this would come from a weather API
  const weather: WeatherData = {
    temp: 24,
    condition: 'Partly Cloudy',
    location: 'San Francisco, CA',
    forecast: [
      { day: 'Mon', temp: 22, icon: Cloud },
      { day: 'Tue', temp: 25, icon: Sun },
      { day: 'Wed', temp: 23, icon: CloudRain },
    ]
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-3xl bg-black/20 backdrop-blur-3xl border border-white/10 shadow-2xl min-w-[240px] cursor-move active:cursor-grabbing"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Current Weather</div>
          <div className="text-sm font-semibold text-white/90">{weather.location}</div>
        </div>
        <Sun className="w-6 h-6 text-yellow-400 animate-pulse" />
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="text-5xl font-bold tracking-tighter text-white">
          {weather.temp}°
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white/80">{weather.condition}</span>
          <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold uppercase tracking-wider">
            <Wind className="w-3 h-3" />
            12 km/h
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between">
        {weather.forecast.map((f, i) => (
          <div key={`weather-forecast-${f.day}-${i}`} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-white/40">{f.day}</span>
            <f.icon className="w-4 h-4 text-white/60" />
            <span className="text-xs font-bold text-white/80">{f.temp}°</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
