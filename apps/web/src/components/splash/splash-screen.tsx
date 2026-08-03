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
  { char: "A", left: 4, size: 44, duration: 13, delay: -2, opacity: 0.16, weight: 700, drift: -30 },
  { char: "B", left: 11, size: 26, duration: 11, delay: -5, opacity: 0.12, weight: 600, drift: 26 },
  { char: "C", left: 88, size: 34, duration: 12, delay: -1, opacity: 0.15, weight: 700, drift: 20 },
  { char: "D", left: 94, size: 22, duration: 10, delay: -4, opacity: 0.11, weight: 500, drift: -18 },
  { char: "E", left: 18, size: 30, duration: 14, delay: -8, opacity: 0.13, weight: 700, drift: 34 },
  { char: "F", left: 26, size: 20, duration: 10.5, delay: -3, opacity: 0.1, weight: 500, drift: -24 },
  { char: "G", left: 72, size: 28, duration: 11.5, delay: -6, opacity: 0.13, weight: 600, drift: 18 },
  { char: "H", left: 62, size: 22, duration: 13.5, delay: -9, opacity: 0.1, weight: 500, drift: 30 },
  { char: "I", left: 36, size: 18, duration: 9.5, delay: -2, opacity: 0.09, weight: 400, drift: -16 },
  { char: "J", left: 46, size: 26, duration: 12.5, delay: -7, opacity: 0.12, weight: 600, drift: 22 },
  { char: "K", left: 55, size: 18, duration: 10, delay: -1, opacity: 0.1, weight: 500, drift: -28 },
  { char: "L", left: 80, size: 24, duration: 11, delay: -5, opacity: 0.11, weight: 600, drift: 20 },
  { char: "M", left: 8, size: 20, duration: 9, delay: -0.5, opacity: 0.09, weight: 600, drift: -14 },
  { char: "N", left: 30, size: 16, duration: 13, delay: -4, opacity: 0.08, weight: 400, drift: 26 },
  { char: "O", left: 66, size: 16, duration: 10.5, delay: -8, opacity: 0.08, weight: 400, drift: -20 },
  { char: "P", left: 14, size: 14, duration: 12, delay: -6, opacity: 0.08, weight: 500, drift: 16 },
  { char: "Q", left: 92, size: 20, duration: 13.5, delay: -3, opacity: 0.1, weight: 600, drift: -26 },
  { char: "R", left: 24, size: 24, duration: 9.5, delay: -9, opacity: 0.11, weight: 600, drift: 24 },
  { char: "S", left: 50, size: 30, duration: 14, delay: -10, opacity: 0.14, weight: 700, drift: -34 },
  { char: "T", left: 40, size: 20, duration: 12, delay: -2, opacity: 0.1, weight: 500, drift: 18 },
  { char: "U", left: 84, size: 18, duration: 9, delay: -7, opacity: 0.09, weight: 500, drift: -16 },
  { char: "V", left: 58, size: 24, duration: 11.5, delay: -5, opacity: 0.11, weight: 600, drift: 28 },
  { char: "W", left: 76, size: 20, duration: 13, delay: -8, opacity: 0.1, weight: 500, drift: -22 },
];

const DEFAULT_LOGO = "/logo.jpeg";

const RING_BASE = 208;
const RIPPLE_DELAYS = [0, 0.8, 1.6, 2.4, 3.2];

