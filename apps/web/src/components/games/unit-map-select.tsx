"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import type { GameUnitOption } from "@/lib/games/types";

interface UnitMapSelectProps {
  units: GameUnitOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UnitMapSelect({
  units,
  selectedId,
  onSelect,
}: UnitMapSelectProps): ReactNode {
  return (
    <div className="relative mx-auto w-full max-w-md overflow-x-hidden py-2">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-primary-500/15 via-primary-500/45 to-primary-500/15" />
      <div className="relative flex flex-col items-center gap-6">
        {units.map((unit, idx) => {
          const isOdd = idx % 2 === 0;
          const active = selectedId === unit.id;
          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => {
                onSelect(unit.id);
              }}
              className={`relative z-10 flex flex-col items-center gap-2 ${
                isOdd ? "md:translate-x-14" : "md:-translate-x-14"
              }`}
            >
              <span
                className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 font-cairo text-3xl font-black transition-all duration-200 ${
                  active
                    ? "border-primary-500 bg-primary-500 text-white shadow-[0_0_24px_rgba(34,211,238,0.45)]"
                    : "border-primary-500/30 bg-white text-primary-500 hover:border-primary-500/60 dark:bg-neutral-900/60"
                }`}
              >
                {String(idx + 1)}
                {unit.isPremium && (
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </span>
              <span
                className={`max-w-[150px] text-center text-sm font-bold ${
                  active
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-neutral-700 dark:text-neutral-200"
                }`}
              >
                {unit.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
