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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceRef = useRef<{ silentMs: number; hasSpoken: boolean }>({ silentMs: 0, hasSpoken: false });
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      try {
        audioContextRef.current?.close();
      } catch {
        // ignore
      }
      const chk = (recorderRef as unknown as { _silenceCheck?: ReturnType<typeof setInterval> })._silenceCheck;
      if (chk) clearInterval(chk);
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
    if (
      typeof navigator === "undefined" ||
      typeof navigator.mediaDevices === "undefined" ||
      typeof (navigator.mediaDevices as unknown as { getUserMedia?: unknown }).getUserMedia !==
        "function"
    ) {
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
        if (autoStopRef.current) clearTimeout(autoStopRef.current);
        try {
          audioContextRef.current?.close();
        } catch {
          // ignore
        }
        audioContextRef.current = null;
        analyserRef.current = null;
        const chk = (recorderRef as unknown as { _silenceCheck?: ReturnType<typeof setInterval> })._silenceCheck;
        if (chk) clearInterval(chk);
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startedAtRef.current);
      }, 100);

      // Auto-stop after max 5s
      autoStopRef.current = setTimeout(() => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      }, 5000);

      // Silence detection: stop 1.2s after user stops speaking
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);
          audioContextRef.current = ctx;
          analyserRef.current = analyser;
          silenceRef.current = { silentMs: 0, hasSpoken: false };
          const data = new Uint8Array(analyser.frequencyBinCount);
          const check = setInterval(() => {
            if (!recorderRef.current || recorderRef.current.state !== "recording") {
              clearInterval(check);
              return;
            }
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((s, v) => s + v, 0) / data.length;
            const speaking = avg > 12; // threshold
            if (speaking) {
              silenceRef.current.hasSpoken = true;
              silenceRef.current.silentMs = 0;
            } else if (silenceRef.current.hasSpoken) {
              silenceRef.current.silentMs += 100;
              if (silenceRef.current.silentMs >= 1200) {
                clearInterval(check);
                if (recorderRef.current?.state === "recording") recorderRef.current.stop();
              }
            }
            // If no speech at all for 3s, still stop to avoid endless wait
            const elapsed = Date.now() - startedAtRef.current;
            if (!silenceRef.current.hasSpoken && elapsed > 3000) {
              const avg2 = data.reduce((s, v) => s + v, 0) / data.length;
              if (avg2 < 8) {
                clearInterval(check);
                if (recorderRef.current?.state === "recording") recorderRef.current.stop();
              }
            }
          }, 100);
          // Store check interval to clear on stop
          (timerRef as unknown as { current: ReturnType<typeof setInterval> | null }).current = timerRef.current;
          // Keep reference to silence check to clear later
          (recorderRef as unknown as { _silenceCheck?: ReturnType<typeof setInterval> })._silenceCheck = check;
        }
      } catch {
        // ignore VAD errors, fallback to manual stop
      }
    } catch (err) {
      setRecording(false);
      let message = "تعذر تشغيل التسجيل، تحقق من الميكروفون";
      const errName = err instanceof DOMException ? err.name : ((err as { name?: string }).name ?? "");
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : ((err as { message?: string }).message ?? "");
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
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      const chk = (recorderRef as unknown as { _silenceCheck?: ReturnType<typeof setInterval> })._silenceCheck;
      if (chk) clearInterval(chk);
    }
  }, []);

  const reset = useCallback((): void => {
    setResult(null);
    setError(null);
    setDurationMs(0);
    setProcessing(false);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    try {
      audioContextRef.current?.close();
    } catch {
      // ignore
    }
    audioContextRef.current = null;
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
