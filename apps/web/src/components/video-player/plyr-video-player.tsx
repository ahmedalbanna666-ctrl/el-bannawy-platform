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

      const isMobile = isMobileViewport();
      const controls = isMobile
        ? ["play-large", "play", "progress", "current-time", "duration", "mute", "fullscreen"]
        : ["play-large", "play", "progress", "current-time", "duration", "mute", "volume", "fullscreen"];
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
        if (prevDuration <= 0 && player.duration > 0) {
          renderQuestionMarkers();
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
        .plyr__controls { position: absolute !important; bottom: 0 !important; left: 0 !important; right: 0 !important; background: linear-gradient(transparent, rgba(0,0,0,0.45)) !important; padding: 24px 8px 4px !important; display: flex !important; flex-wrap: wrap !important; align-items: center !important; gap: 0 !important; }
        .plyr__controls .plyr__progress { order: -1 !important; width: 100% !important; flex: 0 0 100% !important; margin-bottom: 4px !important; padding: 0 4px !important; }
        .plyr__controls .plyr__progress input[type=range] { height: 3px !important; cursor: pointer !important; }
        .plyr__controls .plyr__progress input[type=range]::-webkit-slider-thumb { width: 14px !important; height: 14px !important; border-radius: 50% !important; background: #f59e0b !important; border: 2px solid #fff !important; transform: scale(0); transition: transform 0.15s; }
        .plyr__controls .plyr__progress:hover input[type=range]::-webkit-slider-thumb { transform: scale(1); }
        .plyr__controls .plyr__time { font-size: 12px !important; color: rgba(255,255,255,0.8) !important; font-variant-numeric: tabular-nums !important; }
        .plyr__controls .plyr__time + .plyr__time::before { content: "/"; margin: 0 4px; }
        .plyr__controls .plyr__time + .plyr__time { margin-left: 0 !important; }
        .plyr__controls button { color: rgba(255,255,255,0.85) !important; opacity: 0.9 !important; transition: opacity 0.2s !important; }
        .plyr__controls button:hover { opacity: 1 !important; color: #f59e0b !important; }
        .plyr__controls .plyr__control--pressed { color: #f59e0b !important; }
        .plyr__controls [data-plyr="mute"] { margin-left: auto !important; }
        .plyr__controls [data-plyr="volume"] { width: 70px !important; }
        .plyr--youtube .plyr__controls { z-index: 5; }
        .plyr--video .plyr__controls { pointer-events: auto !important; }
        .plyr.plyr--hide-controls .plyr__controls { opacity: 0; pointer-events: none; transition: opacity 0.3s; }
        .plyr:not(.plyr--hide-controls) .plyr__controls { opacity: 1; }

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
