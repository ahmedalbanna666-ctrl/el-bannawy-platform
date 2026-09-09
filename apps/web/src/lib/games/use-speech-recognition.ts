"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-type-assertion */

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSpeechRecognition {
  supported: boolean;
  listening: boolean;
  transcript: string | null;
  error: string | null;
  start: (expectedText: string) => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognition {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<unknown | null>(null);
  const expectedRef = useRef<string>("");

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const start = useCallback((expectedText: string) => {
    setError(null);
    setTranscript(null);
    expectedRef.current = expectedText;

    const w = window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("المتصفح لا يدعم التعرف على الكلام. جرب Chrome على الكمبيوتر أو الهاتف.");
      return;
    }

    try {
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      (rec as unknown as { continuous: boolean }).continuous = false;

       
      (rec as unknown as { onstart: unknown }).onstart = () => { setListening(true); };
       
      (rec as unknown as { onend: unknown }).onend = () => { setListening(false); };
       
      (rec as unknown as { onerror: unknown }).onerror = (e: unknown) => {
        setListening(false);
        const code = (e as { error?: string }).error ?? "";
        if (code === "not-allowed" || code === "service-not-allowed") {
          setError("تم رفض إذن الميكروفون للتعرف على الكلام. اسمح من إعدادات المتصفح.");
        } else if (code === "no-speech") {
          setError("لم يتم سماع أي صوت. حاول مرة أخرى بصوت أوضح.");
        } else if (code === "audio-capture") {
          setError("لم يتم العثور على ميكروفون.");
        } else {
          setError(`خطأ في التعرف: ${code || "غير معروف"}`);
        }
      };
       
      (rec as unknown as { onresult: unknown }).onresult = (event: unknown) => {
        const result =
          (event as { results?: { transcript?: string }[][] }).results?.[0]?.[0]?.transcript ?? "";
        setTranscript(result);
        setListening(false);
      };

      recognitionRef.current = rec as unknown;
       
      (rec as unknown as { start: () => void }).start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر بدء التعرف على الكلام");
    }
  }, []);

  const stop = useCallback(() => {
    try {
       
      (recognitionRef.current as { stop?: () => void })?.stop?.();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript(null);
    setError(null);
    setListening(false);
    try {
       
      (recognitionRef.current as { abort?: () => void })?.abort?.();
    } catch {
      // ignore
    }
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}
