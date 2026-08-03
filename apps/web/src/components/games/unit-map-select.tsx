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
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
          اختر الوحدة
        </p>
        <span className="text-xs font-semibold text-neutral-400">
          {String(units.length)} وحدة
        </span>
      </div>

      <div className="flex w-full gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {units.map((unit, idx) => {
          const active = selectedId === unit.id;
          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => {
                onSelect(unit.id);
              }}
              aria-pressed={active}
              className={`flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                active
                  ? "border-primary-500 bg-primary-500/10"
                  : "border-neutral-200 bg-white hover:border-primary-500/40 dark:border-neutral-700 dark:bg-neutral-900/40"
              }`}
            >
              <span
                className={`relative flex h-12 w-12 items-center justify-center rounded-full font-cairo text-lg font-black transition-all duration-200 ${
                  active
                    ? "bg-primary-500 text-white shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                    : "bg-primary-500/10 text-primary-500"
                }`}
              >
                {String(idx + 1)}
                {unit.isPremium && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                    <Lock className="h-2.5 w-2.5" />
                  </span>
                )}
              </span>
              <span
                className={`max-w-[84px] truncate text-center text-xs font-bold ${
                  active
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-neutral-600 dark:text-neutral-300"
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
