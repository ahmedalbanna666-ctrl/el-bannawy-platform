"use client";

import { useEffect, useState, type ReactNode } from "react";

interface SplashScreenProps {
  readonly onFinish: () => void;
}

const DEFAULT_LOGO = "/logo.jpeg";

export function SplashScreen({ onFinish }: SplashScreenProps): ReactNode {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const [show, setShow] = useState(true);
  const [logoSrc, setLogoSrc] = useState(DEFAULT_LOGO);

  useEffect(() => {
    const id = setTimeout((): void => { setPhase("show"); }, 60);
    return (): void => { clearTimeout(id); };
  }, []);

  useEffect(() => {
    if (phase !== "show") return;
    const id = setTimeout((): void => { setPhase("exit"); }, 1200);
    return (): void => { clearTimeout(id); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") return;
    const id = setTimeout((): void => {
      setShow(false);
      onFinish();
    }, 400);
    return (): void => { clearTimeout(id); };
  }, [phase, onFinish]);

  useEffect(() => {
    try {
      const value = getComputedStyle(document.documentElement).getPropertyValue("--ui-splash-logo").trim();
      if (value && value !== "none") setLogoSrc(value);
    } catch { /* ignore */ }
  }, []);

  if (!show) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-400 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "var(--ui-splash-bg, linear-gradient(135deg, #312e81, #4c1d95))" }}
    >
      <div
        className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.3) 0%, transparent 70%)",
          animation: "splash-pulse 2s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div
          className={`mb-7 flex h-28 w-28 items-center justify-center overflow-hidden rounded-[24px] bg-white p-2 shadow-2xl transition-all duration-500 ${
            phase === "enter" ? "translate-y-6 scale-75 opacity-0" : "translate-y-0 scale-100 opacity-100"
          }`}
        >
          <img
            src={logoSrc}
            alt="El-bannawy"
            className="h-full w-full rounded-[18px] object-contain"
            width={112}
            height={112}
          />
        </div>

        <h1
          className={`relative z-10 mb-2 text-3xl font-bold text-white transition-all delay-100 duration-500 ${
            phase === "enter" ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          البناوي
        </h1>

        <div
          className={`relative z-10 flex items-center gap-2 transition-all delay-200 duration-500 ${
            phase === "enter" ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <span className="h-px w-6 bg-white/30" />
          <span className="text-xs tracking-[0.3em] text-white/60">EL-BANNAWY</span>
          <span className="h-px w-6 bg-white/30" />
        </div>

        <div className="mt-8 flex items-center gap-2" aria-hidden="true">
          <span
            className="h-1.5 w-1.5 rounded-full bg-white"
            style={{ animation: "splash-pulse 1s ease-in-out infinite" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-white"
            style={{ animation: "splash-pulse 1s ease-in-out 0.2s infinite" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-white"
            style={{ animation: "splash-pulse 1s ease-in-out 0.4s infinite" }}
          />
        </div>
      </div>
    </div>
  );
}
