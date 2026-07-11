"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePronunciationReturn {
  speak: (text: string, itemId: string) => void;
  isSpeaking: (itemId: string) => boolean;
  isSupported: boolean;
  cancel: () => void;
}

export function usePronunciation(): UsePronunciationReturn {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
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
      utterance.lang = "en-US";
      utterance.rate = 0.75;

      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find((v) => v.lang.startsWith("en-US"));
      const anyEn = voices.find((v) => v.lang.startsWith("en-"));
      if (enVoice) {
        utterance.voice = enVoice;
      } else if (anyEn) {
        utterance.voice = anyEn;
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
    [isSupported],
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

  return { speak, isSpeaking, isSupported, cancel };
}
