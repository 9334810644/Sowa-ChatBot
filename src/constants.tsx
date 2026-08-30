import { Briefcase, Coffee, Sparkles, Flame } from "lucide-react";
import { Mood } from "./hooks/useLiveSession";

export const MOOD_METADATA: { id: Mood, label: string, icon: any, color: string, description: string }[] = [
  { id: 'serious', label: 'Serious', icon: Briefcase, color: 'text-indigo-400', description: 'Deep, focused, and analytical' },
  { id: 'casual', label: 'Casual', icon: Coffee, color: 'text-cyan-400', description: 'Laid-back, friendly, and relaxed' },
  { id: 'formal', label: 'Formal', icon: Sparkles, color: 'text-amber-400', description: 'Polite, structured, and sophisticated' },
  { id: '18+', label: '18+', icon: Flame, color: 'text-rose-500', description: 'Spicy, bold, and unfiltered' },
];
