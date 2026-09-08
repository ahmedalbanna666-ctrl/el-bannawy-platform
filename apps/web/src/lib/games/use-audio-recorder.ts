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

    // Check for basic support first
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("المتصفح لا يدعم الوصول للميكروفون. جرب متصفح حديث مثل Chrome أو Firefox.");
      return;
    }

    let stream: MediaStream;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (e) {
        // Fallback for devices that don't support advanced constraints (e.g. some iOS versions)
        if (e instanceof DOMException && e.name === "OverconstrainedError") {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw e;
        }
      }
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
      const errName = err instanceof DOMException ? err.name : (err as { name?: string })?.name ?? "";
      const errMsg = err instanceof Error ? err.message : String(err ?? "");
      // Handle permission and other errors robustly even when err is not a DOMException
      if (errName === "NotAllowedError" || errMsg.includes("Permission denied") || errMsg.includes("NotAllowed")) {
        message =
          "تم رفض الوصول للميكروفون. يرجى السماح للتطبيق باستخدام الميكروفون من إعدادات المتصفح (رمز القفل بجانب العنوان ← إعدادات الموقع ← الميكروفون ← سماح) ثم اضغط إعادة المحاولة. على الهاتف: إعدادات المتصفح ← الخصوصية ← الميكروفون.";
      } else if (errName === "NotFoundError" || errMsg.includes("NotFound")) {
        message = "لم يتم العثور على ميكروفون. تأكد من توصيل ميكروفون يعمل وأنه غير معطل من إعدادات النظام.";
      } else if (errName === "NotReadableError" || errMsg.includes("NotReadable")) {
        message = "الميكروفون قيد الاستخدام من تطبيق آخر (مثل Zoom أو Meet). أغلق التطبيقات الأخرى وحاول مرة أخرى.";
      } else if (errName === "OverconstrainedError") {
        message = "الميكروفون لا يدعم الإعدادات المطلوبة. سيتم المحاولة بإعدادات أبسط.";
      } else if (errName === "SecurityError" || errMsg.includes("Secure")) {
        message = "التسجيل يتطلب اتصال آمن (HTTPS) وإذن الميكروفون. تأكد من فتح الموقع عبر https://";
      } else if (errName === "AbortError") {
        message = "تم إلغاء طلب الميكروفون. حاول مرة أخرى.";
      } else if (err instanceof DOMException) {
        message = `تعذر تشغيل التسجيل: ${err.message || err.name}`;
      } else if (err instanceof Error && err.message) {
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
