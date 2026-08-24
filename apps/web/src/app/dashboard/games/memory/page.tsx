"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCurriculumUnits, useUnitVocabulary } from "@/lib/games/use-games-data";
import { useGameSettings } from "@/lib/games/settings";
import { MemoryGame } from "@/components/games/memory-game";
import { UnitMapSelect } from "@/components/games/unit-map-select";
import { GameIntroDialog } from "@/components/games/game-intro-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Sparkles, ChevronLeft, Brain, Shuffle, Lock } from "lucide-react";

export default function MemoryGamePage(): ReactNode {
  const router = useRouter();
  const { settings } = useGameSettings();
  const { data: units, isLoading, isError, refetch } = useCurriculumUnits();
  const [showIntro, setShowIntro] = useState(true);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);

  const selectedUnit = useMemo(
    () => units?.find((unit) => unit.id === selectedUnitId) ?? null,
    [units, selectedUnitId],
  );

  const { data: pool, isLoading: poolLoading, isError: poolError } = useUnitVocabulary(
    selectedUnitId ?? "",
    selectedUnit?.lessonIds ?? [],
  );

  const words = useMemo(
    () => (pool ?? []).slice(0, Math.min(settings.memoryGame.wordsPerRound, pool?.length ?? 0)),
    [pool, settings.memoryGame.wordsPerRound],
  );

  const startRound = (): void => {
    setRound((prev) => prev + 1);
  };

  if (!settings.memoryGame.enabled) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500">
              <Brain className="h-6 w-6" />
            </span>
            لعبة الذاكرة
          </h1>
        </div>
        <EmptyState
          title="اللعبة غير مفعّلة"
          description="لم يقم المعلم بتفعيل لعبة الذاكرة حالياً، جرّب لعبة أخرى."
          icon={<Lock className="h-16 w-16" />}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <GameIntroDialog
        gameKey="memory"
        open={showIntro}
        onClose={() => {
          setShowIntro(false);
        }}
      />

      {!started ? (
        <div className="flex flex-col gap-6">
          <div>
            <button
              onClick={(): void => { router.push("/dashboard/games"); }}
              className="mb-2 flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-primary-500"
            >
              <ChevronLeft className="h-4 w-4" />
              رجوع للألعاب
            </button>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500">
                <Brain className="h-6 w-6" />
              </span>
              لعبة الذاكرة
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              اختر وحدة، ثم اقلب البطاقات لتطابق كل كلمة إنجليزية مع معناها.
            </p>
          </div>

          {isLoading && (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          )}

          {isError && (
            <ErrorState title="فشل تحميل الوحدات" onRetry={(): void => { void refetch(); }} />
          )}

          {!isLoading && !isError && units?.length === 0 && (
            <EmptyState
              title="لا يوجد منهج متاح"
              description="يتم إنشاء محتوى المنهج حالياً"
              icon={<Brain className="h-16 w-16" />}
            />
          )}

          {!isLoading && !isError && units && units.length > 0 && (
            <UnitMapSelect
              units={units}
              selectedId={selectedUnitId}
              onSelect={(id): void => {
                setSelectedUnitId(id);
                setRound(0);
                setStarted(true);
              }}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={(): void => { setStarted(false); }}
              className="flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-primary-500"
            >
              <ChevronLeft className="h-4 w-4" />
              رجوع للوحدات
            </button>
            {selectedUnit && <Badge variant="secondary">{selectedUnit.title}</Badge>}
          </div>

          {poolLoading && <Skeleton className="h-64 w-full rounded-2xl" />}

          {poolError && (
            <ErrorState title="فشل تحميل الكلمات" description="تعذر جلب مفردات هذه الوحدة" />
          )}

          {!poolLoading && !poolError && selectedUnit && words.length < 3 && (
            <EmptyState
              title="لا توجد كلمات كافية"
              description="هذه الوحدة لا تحتوي على مفردات كافية لتشغيل لعبة الذاكرة. اضغط رجوع واختر وحدة أخرى."
              icon={<Sparkles className="h-16 w-16" />}
            />
          )}

          {!poolLoading && !poolError && selectedUnit && words.length >= 3 && (
            <Card variant="elevated" padding="lg">
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{words.length} أزواج</Badge>
                  <Button variant="outline" size="sm" onClick={startRound}>
                    <Shuffle className="ms-2 h-4 w-4" />
                    إعادة الخلط
                  </Button>
                </div>
                <MemoryGame key={round} words={words} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
