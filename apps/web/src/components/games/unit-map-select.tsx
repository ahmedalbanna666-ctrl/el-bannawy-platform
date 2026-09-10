"use client";

import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const [lockedUnit, setLockedUnit] = useState<GameUnitOption | null>(null);

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

      <div className="grid w-full grid-cols-2 gap-3">
        {units.map((unit, idx) => {
          const active = selectedId === unit.id;
          const locked = unit.isPremium && !unit.unlocked;
          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => {
                if (locked) {
                  setLockedUnit(unit);
                  return;
                }
                onSelect(unit.id);
              }}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                active
                  ? "border-primary-500 bg-primary-500/10"
                  : locked
                    ? "border-amber-200 bg-amber-50/50 opacity-80 dark:border-amber-700/30 dark:bg-amber-900/10"
                    : "border-neutral-200 bg-white hover:border-primary-500/40 dark:border-neutral-700 dark:bg-neutral-900/40"
              }`}
            >
              <span
                className={`relative flex h-12 w-12 items-center justify-center rounded-full font-cairo text-lg font-black transition-all duration-200 ${
                  active
                    ? "bg-primary-500 text-white shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                    : locked
                      ? "bg-amber-500/20 text-amber-600"
                      : "bg-primary-500/10 text-primary-500"
                }`}
              >
                {String(idx + 1)}
                {locked ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                    <Lock className="h-2.5 w-2.5" />
                  </span>
                ) : unit.isPremium ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                    <Lock className="h-2.5 w-2.5" />
                  </span>
                ) : null}
              </span>
              <span
                className={`max-w-[84px] truncate text-center text-xs font-bold ${
                  active
                    ? "text-primary-600 dark:text-primary-400"
                    : locked
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {unit.title}
              </span>
              {locked && <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">مدفوعة</span>}
            </button>
          );
        })}
      </div>

      <Dialog open={!!lockedUnit} onClose={() => setLockedUnit(null)}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
              <Lock className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">هذه الوحدة مدفوعة</h3>
              <p className="mt-1 text-sm text-neutral-500">
                {lockedUnit ? `وحدة "${lockedUnit.title}" مقفلة. سيتم فتحها تلقائياً عند شراء الوحدة أو شراء الترم كاملاً.` : ""}
              </p>
            </div>
            <Button variant="primary" fullWidth onClick={() => setLockedUnit(null)}>
              حسناً
            </Button>
            <p className="text-xs text-neutral-400">يمكنك الشراء من صفحة الوحدات أو المتجر</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
