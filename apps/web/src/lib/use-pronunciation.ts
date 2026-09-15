"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Accent = "en-US" | "en-GB";

const ACCENT_KEY = "elb-pronunciation-accent";

function getStoredAccent(): Accent {
  if (typeof window === "undefined") return "en-US";
  const stored = localStorage.getItem(ACCENT_KEY);
  return stored === "en-GB" ? "en-GB" : "en-US";
}

export function setStoredAccent(accent: Accent): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCENT_KEY, accent);
}

interface UsePronunciationReturn {
  speak: (text: string, itemId: string) => void;
  isSpeaking: (itemId: string) => boolean;
  isSupported: boolean;
  cancel: () => void;
  accent: Accent;
}

export function usePronunciation(): UsePronunciationReturn {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [accent, setAccent] = useState<Accent>(getStoredAccent);
  const sequenceRef = useRef(0);
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const cancel = useCallback((): void => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setActiveItemId(null);
  }, [isSupported]);

  const speak = useCallback(
    (text: string, itemId: string): void => {
      if (!isSupported) return;

      window.speechSynthesis.cancel();
      sequenceRef.current += 1;
      const seq = sequenceRef.current;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = accent;
      utterance.rate = 0.75;

      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find((v) => v.lang === accent);
      const anyTarget = voices.find((v) => v.lang.startsWith(accent.split("-")[0]));
      if (targetVoice) {
        utterance.voice = targetVoice;
      } else if (anyTarget) {
        utterance.voice = anyTarget;
      }

      utterance.onstart = (): void => {
        if (seq === sequenceRef.current) {
          setActiveItemId(itemId);
        }
      };

      utterance.onend = (): void => {
        if (seq === sequenceRef.current) {
          setActiveItemId(null);
        }
      };

      utterance.onerror = (): void => {
        if (seq === sequenceRef.current) {
          setActiveItemId(null);
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, accent],
  );

  const isSpeaking = useCallback(
    (itemId: string): boolean => activeItemId === itemId,
    [activeItemId],
  );

  useEffect(() => {
    return (): void => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return { speak, isSpeaking, isSupported, cancel, accent };
}
