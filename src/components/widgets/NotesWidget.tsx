import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, StickyNote, FileText } from 'lucide-react';
import { safeSaveToLocalStorage } from '../../lib/storage';

interface Note {
  id: string;
  text: string;
  timestamp: number;
}

export default function NotesWidget() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('sowa_quick_notes') || localStorage.getItem('maya_quick_notes');
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    safeSaveToLocalStorage('sowa_quick_notes', JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    if (!newNote.trim()) return;
    const note: Note = {
      id: Math.random().toString(36).substring(7),
      text: newNote,
      timestamp: Date.now()
    };
    setNotes([note, ...notes]);
    setNewNote('');
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  return (
    <motion.div
      drag
      dragMomentum={true}
      dragElastic={0.1}
      whileHover={{ scale: 1.02, y: -2 }}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="p-6 rounded-[28px] glass-card backdrop-blur-3xl border border-white/10 shadow-2xl min-w-[280px] max-w-[320px] flex flex-col max-h-[400px] cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-center justify-between mb-4 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <StickyNote className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <h3 className="text-[10px] font-black text-white/50 uppercase tracking-widest">Quick Notes</h3>
        </div>
      </div>

      <div onPointerDown={(e) => e.stopPropagation()} className="pointer-events-auto">
        <div className="flex gap-2 mb-4">
          <input 
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="Write a thought..."
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-orange-400/50 transition-all font-sans"
          />
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={addNote}
            className="p-2 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-xl hover:brightness-110 transition-all shadow-md shadow-orange-500/20"
          >
            <Plus className="w-4 h-4 text-white" />
          </motion.button>
        </div>

        <div className="overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[250px]">
          <AnimatePresence initial={false}>
            {notes.map(note => (
              <motion.div
                key={`note-${note.id}`}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="group flex items-start gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 rounded-2xl transition-all shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-white/40 mt-0.5 shrink-0" />
                <p className="flex-1 text-xs text-white/80 leading-relaxed font-sans line-clamp-3">
                  {note.text}
                </p>
                <motion.button 
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => deleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </motion.button>
              </motion.div>
            ))}
            {notes.length === 0 && (
              <div className="text-center py-8 text-white/25 text-[10px] font-black uppercase tracking-widest">
                No active notes
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
