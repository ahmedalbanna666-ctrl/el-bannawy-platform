"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt(): ReactNode {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    if (isStandalone || isIos) return;

    const handler = (e: Event): void => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return (): void => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (dismissed) return null;

  const handleInstall = (): void => {
    if (!deferredPrompt) return;
    void deferredPrompt.prompt();
    void deferredPrompt.userChoice.then((result) => {
      if (result.outcome === "accepted") {
        setDeferredPrompt(null);
      }
      setDeferredPrompt(null);
    });
  };

  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
          <Download className="h-5 w-5 text-primary-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            ثبّت منصة البناوي
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            ثبّت التطبيق على جهازك للوصول السريع وتجربة أفضل
          </p>
        </div>
        <button
          onClick={(): void => { setDismissed(true); }}
          className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" className="flex-1" onClick={handleInstall}>
          <Download className="ml-1.5 h-4 w-4" />
          تثبيت التطبيق
        </Button>
        <Button size="sm" variant="ghost" onClick={(): void => { setDismissed(true); }}>
          لاحقاً
        </Button>
      </div>
    </div>
  );
}
