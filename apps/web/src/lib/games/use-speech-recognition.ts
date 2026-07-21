"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface RecognitionResult {
  readonly transcript: string;
  readonly confidence: number;
}

interface RecognitionResultList {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: RecognitionResult;
}

interface RecognitionEvent {
  readonly results: RecognitionResultList[];
}

interface RecognitionErrorEvent {
  error: string;
}

interface RecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionConstructor = new () => RecognitionInstance;

interface SpeechWindow {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
}

export function useSpeechRecognition(): {
  supported: boolean;
  listening: boolean;
  transcript: string;
  finalTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
} {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<RecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const windowCasted = window as unknown as SpeechWindow;
    const Ctor =
      windowCasted.SpeechRecognition ?? windowCasted.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }

    setSupported(true);
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: RecognitionEvent): void => {
      let text = "";
      for (const result of event.results) {
        text += result[0].transcript;
        if (result.isFinal) {
          setFinalTranscript(result[0].transcript);
        }
      }
      setTranscript(text);
    };

    recognition.onerror = (event: RecognitionErrorEvent): void => {
      setError(event.error);
      setListening(false);
    };

    recognition.onend = (): void => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return (): void => {
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const start = useCallback((): void => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError("unsupported");
      return;
    }
    setTranscript("");
    setFinalTranscript("");
    setError(null);
    setListening(true);
    try {
      recognition.start();
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback((): void => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback((): void => {
    setTranscript("");
    setFinalTranscript("");
    setError(null);
  }, []);

  return { supported, listening, transcript, finalTranscript, error, start, stop, reset };
}
