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
  for (const t of candidates) if (MediaRecorder.isTypeSupported(t)) return t;
  return "audio/webm";
}

export function useAudioRecorder(): UseAudioRecorder {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [result, setResult] = useState<AudioRecordingResult | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceRef = useRef({ silentMs: 0, hasSpoken: false });
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined",
    );
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      try { audioCtxRef.current?.close(); } catch {}
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setDurationMs(0);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("التسجيل يتطلب HTTPS");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("المتصفح لا يدعم الميكروفون");
      return;
    }
    let stream: MediaStream;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "OverconstrainedError") {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else throw e;
      }
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setResult({ blob, mimeType, durationMs: Date.now() - startedAtRef.current });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (autoStopRef.current) clearTimeout(autoStopRef.current);
        try { audioCtxRef.current?.close(); } catch {}
        audioCtxRef.current = null;
        const chk = (recorderRef as unknown as { _silenceCheck?: ReturnType<typeof setInterval> })._silenceCheck;
        if (chk) clearInterval(chk);
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => setDurationMs(Date.now() - startedAtRef.current), 100);
      autoStopRef.current = setTimeout(() => { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); }, 5000);
      try {
        const AudioCtx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
          || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(analyser);
          audioCtxRef.current = ctx;
          silenceRef.current = { silentMs: 0, hasSpoken: false };
          const data = new Uint8Array(analyser.frequencyBinCount);
          const check = setInterval(() => {
            if (!recorderRef.current || recorderRef.current.state !== "recording") { clearInterval(check); return; }
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((s, v) => s + v, 0) / data.length;
            if (avg > 12) { silenceRef.current.hasSpoken = true; silenceRef.current.silentMs = 0; }
            else if (silenceRef.current.hasSpoken) {
              silenceRef.current.silentMs += 100;
              if (silenceRef.current.silentMs >= 1200) { clearInterval(check); recorderRef.current?.state === "recording" && recorderRef.current.stop(); }
            }
            if (!silenceRef.current.hasSpoken && Date.now() - startedAtRef.current > 3000) {
              if (avg < 8) { clearInterval(check); recorderRef.current?.state === "recording" && recorderRef.current.stop(); }
            }
          }, 100);
          (recorderRef as unknown as { _silenceCheck?: ReturnType<typeof setInterval> })._silenceCheck = check;
        }
      } catch {}
    } catch (err) {
      setRecording(false);
      const n = err instanceof DOMException ? err.name : (err as { name?: string })?.name ?? "";
      const m = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "";
      let msg = "تعذر تشغيل الميكروفون";
      if (n === "NotAllowedError" || m.includes("Permission")) msg = "تم رفض الميكروفون. اسمح من رمز القفل ← إعدادات الموقع ← سماح ثم أعد المحاولة.";
      else if (n === "NotFoundError") msg = "لا يوجد ميكروفون";
      else if (n === "NotReadableError") msg = "الميكروفون مستخدم في تطبيق آخر";
      else if (err instanceof Error && err.message) msg = err.message;
      setError(msg);
    }
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      const chk = (recorderRef as unknown as { _silenceCheck?: ReturnType<typeof setInterval> })._silenceCheck;
      if (chk) clearInterval(chk);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null); setError(null); setDurationMs(0);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
  }, []);

  useEffect(() => {}, [result]);

  return { supported, recording, error, durationMs, result, start, stop, reset, processing: false } as unknown as UseAudioRecorder;
}
