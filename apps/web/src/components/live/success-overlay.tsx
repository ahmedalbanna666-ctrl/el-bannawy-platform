"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Full-screen success celebration overlay shown after a booking is confirmed. */
export function SuccessOverlay({
  open,
  onDone,
  title,
  subtitle,
}: {
  open: boolean;
  onDone: () => void;
  title: string;
  subtitle?: string;
}): ReactNode {
  const [visible, setVisible] = useState(false);
  const [leave, setLeave] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setLeave(false);
      const t = setTimeout(() => { setLeave(true); }, 1600);
      const hide = setTimeout(() => { setVisible(false); }, 2300);
      return (): void => {
        clearTimeout(t);
        clearTimeout(hide);
      };
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open || !visible || !leave) return;
    const t = setTimeout(() => { onDone(); }, 900);
    return (): void => {
      clearTimeout(t);
    };
  }, [open, visible, leave, onDone]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm transition-opacity duration-500",
        leave ? "opacity-0" : "opacity-100",
      )}
      aria-live="polite"
    >
      <div
        className={cn(
          "flex flex-col items-center gap-5 px-8 text-center transition-all duration-500",
          leave ? "scale-90" : "scale-100",
        )}
      >
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-success-400/30 animate-ping" />
          <span className="absolute inset-2 rounded-full bg-success-400/20" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-success-400 to-primary-500 shadow-[0_0_40px_rgba(34,197,94,0.5)]">
            <Check className="h-12 w-12 text-white" strokeWidth={3} />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
