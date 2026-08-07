"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import Script from "next/script";
import { api } from "@/lib/api-client";
import type { VideoEvent, QuestionData, LessonCompletedActions } from "./types";
import { VideoQuestionModal } from "./video-question-modal";

interface PlyrVideoPlayerProps {
  readonly providerVideoId: string;
  readonly videoId: string | null;
  readonly startAt?: number;
  readonly lessonTitle?: string;
  readonly enableLessonCompleted?: boolean;
  readonly completedActions?: LessonCompletedActions;
}

const SAVE_INTERVAL_MS = 90_000;
const EVENT_CHECK_INTERVAL_MS = 500;

/** Mobile detection used to trim controls and auto-rotate on fullscreen. */
function isMobileViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 768px)").matches
  );
}

interface ScreenOrientationLike {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
}

function getScreenOrientation(): ScreenOrientationLike | null {
  if (typeof screen === "undefined") return null;
  const ori = (screen as unknown as { orientation?: ScreenOrientationLike }).orientation;
  return ori ?? null;
}

/** Best-effort rotate the device to landscape while in fullscreen. */
function lockLandscape(): void {
  try {
    const ori = getScreenOrientation();
    if (!ori?.lock) return;
    void ori.lock("landscape").catch((): void => undefined);
  } catch {
    // Unsupported (e.g. iOS Safari) — user rotates manually.
  }
}

/** Release the orientation lock when fullscreen is exited. */
function unlockOrientation(): void {
  try {
    const ori = getScreenOrientation();
    if (!ori?.unlock) return;
    ori.unlock();
  } catch {
    // ignore
  }
}

function isDocumentFullscreen(): boolean {
  return typeof document !== "undefined" && Boolean(document.fullscreenElement);
}

