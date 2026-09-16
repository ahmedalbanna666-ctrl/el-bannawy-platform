"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Play, X } from "lucide-react";
import { useUiSettings } from "@/lib/use-ui-settings";

export function extractYoutubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const match = re.exec(trimmed);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function TutorialVideoButton(): ReactNode {
  const [open, setOpen] = useState(false);
  const { config } = useUiSettings();

  const videoId = config?.tutorialVideo?.enabled && config?.tutorialVideo?.youtubeUrl
    ? extractYoutubeId(config.tutorialVideo.youtubeUrl)
    : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return (): void => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const close = useCallback((): void => {
    setOpen(false);
  }, []);

  if (!videoId) return null;

  return (
    <>
      <button
        type="button"
        onClick={(): void => { setOpen(true); }}
        aria-haspopup="dialog"
        className="group mt-5 inline-flex items-center gap-3 rounded-full border border-primary-500/25 bg-white/60 py-2 pl-5 pr-2 backdrop-blur-sm transition-all hover:border-primary-500/50 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-primary-400/40 dark:hover:bg-white/[0.07]"
      >
        <span className="relative flex h-11 w-11 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full bg-primary-500/25 [animation-duration:1.8s]"
          />
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/30 transition-transform group-hover:scale-105" />
          <Play className="relative h-5 w-5 fill-white text-white" />
        </span>
        <span className="text-sm font-bold text-neutral-800 dark:text-white/90">
          شاهد طريقة تسجيل الدخول
        </span>
        <span className="rounded-full bg-primary-500/10 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:text-primary-300">
          فيديو
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="فيديو شرح تسجيل الدخول"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(e): void => { e.stopPropagation(); }}
          >
            <button
              type="button"
              onClick={close}
              aria-label="إغلاق الفيديو"
              className="absolute -top-11 left-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="aspect-video overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/20">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                title="شرح طريقة تسجيل الدخول بالفيديو"
                allow="autoplay; fullscreen"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
