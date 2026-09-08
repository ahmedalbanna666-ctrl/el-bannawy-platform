"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioRecordingResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export interface UseAudioRecorder {
  supported: boolean;
  recording: boolean;
  processing: boolean;
  error: string | null;
  durationMs: number;
  result: AudioRecordingResult | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "audio/webm";
}

export function useAudioRecorder(): UseAudioRecorder {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [result, setResult] = useState<AudioRecordingResult | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    /* eslint-disable @typescript-eslint/no-unnecessary-condition */
    setSupported(
      typeof window !== "undefined" &&
        !!navigator.mediaDevices &&
        !!navigator.mediaDevices.getUserMedia &&
        typeof MediaRecorder !== "undefined",
    );
    /* eslint-enable @typescript-eslint/no-unnecessary-condition */
    return (): void => {
      streamRef.current?.getTracks().forEach((t) => { t.stop(); });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = useCallback(async (): Promise<void> => {
    setError(null);
    setResult(null);
    setDurationMs(0);

    // Pre-check secure context
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("التسجيل يتطلب اتصال آمن (HTTPS). يرجى فتح الموقع عبر https://");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e: BlobEvent): void => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = (): void => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const elapsed = Date.now() - startedAtRef.current;
        setResult({ blob, mimeType, durationMs: elapsed });
        streamRef.current?.getTracks().forEach((t) => { t.stop(); });
        streamRef.current = null;
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startedAtRef.current);
      }, 100);
    } catch (err) {
      setRecording(false);
      let message = "تعذر تشغيل التسجيل، تحقق من الميكروفون";
      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError":
            message =
              "تم رفض الوصول للميكروفون. يرجى السماح للتطبيق باستخدام الميكروفون من إعدادات المتصفح (رمز القفل بجانب العنوان ← إعدادات الموقع ← الميكروفون ← سماح) ثم اضغط إعادة المحاولة.";
            break;
          case "NotFoundError":
            message = "لم يتم العثور على ميكروفون. تأكد من توصيل ميكروفون يعمل.";
            break;
          case "NotReadableError":
            message = "الميكروفون قيد الاستخدام من تطبيق آخر. أغلق التطبيقات الأخرى وحاول مرة أخرى.";
            break;
          case "OverconstrainedError":
            message = "الميكروفون لا يدعم الإعدادات المطلوبة.";
            break;
          case "SecurityError":
            message = "التسجيل يتطلب اتصال آمن (HTTPS) وإذن الميكروفون.";
            break;
          case "AbortError":
            message = "تم إلغاء طلب الميكروفون. حاول مرة أخرى.";
            break;
          default:
            message = `تعذر تشغيل التسجيل: ${err.message || err.name}`;
            break;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    }
  }, []);

  const stop = useCallback((): void => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      setProcessing(true);
    }
  }, []);

  const reset = useCallback((): void => {
    setResult(null);
    setError(null);
    setDurationMs(0);
    setProcessing(false);
  }, []);

  // Clear processing flag once a blob result is available.
  useEffect(() => {
    if (result) setProcessing(false);
  }, [result]);

  return {
    supported,
    recording,
    processing,
    error,
    durationMs,
    result,
    start,
    stop,
    reset,
  };
}