/** Format seconds as MM:SS (or H:MM:SS for durations >= 1h). */
function formatTime(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${String(h)}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function PlyrVideoPlayer({
  providerVideoId,
  videoId,
  startAt = 0,
  lessonTitle,
  enableLessonCompleted = false,
  completedActions,
}: PlyrVideoPlayerProps): ReactNode {
  const playerId = `yt-player-${providerVideoId}`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const plyrRef = useRef<unknown>(null);
  const eventsRef = useRef<readonly VideoEvent[]>([]);
  const triggeredRef = useRef<Set<string>>(new Set());
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedActionsRef = useRef(completedActions);
  const answeredEventsRef = useRef<Set<string>>(new Set());
  const isPausedForQuestionRef = useRef(false);
  const activeQuestionRef = useRef<{ event: VideoEvent; question: QuestionData } | null>(null);
  const markersRef = useRef<HTMLDivElement[]>([]);
  const isSeekingProgrammaticallyRef = useRef(false);
  const isPlayingRef = useRef(false);
  const startAtRef = useRef(startAt);
  completedActionsRef.current = completedActions;
  startAtRef.current = startAt;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<{ event: VideoEvent; question: QuestionData } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Custom control bar state ──────────────────────────────────────────
  const [customTime, setCustomTime] = useState(0);
  const [customDuration, setCustomDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [weakToastVisible, setWeakToastVisible] = useState(false);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weakToastShownRef = useRef(false);

  const QUALITY_OPTIONS: readonly { label: string; value: string }[] = [
    { label: "Auto (Recommended)", value: "auto" },
    { label: "1080p", value: "1080" },
    { label: "720p", value: "720" },
    { label: "480p", value: "480" },
    { label: "360p", value: "360" },
    { label: "240p", value: "240" },
  ];
  const QUALITY_STORAGE_KEY = "alrayan_video_quality";
  const [quality, setQuality] = useState<string>(() => {
    if (typeof window === "undefined") return "auto";
    try { return window.localStorage.getItem(QUALITY_STORAGE_KEY) ?? "auto"; } catch { return "auto"; }
  });

  const saveProgress = useCallback((): void => {
    if (!videoId) return;
    api.patch(`/videos/${videoId}/progress`, {
      currentPosition: Math.floor(currentTimeRef.current),
      watchedSeconds: Math.floor(currentTimeRef.current),
    }).catch((): void => undefined);
  }, [videoId]);

  const handleComplete = useCallback((): void => {
    if (!videoId) return;
    api.post(`/videos/${videoId}/complete`).then((): void => { setCompleted(true); }).catch((): void => undefined);
  }, [videoId]);

  // ── Custom control bar helpers ────────────────────────────────────────
  const showControlsTemporarily = useCallback((): void => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout((): void => {
      setControlsVisible(false);
      setQualityOpen(false);
    }, 4000);
  }, []);

  const bumpControls = useCallback((): void => {
    // Keep controls visible while scrubbing; otherwise auto-hide after 4s.
    if (isScrubbing) return;
    showControlsTemporarily();
  }, [isScrubbing, showControlsTemporarily]);

  const togglePlay = useCallback((): void => {
    const plyr = plyrRef.current as { play?: () => void; pause?: () => void } | null;
    if (!plyr) return;
    if (isPlayingRef.current) plyr.pause?.();
    else plyr.play?.();
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const onSeekInput = useCallback((value: number): void => {
    setScrubValue(value);
    setCustomTime(value);
  }, []);

  const onSeekCommit = useCallback((value: number): void => {
    const plyr = plyrRef.current as { currentTime: number } | null;
    if (plyr) plyr.currentTime = value;
    setIsScrubbing(false);
    setCustomTime(value);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const toggleMute = useCallback((): void => {
    const plyr = plyrRef.current as { muted: boolean } | null;
    if (!plyr) return;
    plyr.muted = !plyr.muted;
    setIsMuted(plyr.muted);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const setVideoVolume = useCallback((value: number): void => {
    const clamped = Math.min(1, Math.max(0, value));
    const plyr = plyrRef.current as { volume: number; muted: boolean } | null;
    if (!plyr) return;
    plyr.volume = clamped;
    if (clamped > 0 && plyr.muted) {
      plyr.muted = false;
      setIsMuted(false);
    }
    setVolume(clamped);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const volumeUp = useCallback((): void => {
    setVideoVolume(Math.min(1, (volume + 0.1)));
  }, [setVideoVolume, volume]);

  const volumeDown = useCallback((): void => {
    setVideoVolume(Math.max(0, (volume - 0.1)));
  }, [setVideoVolume, volume]);

  const applyQuality = useCallback((value: string): void => {
    setQuality(value);
    try { window.localStorage.setItem(QUALITY_STORAGE_KEY, value); } catch { /* ignore */ }
    setQualityOpen(false);
    // Try to push the desired quality to the YouTube player via postMessage.
    if (value !== "auto") {
      const iframe = document.querySelector<HTMLIFrameElement>(`#${playerId} iframe`);
      iframe?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackQuality", args: [value] }),
        "*",
      );
    }
    showControlsTemporarily();
  }, [playerId, showControlsTemporarily]);

  const toggleFullscreen = useCallback((): void => {
    const plyr = plyrRef.current as { fullscreen?: { toggle: () => void } } | null;
    if (plyr?.fullscreen) plyr.fullscreen.toggle();
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  useEffect(() => {
    return (): void => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // Show the controls on start, then auto-hide after a few seconds unless
  // the user is scrubbing.
  useEffect(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout((): void => {
      setControlsVisible(false);
      setQualityOpen(false);
    }, 4000);
    return (): void => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [isPlaying]);

  const fireQuestion = useCallback(async (event: VideoEvent): Promise<void> => {
    if (triggeredRef.current.has(event.id)) return;
    triggeredRef.current.add(event.id);

    // Fetch the question data FIRST so we never pause the video for a question
    // that has no loadable content (previously this paused the video every
    // time a stale/empty question event was reached, causing random pauses).
    let question: QuestionData | null = null;
    try {
      const res = await api.get<QuestionData>(`/video-questions/by-video-event/${event.id}`);
      question = res.data ?? null;
    } catch {
      question = null;
    }

    if (!question) {
      // No question content available — do not pause; keep playing.
      triggeredRef.current.delete(event.id);
      return;
    }

    isPausedForQuestionRef.current = true;
    const plyr = plyrRef.current as { currentTime: number; pause?: () => void } | null;
    if (plyr) {
      isSeekingProgrammaticallyRef.current = true;
      plyr.currentTime = event.timestamp;
      plyr.pause?.();
    }

    const questionState = { event, question };
    activeQuestionRef.current = questionState;
    setActiveQuestion(questionState);
    // If the player is in fullscreen, exit so the question modal is visible.
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
  }, []);

  const checkTimelineEvents = useCallback(async (): Promise<void> => {
    const events = eventsRef.current;
    const currentTime = currentTimeRef.current;
    // Do not fire timeline questions before playback actually starts, and
    // guard against non-finite values that YouTube can report before the API
    // is ready (which previously caused questions to pop at the very start).
    if (events.length === 0 || isPausedForQuestionRef.current || !isPlayingRef.current) return;
    if (!Number.isFinite(currentTime) || currentTime <= 0) return;

    for (const event of events) {
      if (!event.enabled) continue;
      if (triggeredRef.current.has(event.id)) continue;
      if (currentTime < event.timestamp) continue;
      if (event.type === "QUESTION") {
        await fireQuestion(event);
        return;
      }
    }
  }, [fireQuestion]);

  const handleQuestionComplete = useCallback((_correct: boolean): void => {
    const currentActive = activeQuestionRef.current;
    setActiveQuestion(null);
    activeQuestionRef.current = null;
    isPausedForQuestionRef.current = false;
    if (currentActive) {
      answeredEventsRef.current.add(currentActive.event.id);
      const plyr = plyrRef.current as { currentTime: number; play?: () => void } | null;
      if (plyr) {
        isSeekingProgrammaticallyRef.current = true;
        plyr.currentTime = currentActive.event.timestamp;
        plyr.play?.();
      }
    }
    saveProgress();
  }, [saveProgress]);

  const handleQuestionSkip = useCallback((): void => {
    setActiveQuestion(null);
    activeQuestionRef.current = null;
    isPausedForQuestionRef.current = false;
    const plyr = plyrRef.current as { play?: () => void } | null;
    plyr?.play?.();
    saveProgress();
  }, [saveProgress]);

  useEffect(() => {
    if (!videoId) return;
    progressIntervalRef.current = setInterval(() => { saveProgress(); }, SAVE_INTERVAL_MS);
    return function cleanup(): void { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [videoId, saveProgress]);

  useEffect(() => {
    if (!videoId) return;
    const flush = (): void => { saveProgress(); };
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") flush();
    };
    // Use pagehide/visibilitychange only — beforeunload triggers a browser
    // Permissions-Policy "unload" violation and the fetch is unreliable on mobile.
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return (): void => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [videoId, saveProgress]);

  useEffect(() => {
    if (!isPlaying) return;
    eventCheckIntervalRef.current = setInterval((): void => { void checkTimelineEvents(); }, EVENT_CHECK_INTERVAL_MS);
    return function cleanup(): void { if (eventCheckIntervalRef.current) clearInterval(eventCheckIntervalRef.current); };
  }, [checkTimelineEvents, isPlaying]);

  useEffect(() => {
    const onFullscreenChange = (): void => {
      // Release the orientation lock whenever fullscreen is exited.
      if (!isDocumentFullscreen()) {
        unlockOrientation();
      }
      // If a question is active, never let the video stay in fullscreen behind
      // the question modal.
      if (document.fullscreenElement && activeQuestionRef.current) {
        void document.exitFullscreen();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return (): void => { document.removeEventListener("fullscreenchange", onFullscreenChange); };
  }, []);

  const renderQuestionMarkers = useCallback((): void => {
    markersRef.current.forEach((el) => { el.remove(); });
    markersRef.current = [];
    const events = eventsRef.current;
    const container = document.getElementById(playerId);
    if (!container || events.length === 0) return;
    const progressEl = container.querySelector<HTMLElement>(".plyr__progress");
    if (!progressEl) return;
    const questionEvents = events.filter((e) => e.type === "QUESTION" && e.enabled);
    const duration = durationRef.current;
    if (duration <= 0) return;
    for (const event of questionEvents) {
      const marker = document.createElement("div");
      const left = (event.timestamp / duration) * 100;
      marker.style.cssText = `
        position: absolute; bottom: -2px; left: ${String(left)}%; width: 10px; height: 10px;
        border-radius: 50%; background: #f59e0b; border: 2px solid #fff;
        transform: translateX(-50%); z-index: 10; cursor: pointer; pointer-events: auto;
        box-shadow: 0 0 6px rgba(245,158,11,0.6);
      `;
      marker.title = event.title || "سؤال";
      marker.addEventListener("click", (e) => {
        e.stopPropagation();
        const plyr = plyrRef.current as { currentTime: number } | null;
        if (plyr) plyr.currentTime = event.timestamp;
      });
      progressEl.style.position = "relative";
      progressEl.appendChild(marker);
      markersRef.current.push(marker);
    }
  }, [playerId]);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    triggeredRef.current.clear();
    answeredEventsRef.current.clear();
    eventsRef.current = [];
    let attempts = 0;
    const MAX_EVENT_ATTEMPTS = 3;
    const load = (): void => {
      api.get<readonly VideoEvent[]>(`/video-events?videoId=${videoId}`)
        .then((res): void => {
          if (!cancelled && res.data) {
            eventsRef.current = res.data;
            renderQuestionMarkers();
            // Fire any question the student has already reached (e.g. events
            // that finished loading after the timestamp passed).
            void checkTimelineEvents();
          }
        })
        .catch((): void => {
          if (cancelled) return;
          attempts += 1;
          if (attempts < MAX_EVENT_ATTEMPTS) {
            window.setTimeout(load, 1500 * attempts);
          }
        });
    };
    load();
    return function cleanup(): void { cancelled = true; };
  }, [videoId, renderQuestionMarkers, checkTimelineEvents]);

  useEffect(() => {
    const timer = setTimeout((): void => { setLoading(false); }, 12_000);
    return (): void => { clearTimeout(timer); };
  }, []);

  const initPlayer = useCallback((): void => {
    const container = document.getElementById(playerId);
    if (!container) return;

    // Destroy any previous instance (e.g. client-side navigation between lessons).
    if (plyrRef.current) {
      try { (plyrRef.current as { destroy?: () => void }).destroy?.(); } catch { /* ignore */ }
      plyrRef.current = null;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 24;

    const createPlayer = (): void => {
      if (plyrRef.current) return;
      // The Plyr CDN script may not have finished executing yet during
      // client-side navigation, so keep retrying until it is available.
      if (typeof Plyr === "undefined" || !document.getElementById(playerId)) {
        if (attempts < MAX_ATTEMPTS) {
          attempts += 1;
          window.setTimeout(createPlayer, 500);
        }
        return;
      }

      // We build our own two-row control bar (see the custom controls JSX +
      // CSS below). Plyr's native controls are disabled entirely.
      const controls: string[] = [];
      const player = new Plyr(container, {
        controls,
        youtube: {
          noCookie: true,
          rel: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          controls: 0,
          fs: 0,
          cc_load_policy: 0,
        },
        poster: `https://img.youtube.com/vi/${providerVideoId}/maxresdefault.jpg`,
        ratio: "16:9",
        resetOnEnd: true,
        clickToPlay: true,
        hideControls: true,
        tooltips: { controls: true, seek: true },
      });

      // On phones, fullscreen is handled by Plyr on its internal container.
      // We fix the crop purely in CSS (see `.plyr:fullscreen` rules below) by
      // letterboxing the 16:9 stage, so the visible frame matches normal mode.
      // We do NOT intercept the fullscreen button — Plyr must keep working.
      player.on("enterfullscreen", (): void => {
        if (isMobileViewport()) {
          // Give the browser a moment to promote the element to fullscreen
          // before requesting the orientation lock, otherwise it is rejected.
          window.setTimeout(lockLandscape, 120);
        }
      });
      player.on("exitfullscreen", (): void => {
        unlockOrientation();
        // Also exit native fullscreen if it was left active.
        if (isDocumentFullscreen()) {
          void document.exitFullscreen().catch(() => undefined);
        }
      });

      plyrRef.current = player;
      const posterEl = container.querySelector<HTMLElement>(".plyr__poster");

      player.on("ready", (): void => {
        setLoading(false);
        setVolume(player.volume);
        // Resume from the latest saved position, read through a ref so the
        // player is never recreated when `startAt` changes mid-playback
        // (e.g. the periodic video-progress refetch) — which previously
        // destroyed the player and paused the video every ~90 seconds.
        const resumeAt = startAtRef.current;
        if (resumeAt > 1) player.currentTime = resumeAt;
        // Force the control bar (including the seek bar) to be visible right
        // away instead of waiting for a mouse move event.
        container.dispatchEvent(new Event("mousemove"));
      });

      player.on("timeupdate", (): void => {
        if (!Number.isFinite(player.currentTime)) return;
        currentTimeRef.current = player.currentTime;
        const prevDuration = durationRef.current;
        durationRef.current = player.duration;
        if (!isScrubbing) setCustomTime(player.currentTime);
        if (player.duration > 0 && prevDuration <= 0) setCustomDuration(player.duration);
        if (prevDuration <= 0 && player.duration > 0) {
          renderQuestionMarkers();
        }
      });

      player.on("volumechange", (): void => {
        setIsMuted(player.muted);
        setVolume(player.volume);
      });

      player.on("qualitychange", (level: unknown): void => {
        // Show the weak-network toast once when quality drops to 360p or below.
        const num = Number(level);
        if (Number.isFinite(num) && num > 0 && num <= 360 && !weakToastShownRef.current) {
          weakToastShownRef.current = true;
          setWeakToastVisible(true);
        }
      });

      player.on("pause", (): void => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        saveProgress();
        if (posterEl) { posterEl.style.display = "block"; posterEl.style.opacity = "1"; }
      });

      player.on("play", (): void => {
        isPlayingRef.current = true;
        setIsPlaying(true);
        saveProgress();
        if (posterEl) { posterEl.style.display = ""; posterEl.style.opacity = ""; }
      });

      player.on("ended", (): void => {
        saveProgress();
        setTimeout((): void => { try { player.restart(); } catch { /**/ } }, 500);
        if (enableLessonCompleted) handleComplete();
      });

      player.on("error", function onError(): void { setLoading(false); });

      player.on("seeked", (): void => {
        if (isSeekingProgrammaticallyRef.current) {
          isSeekingProgrammaticallyRef.current = false;
          return;
        }
        saveProgress();
        // Only enforce question re-positioning while the video is actually
        // playing, so the initial YouTube setup seek cannot misfire questions.
        if (!isPlayingRef.current) return;
        const currentTime = player.currentTime;
        const activeQ = activeQuestionRef.current;
        if (activeQ) {
          const questionTimestamp = activeQ.event.timestamp;
          if (currentTime > questionTimestamp + 0.5) {
            isSeekingProgrammaticallyRef.current = true;
            player.currentTime = questionTimestamp;
            player.pause();
            return;
          }
        }
        // Anti-skip: pull the student back to the earliest unanswered REQUIRED
        // question they have jumped past, so mandatory questions can never be
        // skipped.
        const events = eventsRef.current;
        let target: number | null = null;
        for (const e of events) {
          if (e.type !== "QUESTION" || !e.enabled || !e.required) continue;
          if (answeredEventsRef.current.has(e.id)) continue;
          if (e.timestamp >= currentTime) continue;
          if (target === null || e.timestamp < target) target = e.timestamp;
        }
        if (target !== null) {
          // Fire the mandatory question immediately and pause the video so the
          // student cannot fast-forward past it without answering.
          const targetEvent = events.find(
            (e) => e.type === "QUESTION" && e.enabled && e.timestamp === target
              && !triggeredRef.current.has(e.id) && !answeredEventsRef.current.has(e.id),
          );
          if (targetEvent) {
            void fireQuestion(targetEvent);
          } else {
            isSeekingProgrammaticallyRef.current = true;
            player.currentTime = target;
          }
        }
      });

      player.on("ready", (): void => { renderQuestionMarkers(); });
    };

    createPlayer();
  }, [providerVideoId, enableLessonCompleted, handleComplete, renderQuestionMarkers, playerId, fireQuestion]);

  useEffect(() => {
    initPlayer();
    return (): void => {
      if (plyrRef.current) {
        try { (plyrRef.current as { destroy?: () => void }).destroy?.(); } catch { /* ignore */ }
        plyrRef.current = null;
      }
    };
  }, [initPlayer]);

  return (
    <>
      <link rel="preconnect" href="https://cdn.plyr.io" />
      <link rel="preconnect" href="https://www.youtube-nocookie.com" />
      <link rel="preconnect" href="https://img.youtube.com" />
      <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
      <style>{`
        .plyr__video-embed { position: relative; overflow: hidden; pointer-events: none; }
        .plyr__video-embed > * { pointer-events: auto; }
        .plyr__video-embed iframe { position: absolute; top: -50% !important; left: 0; width: 100%; height: 200% !important; border: 0; max-width: none; }
        .plyr__poster { background-size: cover !important; background-position: center center !important; z-index: 4 !important; transition: opacity 0.2s ease; }
        .plyr--paused .plyr__poster { display: block !important; opacity: 1 !important; visibility: visible !important; }
        .plyr--paused .plyr__video-embed { opacity: 0.99; }
        /* Hide Plyr's native control bar (we render our own below). */
        .plyr__controls { display: none !important; }

        /* ── Custom two-row control bar (AL-RAYAN identity) ─────────────── */
        .elb-ctrl { position: absolute !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 6; display: flex !important; flex-direction: column !important; gap: 8px !important; padding: 10px 10px 8px !important; border-radius: 0 0 16px 16px !important; background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.22) 55%, rgba(0,0,0,0.32) 100%) !important; backdrop-filter: blur(8px) !important; -webkit-backdrop-filter: blur(8px) !important; border-top: 1px solid rgba(255,255,255,0.06) !important; transition: opacity 0.3s ease, transform 0.3s ease !important; }
        .elb-ctrl.elb-ctrl-hidden { opacity: 0 !important; transform: translateY(10px) !important; pointer-events: none !important; }
        .elb-ctrl-row { display: flex !important; align-items: center !important; gap: 6px !important; min-width: 0 !important; }
        .elb-ctrl-btn { display: inline-flex !important; align-items: center !important; justify-content: center !important; width: 44px !important; height: 44px !important; min-width: 44px !important; border-radius: 12px !important; border: none !important; background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.92) !important; cursor: pointer !important; transition: background 0.2s, transform 0.1s !important; -webkit-tap-highlight-color: transparent !important; }
        .elb-ctrl-btn:hover, .elb-ctrl-btn:active { background: rgba(255,255,255,0.14) !important; }
        .elb-ctrl-btn svg { width: 22px !important; height: 22px !important; }
        .elb-ctrl-seek { position: relative !important; flex: 1 !important; min-width: 0 !important; height: 40px !important; display: flex !important; align-items: center !important; touch-action: none !important; cursor: pointer !important; }
        .elb-ctrl-seek input[type=range] { -webkit-appearance: none !important; appearance: none !important; width: 100% !important; height: 6px !important; border-radius: 999px !important; background: rgba(255,255,255,0.22) !important; outline: none !important; margin: 0 !important; cursor: pointer !important; }
        .elb-ctrl-seek input[type=range]::-webkit-slider-thumb { -webkit-appearance: none !important; appearance: none !important; width: 18px !important; height: 18px !important; border-radius: 50% !important; background: #f59e0b !important; border: 2px solid #fff !important; box-shadow: 0 1px 4px rgba(0,0,0,0.4) !important; cursor: pointer !important; }
        .elb-ctrl-seek input[type=range]::-moz-range-thumb { width: 18px !important; height: 18px !important; border-radius: 50% !important; background: #f59e0b !important; border: 2px solid #fff !important; cursor: pointer !important; }
        .elb-ctrl-time { font-size: 12px !important; font-variant-numeric: tabular-nums !important; color: rgba(255,255,255,0.9) !important; white-space: nowrap !important; letter-spacing: 0.3px !important; }
        .elb-ctrl-spacer { flex: 1 !important; }

        /* Volume controls: mute toggle + up/down steppers + thin slider */
        .elb-ctrl-volume { display: inline-flex !important; align-items: center !important; gap: 2px !important; padding: 0 4px !important; }
        .elb-ctrl-volume .elb-ctrl-btn { width: 36px !important; height: 36px !important; min-width: 36px !important; border-radius: 10px !important; }
        .elb-ctrl-volume .elb-ctrl-btn svg { width: 18px !important; height: 18px !important; }
        .elb-ctrl-volume-slider { width: 64px !important; display: flex !important; align-items: center !important; }
        .elb-ctrl-volume-slider input[type=range] { -webkit-appearance: none !important; appearance: none !important; width: 100% !important; height: 4px !important; border-radius: 999px !important; background: rgba(255,255,255,0.25) !important; outline: none !important; cursor: pointer !important; }
        .elb-ctrl-volume-slider input[type=range]::-webkit-slider-thumb { -webkit-appearance: none !important; appearance: none !important; width: 14px !important; height: 14px !important; border-radius: 50% !important; background: #f59e0b !important; border: 2px solid #fff !important; cursor: pointer !important; }
        .elb-ctrl-volume-slider input[type=range]::-moz-range-thumb { width: 14px !important; height: 14px !important; border-radius: 50% !important; background: #f59e0b !important; border: 2px solid #fff !important; cursor: pointer !important; }

        .elb-ctrl-quality-btn { display: inline-flex !important; align-items: center !important; gap: 4px !important; height: 40px !important; padding: 0 12px !important; border-radius: 12px !important; border: none !important; background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.92) !important; font-size: 12px !important; font-weight: 600 !important; cursor: pointer !important; transition: background 0.2s !important; -webkit-tap-highlight-color: transparent !important; }
        .elb-ctrl-quality-btn:hover, .elb-ctrl-quality-btn:active { background: rgba(255,255,255,0.14) !important; }
        .elb-ctrl-quality-btn svg { width: 18px !important; height: 18px !important; }

        /* ── Quality bottom sheet ───────────────────────────────────────── */
        .elb-quality-overlay { position: absolute !important; inset: 0 !important; z-index: 20; display: flex !important; align-items: flex-end !important; background: rgba(0,0,0,0.4) !important; }
        .elb-quality-sheet { width: 100% !important; max-height: 55% !important; overflow-y: auto !important; border-radius: 18px 18px 0 0 !important; background: rgba(16,22,38,0.96) !important; backdrop-filter: blur(20px) !important; -webkit-backdrop-filter: blur(20px) !important; border-top: 1px solid rgba(255,255,255,0.1) !important; padding: 12px 12px calc(env(safe-area-inset-bottom, 0px) + 12px) !important; }
        .elb-quality-sheet-title { font-size: 13px !important; font-weight: 700 !important; color: rgba(255,255,255,0.95) !important; text-align: center !important; margin-bottom: 8px !important; }
        .elb-quality-option { display: flex !important; align-items: center !important; justify-content: space-between !important; width: 100% !important; padding: 14px 14px !important; margin-bottom: 6px !important; border-radius: 12px !important; border: none !important; background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.9) !important; font-size: 14px !important; font-weight: 600 !important; text-align: right !important; cursor: pointer !important; transition: background 0.2s !important; -webkit-tap-highlight-color: transparent !important; }
        .elb-quality-option:hover, .elb-quality-option:active { background: rgba(255,255,255,0.12) !important; }
        .elb-quality-option.elb-quality-active { background: rgba(245,158,11,0.18) !important; color: #fbbf24 !important; }
        .elb-quality-option .elb-quality-check { color: #f59e0b !important; }

        /* ── Weak-network toast ─────────────────────────────────────────── */
        .elb-weak-toast { position: absolute !important; left: 50% !important; bottom: 96px !important; transform: translateX(-50%) !important; z-index: 25; width: min(92%, 360px) !important; border-radius: 16px !important; background: rgba(16,22,38,0.94) !important; backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important; border: 1px solid rgba(255,255,255,0.12) !important; box-shadow: 0 8px 30px rgba(0,0,0,0.4) !important; padding: 14px 16px !important; }
        .elb-weak-toast-title { font-size: 13px !important; font-weight: 700 !important; color: #fbbf24 !important; margin-bottom: 4px !important; }
        .elb-weak-toast-text { font-size: 12px !important; color: rgba(255,255,255,0.85) !important; line-height: 1.5 !important; margin-bottom: 10px !important; }
        .elb-weak-toast-actions { display: flex !important; gap: 8px !important; }
        .elb-weak-toast-btn { flex: 1 !important; padding: 10px !important; border-radius: 10px !important; border: none !important; font-size: 13px !important; font-weight: 700 !important; cursor: pointer !important; }
        .elb-weak-toast-btn-raise { background: #f59e0b !important; color: #0a0e1a !important; }
        .elb-weak-toast-btn-raise:hover { background: #fbbf24 !important; }
        .elb-weak-toast-btn-keep { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
        .elb-weak-toast-btn-keep:hover { background: rgba(255,255,255,0.16) !important; }

        /* ── Fullscreen (mobile + desktop) ─────────────────────────────── */
        /* Plyr requests fullscreen on its own container (#playerId = .plyr),
           so the crop must be fixed on .plyr:fullscreen, not the wrapper.
           The fullscreen layer fills the screen with a black background and
           letterboxes a 16:9 stage so the visible frame is IDENTICAL to
           normal mode — never cropped, never zoomed. */
        .plyr:fullscreen,
        .plyr--fullscreen-fallback {
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          max-height: none !important;
          aspect-ratio: auto !important;
          border-radius: 0 !important;
          overflow: hidden !important;
          background: #000 !important;
          position: fixed !important;
          inset: 0 !important;
          z-index: 2147483647 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        /* The embedded iframe becomes the 16:9 letterboxed stage. */
        .plyr:fullscreen iframe,
        .plyr--fullscreen-fallback iframe {
          position: relative !important;
          top: auto !important;
          left: auto !important;
          width: min(100vw, calc(100vh * 16 / 9)) !important;
          height: min(100vh, calc(100vw * 9 / 16)) !important;
          aspect-ratio: 16 / 9 !important;
          max-width: none !important;
          max-height: none !important;
          flex: none !important;
          border: 0 !important;
        }
        /* WebKit fullscreen (iOS Safari) — same letterboxing rules. */
        .plyr:-webkit-full-screen {
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          max-height: none !important;
          aspect-ratio: auto !important;
          border-radius: 0 !important;
          overflow: hidden !important;
          background: #000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .plyr:-webkit-full-screen iframe {
          position: relative !important;
          top: auto !important;
          left: auto !important;
          width: min(100vw, calc(100vh * 16 / 9)) !important;
          height: min(100vh, calc(100vw * 9 / 16)) !important;
          aspect-ratio: 16 / 9 !important;
          max-width: none !important;
          max-height: none !important;
          flex: none !important;
          border: 0 !important;
        }
        .plyr:fullscreen .plyr__controls,
        .plyr--fullscreen-fallback .plyr__controls,
        .plyr:-webkit-full-screen .plyr__controls {
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px) !important;
        }
        /* Keep overlays hidden while fullscreen is active so only the video
           + controls are visible (YouTube-style). */
        .plyr:fullscreen .elb-video-overlay,
        .plyr--fullscreen-fallback .elb-video-overlay,
        .plyr:-webkit-full-screen .elb-video-overlay { display: none !important; }
      `}</style>

      <div
        ref={rootRef}
        className="elb-video-root relative aspect-video w-full overflow-hidden rounded-2xl bg-black"
        onPointerDown={(): void => { bumpControls(); }}
        onTouchStart={(): void => { bumpControls(); }}
      >
        <div id={playerId} className="plyr__video-embed h-full w-full">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${providerVideoId}?controls=0&rel=0&iv_load_policy=3&playsinline=1&modestbranding=1&enablejsapi=1${typeof window !== "undefined" ? `&origin=${window.location.origin}` : ""}`}
            allowFullScreen
            allow="autoplay"
            title={lessonTitle ?? "Video lesson"}
          />
        </div>

        {loading && (
          <div className="elb-video-overlay absolute inset-0 flex items-center justify-center bg-neutral-900">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        )}

        {activeQuestion && (
          <div className="elb-video-overlay absolute inset-0 z-[60]">
            <VideoQuestionModal
              event={activeQuestion.event}
              question={activeQuestion.question}
              onComplete={handleQuestionComplete}
              onSkip={handleQuestionSkip}
            />
          </div>
        )}

        {completed && completedActionsRef.current && !activeQuestion && (
          <div className="elb-video-overlay absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-neutral-900/95 p-6">
            <div className="rounded-full bg-green-500/20 p-4">
              <svg className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-center text-2xl font-bold text-white">تم إكمال الدرس بنجاح!</h2>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {completedActionsRef.current.onNextLesson && (
                <button type="button" onClick={completedActionsRef.current.onNextLesson} className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-black transition-all hover:bg-amber-400">الدرس التالي</button>
              )}
              {completedActionsRef.current.onReviewQuestions && (
                <button type="button" onClick={completedActionsRef.current.onReviewQuestions} className="rounded-xl bg-neutral-800 px-6 py-3 text-white transition-all hover:bg-neutral-700">مراجعة الأسئلة</button>
              )}
              {completedActionsRef.current.onHomework && (
                <button type="button" onClick={completedActionsRef.current.onHomework} className="rounded-xl bg-neutral-800 px-6 py-3 text-white transition-all hover:bg-neutral-700">الواجب</button>
              )}
              <button type="button" onClick={(): void => { setCompleted(false); }} className="rounded-xl bg-neutral-800 px-6 py-3 text-white transition-all hover:bg-neutral-700">إعادة المشاهدة</button>
              {completedActionsRef.current.onBackToUnit && (
                <button type="button" onClick={completedActionsRef.current.onBackToUnit} className="rounded-xl bg-neutral-800 px-6 py-3 text-white transition-all hover:bg-neutral-700">العودة للوحدة</button>
              )}
            </div>
          </div>
        )}

        {!activeQuestion && (
          <>
            {/* Weak-network toast — shown once per video watch. */}
            {weakToastVisible && (
              <div className="elb-weak-toast">
                <div className="elb-weak-toast-title">سرعة الإنترنت منخفضة</div>
                <div className="elb-weak-toast-text">
                  تم تشغيل الفيديو بجودة 360p لتناسب سرعة الإنترنت.
                </div>
                <div className="elb-weak-toast-actions">
                  <button
                    type="button"
                    className="elb-weak-toast-btn elb-weak-toast-btn-raise"
                    onClick={(): void => { applyQuality("1080"); setWeakToastVisible(false); }}
                  >
                    رفع الجودة
                  </button>
                  <button
                    type="button"
                    className="elb-weak-toast-btn elb-weak-toast-btn-keep"
                    onClick={(): void => { setWeakToastVisible(false); }}
                  >
                    الاستمرار
                  </button>
                </div>
              </div>
            )}

            {/* Custom two-row control bar */}
            <div
              className={`elb-ctrl ${controlsVisible ? "" : "elb-ctrl-hidden"}`}
              onClick={(e): void => { e.stopPropagation(); }}
            >
              {/* Row 1: play/pause + seek (no time) */}
              <div className="elb-ctrl-row">
                <button
                  type="button"
                  className="elb-ctrl-btn"
                  aria-label={isPlaying ? "إيقاف" : "تشغيل"}
                  onClick={(): void => { togglePlay(); }}
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                <div className="elb-ctrl-seek">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(customDuration, 1)}
                    step={0.1}
                    value={Math.min(isScrubbing ? scrubValue : customTime, Math.max(customDuration, 1))}
                    onPointerDown={(): void => { setIsScrubbing(true); setControlsVisible(true); }}
                    onPointerUp={(e): void => { onSeekCommit(Number((e.target as HTMLInputElement).value)); }}
                    onKeyDown={(e): void => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") showControlsTemporarily(); }}
                    onChange={(e): void => { onSeekInput(Number(e.target.value)); }}
                    aria-label="شريط التقدم"
                  />
                </div>
              </div>

              {/* Row 2: volume controls + time + quality + fullscreen */}
              <div className="elb-ctrl-row">
                <div className="elb-ctrl-volume">
                  <button
                    type="button"
                    className="elb-ctrl-btn"
                    aria-label={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
                    onClick={(): void => { toggleMute(); }}
                  >
                    {isMuted || volume === 0 ? (
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                    )}
                  </button>
                  <button
                    type="button"
                    className="elb-ctrl-btn"
                    aria-label="خفض الصوت"
                    onClick={(): void => { volumeDown(); }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 9v6h4l5 5V4L9 9H5z" /></svg>
                  </button>
                  <div className="elb-ctrl-volume-slider">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={(e): void => { setVideoVolume(Number(e.target.value)); }}
                      aria-label="مستوى الصوت"
                    />
                  </div>
                  <button
                    type="button"
                    className="elb-ctrl-btn"
                    aria-label="رفع الصوت"
                    onClick={(): void => { volumeUp(); }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                  </button>
                </div>

                <span className="elb-ctrl-time" dir="ltr">
                  {formatTime(Math.floor(isScrubbing ? scrubValue : customTime))} / {formatTime(Math.floor(customDuration))}
                </span>

                <div className="elb-ctrl-spacer" />

                <button
                  type="button"
                  className="elb-ctrl-quality-btn"
                  onClick={(): void => { setQualityOpen((v) => !v); showControlsTemporarily(); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                  جودة
                </button>

                <button
                  type="button"
                  className="elb-ctrl-btn"
                  aria-label="ملء الشاشة"
                  onClick={(): void => { toggleFullscreen(); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                </button>
              </div>
            </div>

            {/* Quality bottom sheet */}
            {qualityOpen && (
              <div className="elb-quality-overlay" onClick={(): void => { setQualityOpen(false); }}>
                <div className="elb-quality-sheet" onClick={(e): void => { e.stopPropagation(); }}>
                  <div className="elb-quality-sheet-title">جودة الفيديو</div>
                  {QUALITY_OPTIONS.map((opt) => {
                    const active = quality === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`elb-quality-option ${active ? "elb-quality-active" : ""}`}
                        onClick={(): void => { applyQuality(opt.value); }}
                      >
                        <span>{opt.label}</span>
                        {active && (
                          <svg className="elb-quality-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Script
        src="https://cdn.plyr.io/3.7.8/plyr.polyfilled.js"
        strategy="afterInteractive"
        onLoad={initPlayer}
      />
    </>
  );
}

export function PlyrVideoPlayerSkeleton(): ReactNode {
  return <div className="aspect-video w-full animate-pulse rounded-2xl bg-neutral-800" />;
}
