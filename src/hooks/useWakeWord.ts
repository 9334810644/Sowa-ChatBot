import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWakeWordOptions {
  enabled: boolean;
  onWake: (transcript?: string) => void;
  isActive: boolean; // Is the Gemini live session already active and streaming?
}

// Play a pleasant futuristic two-tone chime when Sowa wakes up
export function playWakeChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.45);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("Wake chime audio error:", e);
  }
}

export function useWakeWord({ enabled, onWake, isActive }: UseWakeWordOptions) {
  const [isListeningForWake, setIsListeningForWake] = useState(false);
  const [lastWakeWordHeard, setLastWakeWordHeard] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef(false);

  const WAKE_REGEX = /\b(hey|hi|ok|okay|wake up|start|hello)?\s*(sowa|maya|soba|sowa ai|maya ai|sawar|sawah)\b/i;

  const startRecognition = useCallback(() => {
    if (!enabled || isActive) {
      if (recognitionRef.current) {
        try {
          isManuallyStoppedRef.current = true;
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListeningForWake(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("[WakeWord] SpeechRecognition API not supported on this browser.");
      return;
    }

    if (recognitionRef.current) {
      try {
        isManuallyStoppedRef.current = true;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningForWake(true);
        isManuallyStoppedRef.current = false;
      };

      recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if (!lastResult) return;

        const transcript = lastResult[0]?.transcript || '';
        const lower = transcript.toLowerCase().trim();

        if (WAKE_REGEX.test(lower)) {
          console.log(`[WakeWord] Detected wake phrase in: "${transcript}"`);
          setLastWakeWordHeard(transcript);
          playWakeChime();

          // Bring desktop window to focus
          fetch('/api/pc/focus', { method: 'POST' }).catch(() => {});

          // Stop listening for wake word while live session engages
          try {
            isManuallyStoppedRef.current = true;
            recognition.stop();
          } catch (e) {}
          setIsListeningForWake(false);

          onWake(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.warn("[WakeWord] Microphone permission denied for wake word.");
          setIsListeningForWake(false);
          return;
        }
        // For 'no-speech' or network glitches, attempt silent reconnect
      };

      recognition.onend = () => {
        setIsListeningForWake(false);
        if (enabled && !isActive && !isManuallyStoppedRef.current) {
          clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            startRecognition();
          }, 800);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("[WakeWord] Error starting recognition:", e);
      setIsListeningForWake(false);
    }
  }, [enabled, isActive, onWake]);

  useEffect(() => {
    isManuallyStoppedRef.current = false;
    startRecognition();

    return () => {
      isManuallyStoppedRef.current = true;
      clearTimeout(restartTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [startRecognition]);

  return {
    isListeningForWake,
    lastWakeWordHeard
  };
}
