"use client";

import { useEffect, useState, type ReactNode } from "react";

const VISITED_KEY = "el-bannawy-visited";

export function WelcomeNotification(): ReactNode {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem(VISITED_KEY);
    if (!visited) {
      const timer = setTimeout((): void => {
        setVisible(true);
        void requestAnimationFrame((): void => {
          void requestAnimationFrame((): void => { setEntered(true); });
        });
      }, 4000);
      return (): void => { clearTimeout(timer); };
    }
  }, []);

  const handleDismiss = (): void => {
    localStorage.setItem(VISITED_KEY, "true");
    setEntered(false);
    setTimeout((): void => { setVisible(false); }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 transition-all duration-500 ${
        entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="rounded-2xl border border-white/10 bg-neutral-900/95 p-5 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <span className="text-sm font-bold text-white">EB</span>
          </div>
          <div>
            <h3 className="font-bold text-white">مرحبًا بك في البناوي</h3>
            <p className="text-xs text-neutral-400">EL-BANNAWY PLATFORM</p>
          </div>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-neutral-300">
          منصتك الذكية لتعلم اللغة الإنجليزية بالذكاء الاصطناعي. استمتع بدروس تفاعلية،
          ومتابعة ذكية لتقدمك، وتجربة تعليمية مخصصة لك.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-bold text-white transition-all hover:from-indigo-400 hover:to-purple-500"
        >
          ابدأ الرحلة
        </button>
      </div>
    </div>
  );
}
