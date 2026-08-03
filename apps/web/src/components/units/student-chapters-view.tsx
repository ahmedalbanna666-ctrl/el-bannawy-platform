"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { UnitLockOverlay } from "@/components/coins/unit-lock-overlay";
import {
  buildZigzagPath,
  computeZigzagOffset,
  type ZigzagPoint,
} from "@/lib/zigzag-path";
import { Lock } from "lucide-react";
import {
  type UnitTypeValue,
  getUnitTypeCopy,
} from "@/lib/unit-type-config";

interface LessonSummary {
  id: string;
  title: string;
  displayOrder: number;
  estimatedDuration: number;
  isPremium: boolean;
  sequentialMode: boolean;
  homeworkEnabled: boolean;
  quizEnabled: boolean;
}

interface Unit {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
  isPremium: boolean;
  unlocked: boolean;
  termId: string | null;
  lessons: LessonSummary[];
}

interface Stage {
  id: string;
  name: string;
  displayOrder: number;
  grades: {
    id: string;
    name: string;
    displayOrder: number;
    units: Unit[];
  }[];
}

interface StudentChaptersViewProps {
  readonly unitId: string;
  readonly unitType: UnitTypeValue;
}

export function StudentChaptersView({
  unitId,
  unitType,
}: StudentChaptersViewProps): ReactNode {
  const router = useRouter();
  const copy = getUnitTypeCopy(unitType);

  const [openLockUnitId, setOpenLockUnitId] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bgPathRef = useRef<SVGPathElement>(null);
  const dotsPathRef = useRef<SVGPathElement>(null);
  const [nodes, setNodes] = useState<ZigzagPoint[]>([]);
  const [offsetPx, setOffsetPx] = useState<number>(() =>
    typeof window === "undefined" ? 64 : computeZigzagOffset(window.innerWidth),
  );

  const { data: stages, isLoading, isError, error } = useQuery({
    queryKey: ["curriculum", unitType],
    queryFn: async () => {
      const res = await api.get<Stage[]>(`/curriculum?unitType=${unitType}`);
      return res.data ?? [];
    },
    staleTime: 300_000,
  });

  const unit = (stages ?? [])
    .flatMap((stage) => stage.grades.flatMap((grade) => grade.units))
    .find((u) => u.id === unitId) ?? null;

  const chapters = [...(unit?.lessons ?? [])].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  const drawPath = useCallback((): void => {
    const wrapper = wrapperRef.current;
    const bgPath = bgPathRef.current;
    const dotsPath = dotsPathRef.current;
    if (!wrapper || !bgPath || !dotsPath) return;

    const cardNodes = nodeRefs.current.filter(Boolean) as HTMLDivElement[];
    if (cardNodes.length < 2) {
      setNodes([]);
      bgPath.setAttribute("d", "");
      dotsPath.setAttribute("d", "");
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const points: ZigzagPoint[] = [];

    cardNodes.forEach((node, i) => {
      const rect = node.getBoundingClientRect();
      const isEven = i % 2 === 0;
      const edgeX = Math.round(
        isEven
          ? rect.left - wrapperRect.left
          : rect.right - wrapperRect.left,
      );
      const cy = Math.round(rect.top + rect.height / 2 - wrapperRect.top);
      points.push({ x: edgeX, y: cy });
    });

    setNodes(points);

    const { bgD, dotsD } = buildZigzagPath(points);
    bgPath.setAttribute("d", bgD);
    dotsPath.setAttribute("d", dotsD);
  }, [offsetPx]);

  const handleResize = useCallback((): void => {
    setOffsetPx(computeZigzagOffset(window.innerWidth));
    drawPath();
  }, [drawPath]);

  useEffect(() => {
    if (!isLoading && unit && chapters.length > 0) {
      requestAnimationFrame(() => {
        drawPath();
      });
    }
    let rafId = 0;
    void document.fonts.ready.then(() => {
      rafId = requestAnimationFrame(() => {
        drawPath();
      });
    });
    const wrapper = wrapperRef.current;
    const resizeObserver = wrapper
      ? new ResizeObserver(() => {
          drawPath();
        })
      : null;
    if (resizeObserver && wrapper) {
      resizeObserver.observe(wrapper);
    }
    window.addEventListener("resize", handleResize);
    return (): void => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [isLoading, unit, chapters.length, drawPath, handleResize]);

  if (isLoading) return <ChaptersSkeleton />;
  if (isError) return <ErrorState title={`فشل تحميل ${copy.singular}`} description={error instanceof Error ? error.message : "حدث خطأ"} />;

  if (!unit) {
    return (
      <EmptyState
        title={`${copy.singular} غير موجودة`}
        description={`${copy.singular} التي تبحث عنها غير متوفرة`}
        icon={<copy.icon className="h-16 w-16" />}
      />
    );
  }

  const unitLocked = unit.isPremium && !unit.unlocked;

  const handleOpen = (chapter: LessonSummary): void => {
    if (unitLocked) {
      setOpenLockUnitId(unit.id);
      return;
    }
    router.push(`/dashboard/lessons/detail/${chapter.id}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {unit.title}
        </h1>
        {unit.description && (
          <p className="mt-0.5 text-sm text-neutral-500">{unit.description}</p>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={(): void => { router.push(copy.listHref); }}
        className="self-start"
      >
        رجوع إلى {copy.plural}
      </Button>

      {unitLocked && (
        <UnitLockOverlay
          unitId={unit.id}
          unitTitle={unit.title}
          termId={unit.termId ?? undefined}
          open={openLockUnitId === unit.id}
          onOpenChange={(o): void => { setOpenLockUnitId(o ? unit.id : null); }}
        />
      )}

      {chapters.length === 0 ? (
        <EmptyState
          title={`لا توجد ${copy.childPlural}`}
          description={`يتم إعداد ${copy.childPlural} هذه ${copy.singular} حالياً`}
          icon={<copy.icon className="h-16 w-16" />}
        />
      ) : (
        <div ref={wrapperRef} className="relative mx-auto max-w-md pb-2">
          <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
            <path
              ref={bgPathRef}
              d=""
              className="fill-none stroke-primary-500/12 stroke-[2] [stroke-linecap:round]"
            />
            <path
              ref={dotsPathRef}
              d=""
              className="fill-none stroke-primary-500/55 stroke-[3] [stroke-dasharray:0_24] [stroke-linecap:round]"
              style={{ filter: "drop-shadow(0 0 3px rgba(34,211,238,0.25))" }}
            />
            {nodes.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="3"
                className="fill-primary-500"
                style={{ filter: "drop-shadow(0 0 2px rgba(34,211,238,0.35))" }}
              />
            ))}
          </svg>

          <div className="relative z-10 flex flex-col items-center gap-1 md:gap-1">
            {chapters.map((chapter, idx) => {
              const isEven = idx % 2 === 0;
              const locked = unitLocked;

              const handleClick = (): void => { handleOpen(chapter); };

              return (
                <div
                  key={chapter.id}
                  className="flex flex-col items-center"
                  style={{ transform: `translateX(${String(isEven ? offsetPx : -offsetPx)}px)` }}
                >
                  <div className="relative">
                    <div
                      ref={(el): void => {
                        nodeRefs.current[idx] = el;
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e): void => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleClick();
                        }
                      }}
                      onClick={handleClick}
                      className={`flex h-[72px] w-[72px] sm:h-[84px] sm:w-[84px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[20px] sm:rounded-[24px] border-2 border-neutral-200 bg-neutral-50 transition-all duration-200 hover:scale-[1.02] hover:border-primary-500/60 hover:shadow-[0_0_25px_rgba(34,211,238,0.18)] dark:border-neutral-700 dark:bg-neutral-800/50 ${locked ? "opacity-70" : ""}`}
                    >
                      <span className="font-cairo text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary-500/60">
                        {copy.zigzagBadge}
                      </span>
                      <span className="font-cairo text-3xl font-black leading-none text-neutral-900 dark:text-neutral-100 sm:text-4xl">
                        {chapter.displayOrder}
                      </span>
                    </div>

                    {locked && (
                      <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <span className="mt-1 max-w-[180px] truncate text-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {chapter.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ChaptersSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-40" />
      <div className="mx-auto flex max-w-md flex-col items-center gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{ transform: `translateX(${String(i % 2 === 0 ? 64 : -64)}px)` }}
          >
            <Skeleton className="h-[72px] w-[72px] sm:h-[84px] sm:w-[84px] rounded-[20px] sm:rounded-[24px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
