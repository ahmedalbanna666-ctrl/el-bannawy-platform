"use client";

import { useEffect, useState, type ReactNode } from "react";

interface SplashScreenProps {
  readonly onFinish: () => void;
}

interface LetterConfig {
  readonly char: string;
  readonly left: number;
  readonly size: number;
  readonly duration: number;
  readonly delay: number;
  readonly opacity: number;
  readonly weight: number;
  readonly drift: number;
}

const LETTERS: readonly LetterConfig[] = [
  { char: "A", left: 5, size: 36, duration: 12, delay: -2, opacity: 0.12, weight: 600, drift: -24 },
  { char: "B", left: 15, size: 22, duration: 10, delay: -5, opacity: 0.09, weight: 500, drift: 20 },
  { char: "C", left: 85, size: 28, duration: 11, delay: -1, opacity: 0.11, weight: 600, drift: 18 },
  { char: "D", left: 92, size: 18, duration: 9, delay: -4, opacity: 0.08, weight: 500, drift: -14 },
  { char: "E", left: 22, size: 24, duration: 13, delay: -7, opacity: 0.1, weight: 600, drift: 26 },
  { char: "F", left: 30, size: 16, duration: 10, delay: -3, opacity: 0.08, weight: 400, drift: -18 },
  { char: "G", left: 70, size: 22, duration: 11, delay: -6, opacity: 0.1, weight: 500, drift: 14 },
  { char: "H", left: 60, size: 18, duration: 12, delay: -8, opacity: 0.08, weight: 500, drift: 22 },
  { char: "I", left: 40, size: 14, duration: 9, delay: -2, opacity: 0.07, weight: 400, drift: -12 },
  { char: "S", left: 48, size: 26, duration: 13, delay: -9, opacity: 0.11, weight: 600, drift: -26 },
  { char: "T", left: 78, size: 16, duration: 11, delay: -4, opacity: 0.08, weight: 500, drift: 16 },
  { char: "N", left: 10, size: 16, duration: 12, delay: -6, opacity: 0.07, weight: 400, drift: 20 },
];

const DEFAULT_LOGO = "/logo.jpeg";

const RING_BASE = 180;
const RIPPLE_DELAYS = [0, 1, 2];

function GlowEffect(): ReactNode {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
      <div
        className="absolute left-1/2 top-1/2 h-0 w-0"
        style={{ transform: "translate(-50%, -50%)" }}
      >
        <div
          className="absolute rounded-full"
          style={{
            left: -60,
            top: -60,
            width: 120,
            height: 120,
            background: "rgba(34, 211, 238, 0.12)",
            filter: "blur(24px)",
            animation: "splash-pulse 3s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            left: -100,
            top: -100,
            width: 200,
            height: 200,
            background: "radial-gradient(circle, rgba(34,211,238,0.14) 0%, rgba(99,102,241,0.06) 50%, transparent 75%)",
            animation: "splash-pool 4s linear infinite",
          }}
        />
        {RIPPLE_DELAYS.map((delay, index) => (
          <div
            key={index}
            className="absolute rounded-full border border-cyan-300/30"
            style={{
              left: -(RING_BASE / 2),
              top: -(RING_BASE / 2),
              width: RING_BASE,
              height: RING_BASE,
              boxShadow: "inset 0 0 18px rgba(34, 211, 238, 0.08)",
              animation: `splash-ripple 4s cubic-bezier(0, 0.4, 0.4, 1) ${String(-delay)}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

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
    const id = setTimeout((): void => { setPhase("exit"); }, 2200);
    return (): void => { clearTimeout(id); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") return;
    const id = setTimeout((): void => {
      setShow(false);
      onFinish();
    }, 300);
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
      className={`pointer-events-none fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-300 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "var(--ui-splash-bg, linear-gradient(135deg, #312e81, #4c1d95))" }}
    >
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        {LETTERS.map((letter) => (
          <span
            key={letter.char}
            className="splash-letter absolute select-none"
            style={{
              left: `${String(letter.left)}%`,
              bottom: "-2rem",
              fontSize: String(letter.size) + "px",
              fontWeight: letter.weight,
              fontFamily: "var(--font-ui-english, Inter, sans-serif)",
              color: "white",
              opacity: letter.opacity,
              ["--letter-opacity" as string]: String(letter.opacity),
              ["--letter-drift" as string]: String(letter.drift) + "px",
              animation: `splash-letter-rise ${String(letter.duration)}s linear ${String(letter.delay)}s infinite`,
            }}
          >
            {letter.char}
          </span>
        ))}
      </div>

      <GlowEffect />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div
          className={`mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-[24px] bg-white p-2 shadow-2xl transition-all duration-600 ${
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
          className={`relative z-10 mb-2 text-3xl font-bold text-white transition-all delay-100 duration-600 ${
            phase === "enter" ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          البناوي
        </h1>

        <div
          className={`relative z-10 flex items-center gap-2 transition-all delay-200 duration-600 ${
            phase === "enter" ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <span className="h-px w-6 bg-white/30" />
          <span className="text-xs tracking-[0.3em] text-white/60">EL-BANNAWY</span>
          <span className="h-px w-6 bg-white/30" />
        </div>

        <p
          className={`relative z-10 mt-5 text-[11px] tracking-widest text-white/40 transition-all delay-300 duration-600 ${
            phase === "enter" ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          AI-POWERED ENGLISH LEARNING
        </p>

        <div className="mt-7 flex items-center gap-2" aria-hidden="true">
          <span
            className="h-1.5 w-1.5 rounded-full bg-white"
            style={{ animation: "splash-pulse 1.2s ease-in-out infinite" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-white"
            style={{ animation: "splash-pulse 1.2s ease-in-out 0.2s infinite" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-white"
            style={{ animation: "splash-pulse 1.2s ease-in-out 0.4s infinite" }}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-[5] h-24 bg-gradient-to-t from-black/20 to-transparent" />
    </div>
  );
}
