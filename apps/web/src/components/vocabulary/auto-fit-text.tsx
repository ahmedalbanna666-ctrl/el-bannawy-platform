"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AutoFitTextProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly dir?: "ltr" | "rtl" | "auto";
  readonly baseFont?: number;
  readonly minFont?: number;
}

const DEFAULT_BASE_FONT = 14;
const DEFAULT_MIN_FONT = 10;

/**
 * Renders text on a single line and, when it overflows its cell, gradually
 * reduces the font size down to a safe minimum before allowing wrapping.
 * Applied to both Arabic and English vocabulary cells.
 */
export function AutoFitText({
  children,
  className,
  dir = "auto",
  baseFont = DEFAULT_BASE_FONT,
  minFont = DEFAULT_MIN_FONT,
}: AutoFitTextProps): ReactNode {
  const ref = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);
  const [allowWrap, setAllowWrap] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = (): void => {
      let size = baseFont;
      el.style.whiteSpace = "nowrap";
      setAllowWrap(false);
      el.style.fontSize = `${String(size)}px`;
      let iterations = 0;
      while (el.scrollWidth > el.clientWidth + 1 && size > minFont && iterations < 24) {
        size -= 0.5;
        el.style.fontSize = `${String(size)}px`;
        iterations += 1;
      }
      setFontSize(size);
      if (el.scrollWidth > el.clientWidth + 1) {
        setAllowWrap(true);
      }
    };

    fit();
    window.addEventListener("resize", fit);
    return (): void => { window.removeEventListener("resize", fit); };
  }, [baseFont, minFont]);

  return (
    <span
      ref={ref}
      dir={dir}
      style={{
        fontSize: fontSize === null ? undefined : `${String(fontSize)}px`,
        whiteSpace: allowWrap ? "normal" : "nowrap",
      }}
      className={cn("inline-block max-w-full overflow-hidden align-top [overflow-wrap:break-word]", className)}
    >
      {children}
    </span>
  );
}
