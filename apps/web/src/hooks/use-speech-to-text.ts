"use client";

import { useState, useCallback, useRef } from "react";

interface UseSpeechToTextReturn {
  isListening: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  error: string | null;
}

/**
 * Hook for browser-native speech-to-text (Web Speech API).
 * Calls onResult with ONLY the new text (not the full accumulated transcript).
 */
export function useSpeechToText(
  onResult: (newText: string) => void,
): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastSentRef = useRef("");

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stop = useCallback((): void => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    lastSentRef.current = "";
  }, []);

  const start = useCallback((): void => {
    if (!isSupported) {
      setError("المتصفح لا يدعم التعرف على الصوت");
      return;
    }

    setError(null);
    lastSentRef.current = "";

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false; // Only send final results

    recognition.onresult = (event: SpeechRecognitionEvent): void => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim();
          if (transcript) {
            lastSentRef.current += transcript + " ";
            onResult(transcript);
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent): void => {
      if (event.error !== "aborted") {
        setError("حدث خطأ أثناء التعرف على الصوت: " + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = (): void => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isSupported, onResult]);

  return { isListening, isSupported, start, stop, error };
}

// Type declarations for Web Speech API
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface Window {
  SpeechRecognition: new () => SpeechRecognition;
  webkitSpeechRecognition: new () => SpeechRecognition;
}