function RippleRings(): ReactNode {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-0 w-0">
        <div
          className="absolute rounded-full"
          style={{
            left: -80,
            top: -80,
            width: 160,
            height: 160,
            background: "rgba(34, 211, 238, 0.14)",
            filter: "blur(28px)",
            animation: "splash-pulse 3s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            left: -128,
            top: -128,
            width: 256,
            height: 256,
            background: "radial-gradient(circle, rgba(34,211,238,0.18) 0%, rgba(99,102,241,0.08) 45%, transparent 72%)",
            animation: "splash-pool 4s linear infinite",
          }}
        />
        {RIPPLE_DELAYS.map((delay, index) => (
          <div
            key={index}
            className="absolute rounded-full border border-cyan-300/40"
            style={{
              left: -(RING_BASE / 2),
              top: -(RING_BASE / 2),
              width: RING_BASE,
              height: RING_BASE,
              boxShadow: "inset 0 0 24px rgba(34, 211, 238, 0.12)",
              animation: `splash-ripple 4s cubic-bezier(0, 0.4, 0.4, 1) ${String(-delay)}s infinite`,
            }}
          />
        ))}
        <div
          className="absolute rounded-full"
          style={{
            left: -4,
            top: -80,
            width: 8,
            height: 8,
            background: "rgba(165, 243, 252, 0.9)",
            boxShadow: "0 0 14px rgba(34, 211, 238, 0.8)",
            animation: "splash-drop 4s ease-in infinite",
          }}
        />
      </div>
    </div>
  );
}

export function SplashScreen({ onFinish }: SplashScreenProps): ReactNode {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const [show, setShow] = useState(true);
  const [logoSrc, setLogoSrc] = useState(DEFAULT_LOGO);

  useEffect(() => {
    const id = setTimeout((): void => { setPhase("show"); }, 100);
    return (): void => { clearTimeout(id); };
  }, []);

  useEffect(() => {
    if (phase !== "show") return;
    const id = setTimeout((): void => { setPhase("exit"); }, 2400);
    return (): void => { clearTimeout(id); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") return;
    const id = setTimeout((): void => {
      setShow(false);
      onFinish();
    }, 600);
    return (): void => { clearTimeout(id); };
  }, [phase, onFinish]);

  useEffect(() => {
    const read = (): void => {
      const value = getComputedStyle(document.documentElement).getPropertyValue("--ui-splash-logo").trim();
      setLogoSrc(value && value !== "none" ? value : DEFAULT_LOGO);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return (): void => { observer.disconnect(); };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
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
              bottom: "-3rem",
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

      <RippleRings />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div
          className={`mb-7 flex h-32 w-32 items-center justify-center overflow-hidden rounded-[28px] bg-white p-2 shadow-2xl transition-all duration-700 ${
            phase === "enter" ? "translate-y-8 scale-50 opacity-0" : "translate-y-0 scale-100 opacity-100"
          }`}
        >
          <img
            src={logoSrc}
            alt="El-bannawy"
            className="h-full w-full rounded-[20px] object-contain"
          />
        </div>

        <h1
          className={`relative z-10 mb-2 text-4xl font-bold text-white transition-all delay-200 duration-700 ${
            phase === "enter" ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          البناوي
        </h1>

        <div
          className={`relative z-10 flex items-center gap-2 transition-all delay-300 duration-700 ${
            phase === "enter" ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <span className="h-px w-8 bg-white/30" />
          <span className="text-sm tracking-[0.3em] text-white/60">EL-BANNAWY</span>
          <span className="h-px w-8 bg-white/30" />
        </div>

        <p
          className={`relative z-10 mt-6 text-xs tracking-widest text-white/40 transition-all delay-500 duration-700 ${
            phase === "enter" ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          AI-POWERED ENGLISH LEARNING
        </p>

        <div className="mt-8 flex items-center gap-2" aria-hidden="true">
          <span
            className="splash-dot h-1.5 w-1.5 rounded-full bg-white"
            style={{ animation: "splash-pulse 1.2s ease-in-out infinite" }}
          />
          <span
            className="splash-dot h-1.5 w-1.5 rounded-full bg-white"
            style={{ animation: "splash-pulse 1.2s ease-in-out 0.2s infinite" }}
          />
          <span
            className="splash-dot h-1.5 w-1.5 rounded-full bg-white"
            style={{ animation: "splash-pulse 1.2s ease-in-out 0.4s infinite" }}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-[5] h-32 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}
