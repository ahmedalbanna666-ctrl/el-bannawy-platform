"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import Script from "next/script";
import { api } from "@/lib/api-client";
import { useUiSettings } from "@/lib/use-ui-settings";
import { lockLandscape, lockPortrait } from "@/hooks/use-screen-orientation";
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

function isDocumentFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitIsFullScreen?: boolean;
  };
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement ?? doc.webkitIsFullScreen ?? false);
}

/** Request fullscreen on a specific element (with WebKit fallback). */
function requestFullscreenOn(el: HTMLElement): Promise<void> {
  const node = el as HTMLElement & {
    webkitRequestFullscreen?: () => void;
  };
  try {
    if (typeof node.requestFullscreen === "function") {
      return node.requestFullscreen().catch(() => undefined);
    }
  } catch {
    // fall through to WebKit variant
  }
  try {
    if (node.webkitRequestFullscreen) {
      node.webkitRequestFullscreen();
      return Promise.resolve();
    }
  } catch {
    // ignore
  }
  return Promise.resolve();
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
  const { config: uiConfig } = useUiSettings();
  const showThumbnails = uiConfig?.videoThumbnails.enabled ?? true;
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
    const root = rootRef.current;
    if (!root) return;
    if (isDocumentFullscreen()) {
      void document.exitFullscreen().catch(() => undefined);
      lockPortrait();
    } else {
      // Enter fullscreen on the FULL container (which contains the custom
      // control bar), not on Plyr's internal embed container — otherwise the
      // controls stay behind and the video is letterboxed inside the screen.
      void requestFullscreenOn(root);
      // Force landscape (left or right) immediately — the video fills the
      // screen horizontally the moment fullscreen is entered, on phones and
      // tablets alike. Portrait is restored on exit.
      window.setTimeout(lockLandscape, 150);
    }
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Keep the video locked to landscape while fullscreen is active and restore
  // the platform portrait lock as soon as fullscreen is exited (including the
  // browser's own exit: ESC, swipe-back, etc.).
  useEffect(() => {
    const onFullscreenChange = (): void => {
      if (isDocumentFullscreen()) {
        window.setTimeout(lockLandscape, 150);
      } else {
        lockPortrait();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return (): void => { document.removeEventListener("fullscreenchange", onFullscreenChange); };
  }, []);

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
    // Pause the timeline checker IMMEDIATELY (before the async fetch) so a
    // concurrent checkTimelineEvents tick cannot fire a LATER question while
    // this one is still loading. This is what caused the player to jump to
    // the last question instead of the earliest unanswered one.
    isPausedForQuestionRef.current = true;

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
      isPausedForQuestionRef.current = false;
      return;
    }

    const plyr = plyrRef.current as { currentTime: number; pause?: () => void } | null;
    if (plyr) {
      isSeekingProgrammaticallyRef.current = true;
      plyr.currentTime = event.timestamp;
      plyr.pause?.();
    }

    const questionState = { event, question };
    activeQuestionRef.current = questionState;
    setActiveQuestion(questionState);
    // The question modal is rendered INSIDE `.elb-video-root`, so it stays
    // visible on top of the fullscreen video — do not exit fullscreen here.
  }, []);

  const checkTimelineEvents = useCallback(async (): Promise<void> => {
    const events = eventsRef.current;
    const currentTime = currentTimeRef.current;
    // Do not fire timeline questions before playback actually starts, and
    // guard against non-finite values that YouTube can report before the API
    // is ready (which previously caused questions to pop at the very start).
    if (events.length === 0 || isPausedForQuestionRef.current || !isPlayingRef.current) return;
    if (!Number.isFinite(currentTime) || currentTime <= 0) return;

    // Find the EARLIEST (chronologically first) enabled question that the
    // student has already reached but not yet answered. This guarantees the
    // student answers surprise questions in order, never skipping ahead.
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    for (const event of sorted) {
      if (!event.enabled || event.type !== "QUESTION") continue;
      if (triggeredRef.current.has(event.id)) continue;
      if (answeredEventsRef.current.has(event.id)) continue;
      if (currentTime < event.timestamp) continue;
      await fireQuestion(event);
      return;
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
            // Sort chronologically so the "first unanswered question" logic is
            // deterministic regardless of the API order.
            eventsRef.current = [...res.data].sort((a, b) => a.timestamp - b.timestamp);
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
      // CSS below). Plyr's native controls are disabled entirely, and we
      // disable Plyr's own fullscreen management so it never fights our
      // native fullscreen on the outer container (otherwise entering
      // fullscreen opens and immediately closes).
      const controls: string[] = [];
      const player = new Plyr(container, {
        controls,
        fullscreen: { enabled: false },
        youtube: {
          noCookie: true,
          rel: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          controls: 0,
          fs: 0,
          cc_load_policy: 0,
        },
        poster: showThumbnails ? `https://img.youtube.com/vi/${providerVideoId}/maxresdefault.jpg` : "",
        ratio: "16:9",
        resetOnEnd: true,
        clickToPlay: true,
        hideControls: true,
        tooltips: { controls: true, seek: true },
      });

      // Fullscreen is managed entirely by our own native implementation on
      // `.elb-video-root` (see `toggleFullscreen`). Plyr's own fullscreen is
      // disabled (fullscreen.enabled: false) so it cannot open-and-close
      // fullscreen right after entering.

      plyrRef.current = player;
      const posterEl = container.querySelector<HTMLElement>(".plyr__poster");

      player.on("ready", (): void => {
        setLoading(false);
        // Ensure the video is NOT muted on start (browsers sometimes default
        // to muted for iframe embeds without user gesture).
        try {
          player.muted = false;
          if (typeof player.volume === "number") player.volume = 1;
        } catch { /* ignore */ }
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
        // Anti-skip: pull the student back to the EARLIEST unanswered REQUIRED
        // question they have jumped past, so mandatory questions are answered
        // strictly in chronological order — never skipped, never jumping to a
        // later question.
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
          // events is sorted ascending, so the first match is the earliest.
          const targetEvent: VideoEvent | undefined = events.find(
            (e) => e.type === "QUESTION" && e.enabled && e.timestamp === target
              && !answeredEventsRef.current.has(e.id),
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
  }, [providerVideoId, enableLessonCompleted, handleComplete, renderQuestionMarkers, playerId, fireQuestion, showThumbnails]);

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
        .plyr__video-embed iframe { pointer-events: none !important; }
        .plyr__video-embed iframe { position: absolute; top: -50% !important; left: 0; width: 100%; height: 200% !important; border: 0; max-width: none; }
        .plyr__poster { background-size: cover !important; background-position: center center !important; z-index: 4 !important; transition: opacity 0.2s ease; }
        .plyr--paused .plyr__poster { display: block !important; opacity: 1 !important; visibility: visible !important; }
        .plyr--paused .plyr__video-embed { opacity: 0.99; }
        /* Hide Plyr's native control bar (we render our own below). */
        .plyr__controls { display: none !important; }

        /* ── Custom two-row control bar (AL-RAYAN identity) ─────────────── */
        .elb-ctrl { position: absolute !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 6; display: flex !important; flex-direction: column !important; gap: 6px !important; padding: 8px 8px 6px !important; border-radius: 0 0 16px 16px !important; background: transparent !important; transition: opacity 0.3s ease, transform 0.3s ease !important; }
        .elb-ctrl.elb-ctrl-hidden { opacity: 0 !important; transform: translateY(10px) !important; pointer-events: none !important; }
        .elb-ctrl-row { display: flex !important; align-items: center !important; gap: 4px !important; min-width: 0 !important; }
        .elb-ctrl-btn { display: inline-flex !important; align-items: center !important; justify-content: center !important; width: 36px !important; height: 36px !important; min-width: 36px !important; border-radius: 10px !important; border: none !important; background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.92) !important; cursor: pointer !important; transition: background 0.2s, transform 0.1s !important; -webkit-tap-highlight-color: transparent !important; }
        .elb-ctrl-btn:hover, .elb-ctrl-btn:active { background: rgba(255,255,255,0.14) !important; }
        .elb-ctrl-btn svg { width: 18px !important; height: 18px !important; }
        .elb-ctrl-seek { position: relative !important; flex: 1 !important; min-width: 0 !important; height: 30px !important; display: flex !important; align-items: center !important; touch-action: none !important; cursor: pointer !important; }
        .elb-ctrl-seek input[type=range] { -webkit-appearance: none !important; appearance: none !important; width: 100% !important; height: 5px !important; border-radius: 999px !important; background: rgba(255,255,255,0.22) !important; outline: none !important; margin: 0 !important; cursor: pointer !important; }
        .elb-ctrl-seek input[type=range]::-webkit-slider-thumb { -webkit-appearance: none !important; appearance: none !important; width: 15px !important; height: 15px !important; border-radius: 50% !important; background: #f59e0b !important; border: 2px solid #fff !important; box-shadow: 0 1px 4px rgba(0,0,0,0.4) !important; cursor: pointer !important; }
        .elb-ctrl-seek input[type=range]::-moz-range-thumb { width: 15px !important; height: 15px !important; border-radius: 50% !important; background: #f59e0b !important; border: 2px solid #fff !important; cursor: pointer !important; }
        .elb-ctrl-time { font-size: 11px !important; font-variant-numeric: tabular-nums !important; color: rgba(255,255,255,0.9) !important; white-space: nowrap !important; letter-spacing: 0.3px !important; }

        .elb-ctrl-quality-btn { display: inline-flex !important; align-items: center !important; gap: 3px !important; height: 32px !important; padding: 0 8px !important; border-radius: 10px !important; border: none !important; background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.92) !important; font-size: 11px !important; font-weight: 600 !important; cursor: pointer !important; transition: background 0.2s !important; -webkit-tap-highlight-color: transparent !important; }
        .elb-ctrl-quality-btn:hover, .elb-ctrl-quality-btn:active { background: rgba(255,255,255,0.14) !important; }
        .elb-ctrl-quality-btn svg { width: 15px !important; height: 15px !important; }

        /* Large center play button */
        .elb-center-play { display: inline-flex !important; align-items: center !important; justify-content: center !important; width: 76px !important; height: 76px !important; border-radius: 50% !important; border: none !important; background: rgba(245,158,11,0.92) !important; color: #0a0e1a !important; cursor: pointer !important; box-shadow: 0 8px 30px rgba(0,0,0,0.45) !important; transition: transform 0.15s ease, background 0.2s ease !important; -webkit-tap-highlight-color: transparent !important; }
        .elb-center-play:hover, .elb-center-play:active { transform: scale(1.06) !important; background: #fbbf24 !important; }
        .elb-center-play svg { width: 34px !important; height: 34px !important; margin-left: 3px !important; }
        @media (max-width: 768px) {
          .elb-center-play { width: 64px !important; height: 64px !important; }
          .elb-center-play svg { width: 28px !important; height: 28px !important; }
        }

        /* Smaller, denser controls on phones. */
        @media (max-width: 768px) {
          .elb-ctrl { gap: 5px !important; padding: 6px 6px 4px !important; }
          .elb-ctrl-row { gap: 3px !important; }
          .elb-ctrl-btn { width: 32px !important; height: 32px !important; min-width: 32px !important; border-radius: 9px !important; }
          .elb-ctrl-btn svg { width: 16px !important; height: 16px !important; }
          .elb-ctrl-seek { height: 26px !important; }
          .elb-ctrl-quality-btn { height: 28px !important; padding: 0 6px !important; font-size: 10px !important; }
          .elb-ctrl-quality-btn svg { width: 13px !important; height: 13px !important; }
          .elb-ctrl-time { font-size: 10px !important; }
        }

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
        /* We enter fullscreen on the FULL container (.elb-video-root) so the
           custom control bar stays visible above the video. The container
           fills the viewport edge-to-edge with a black background and the
           16:9 embed stage is centered inside it (contain) — the video always
           keeps its correct aspect ratio and never overflows the screen.
           The iframe uses Plyr's standard top:-50%; height:200% cropping so
           only the actual video is visible and no YouTube chrome (logo,
           buttons, metadata) appears. */
        .elb-video-root:fullscreen,
        .elb-video-root:-webkit-full-screen {
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
        /* The video fills the FULL screen width (100vw) — no leftover gaps on
           the sides — while keeping its 16:9 aspect ratio in height. The
           stage is centered vertically by the parent flex container. On
           screens wider than 16:9 the tiny vertical overflow is clipped by
           the parent (overflow:hidden) instead of leaving side gaps. */
        .elb-video-root:fullscreen .plyr__video-embed,
        .elb-video-root:-webkit-full-screen .plyr__video-embed {
          position: relative !important;
          width: 100vw !important;
          height: calc(100vw * 9 / 16) !important;
          max-width: none !important;
          max-height: none !important;
          aspect-ratio: auto !important;
          overflow: hidden !important;
          flex: none !important;
          background: #000 !important;
        }
        /* Crop the YouTube embed to the video only (Plyr's approach). */
        .elb-video-root:fullscreen .plyr__video-embed iframe,
        .elb-video-root:-webkit-full-screen .plyr__video-embed iframe {
          position: absolute !important;
          top: -50% !important;
          left: 0 !important;
          width: 100% !important;
          height: 200% !important;
          max-width: none !important;
          max-height: none !important;
          border: 0 !important;
        }
        /* The custom control bar sits on top inside fullscreen. */
        .elb-video-root:fullscreen .elb-ctrl,
        .elb-video-root:-webkit-full-screen .elb-ctrl {
          position: absolute !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          border-radius: 0 !important;
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px) !important;
        }
        /* Keep non-question overlays hidden while fullscreen is active so only
           the video + controls are visible (YouTube-style). The question
           overlay must stay visible — questions pop mid-fullscreen. */
        .elb-video-root:fullscreen .elb-video-overlay:not(.elb-question-overlay),
        .elb-video-root:-webkit-full-screen .elb-video-overlay:not(.elb-question-overlay) { display: none !important; }
        /* Neutralize any Plyr fullscreen rules that might conflict. */
        .plyr:fullscreen .plyr__video-embed,
        .plyr--fullscreen-fallback .plyr__video-embed,
        .plyr:-webkit-full-screen .plyr__video-embed {
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        .plyr:fullscreen .plyr__video-embed iframe,
        .plyr--fullscreen-fallback .plyr__video-embed iframe,
        .plyr:-webkit-full-screen .plyr__video-embed iframe {
          top: -50% !important;
          left: 0 !important;
          width: 100% !important;
          height: 200% !important;
        }
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
            allow="autoplay; fullscreen"
            title={lessonTitle ?? "Video lesson"}
          />
        </div>

        {loading && (
          <div className="elb-video-overlay absolute inset-0 flex items-center justify-center bg-neutral-900">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        )}

        {/* Large center play/pause button */}
        {!loading && !activeQuestion && !completed && !isPlaying && (
          <div className="absolute inset-0 z-[5] flex items-center justify-center">
            <button
              type="button"
              aria-label="تشغيل الفيديو"
              onClick={(): void => { togglePlay(); }}
              className="elb-center-play"
            >
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </button>
          </div>
        )}

        {activeQuestion && (
          <div className="elb-video-overlay elb-question-overlay absolute inset-0 z-[60]">
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

            {/* Custom single-layer control bar (full width) */}
            <div
              className={`elb-ctrl ${controlsVisible ? "" : "elb-ctrl-hidden"}`}
              onClick={(e): void => { e.stopPropagation(); }}
            >
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

                <span className="elb-ctrl-time" dir="ltr">
                  {formatTime(Math.floor(isScrubbing ? scrubValue : customTime))} / {formatTime(Math.floor(customDuration))}
                </span>

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
