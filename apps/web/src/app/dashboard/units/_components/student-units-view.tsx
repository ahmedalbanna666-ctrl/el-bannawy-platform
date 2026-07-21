"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { UnitLockOverlay } from "@/components/coins/unit-lock-overlay";
import { BookOpen, Lock } from "lucide-react";

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
  description: string;
  displayOrder: number;
  isPremium: boolean;
  unlocked: boolean;
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

type UnitStatus = "completed" | "current" | "upcoming";

interface ConnectorPoint {
  x: number;
  y: number;
}

function getUnitStatus(index: number, _total: number): UnitStatus {
  if (index === 0) return "current";
  return "upcoming";
}

export function StudentUnitsView(): ReactNode {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bgPathRef = useRef<SVGPathElement>(null);
  const dotsPathRef = useRef<SVGPathElement>(null);
  const [nodes, setNodes] = useState<ConnectorPoint[]>([]);

  const fetchCurriculum = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<Stage[]>("/curriculum");
      if (response.data) setStages(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل المنهج");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCurriculum();
  }, [fetchCurriculum]);

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
    const points: ConnectorPoint[] = [];

    cardNodes.forEach((node, i) => {
      const rect = node.getBoundingClientRect();
      const isOdd = i % 2 === 0;
      const edgeX = Math.round(
        isOdd
          ? rect.left - wrapperRect.left
          : rect.right - wrapperRect.left,
      );
      const cy = Math.round(rect.top + rect.height / 2 - wrapperRect.top);
      points.push({ x: edgeX, y: cy });
    });

    setNodes(points);

    let bgD = `M ${String(points[0].x)} ${String(points[0].y)}`;
    let dotsD = `M ${String(points[0].x)} ${String(points[0].y)}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const segLen = Math.max(Math.abs(dx), Math.abs(dy));
      const cpOffset = segLen * 0.45;

      const cp1x = prev.x + (dx > 0 ? cpOffset : -cpOffset);
      const cp1y = prev.y + dy * 0.15;
      const cp2x = curr.x - (dx > 0 ? cpOffset : -cpOffset);
      const cp2y = curr.y - dy * 0.15;

      const curve = `C ${String(Math.round(cp1x))} ${String(Math.round(cp1y))}, ${String(Math.round(cp2x))} ${String(Math.round(cp2y))}, ${String(curr.x)} ${String(curr.y)}`;
      bgD += ` ${curve}`;
      dotsD += ` ${curve}`;
    }

    bgPath.setAttribute("d", bgD);
    dotsPath.setAttribute("d", dotsD);
  }, []);

  useEffect(() => {
    if (!loading && stages.length > 0) {
      requestAnimationFrame(() => {
        drawPath();
      });
    }
    window.addEventListener("resize", drawPath);
    return (): void => {
      window.removeEventListener("resize", drawPath);
    };
  }, [loading, stages, drawPath]);

  const allUnits = stages.flatMap((stage) =>
    stage.grades.flatMap((grade) => grade.units),
  );

  const reversed = [...allUnits].reverse();

  if (loading) return <UnitsSkeleton />;
  if (error) return <ErrorState title="فشل تحميل المنهج" description={error} />;

  if (reversed.length === 0) {
    return (
      <EmptyState
        title="لا يوجد منهج متاح"
        description="يتم إنشاء محتوى المنهج حالياً"
        icon={<BookOpen className="h-16 w-16" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          الوحدات الدراسية
        </h1>
        <p className="mt-1 text-sm text-neutral-500">اختر الوحدة التي تريد دراستها</p>
      </div>

      <div ref={wrapperRef} className="relative mx-auto max-w-md pb-4">
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

        <div className="relative z-10 flex flex-col items-center gap-4 md:gap-5">
          {reversed.map((unit, idx) => {
            const status = getUnitStatus(idx, reversed.length);
            const isOdd = idx % 2 === 0;
            const locked = unit.isPremium && !unit.unlocked;

            const ringColor =
              status === "completed"
                ? "border-primary-500/70 bg-primary-500/5"
                : status === "current"
                  ? "border-success-500 bg-success-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50";

            const hoverColor =
              status === "current"
                ? "hover:border-success-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.22)]"
                : "hover:border-primary-500/60 hover:shadow-[0_0_25px_rgba(34,211,238,0.18)]";

            const handleOpen = (): void => {
              if (locked) {
                setOpenUnitId(unit.id);
                return;
              }
              if (unit.lessons.length > 0) {
                router.push(`/dashboard/lessons/${unit.id}`);
              }
            };

            return (
              <div
                key={unit.id}
                className={isOdd ? "flex flex-col items-center md:translate-x-14" : "flex flex-col items-center md:-translate-x-14"}
              >
                {status === "current" && (
                  <span className="mb-1.5 rounded-full bg-success-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(16,185,129,0.35)]">
                    أنت هنا 👇
                  </span>
                )}

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
                        handleOpen();
                      }
                    }}
                    onClick={handleOpen}
                    className={`flex h-[100px] w-[100px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[26px] border-2 transition-all duration-200 hover:scale-[1.02] ${ringColor} ${hoverColor} ${locked ? "opacity-70" : ""}`}
                  >
                    <span className="font-cairo text-[9px] font-extrabold uppercase tracking-[0.15em] text-primary-500/60">
                      UNIT
                    </span>
                    <span className="font-cairo text-[2.2rem] font-black leading-none text-neutral-900 dark:text-neutral-100">
                      {unit.displayOrder}
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-400">
                      {status === "current" ? `${String(45)}%` : status === "completed" ? "100%" : ""}
                    </span>
                  </div>

                  {locked && (
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                {locked && (
                  <div className="mt-2">
                    <UnitLockOverlay
                      unitId={unit.id}
                      unitTitle={unit.title}
                      open={openUnitId === unit.id}
                      onOpenChange={(o) => { setOpenUnitId(o ? unit.id : null); }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UnitsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={i % 2 === 0 ? "md:translate-x-14" : "md:-translate-x-14"}>
            <Skeleton className="h-[100px] w-[100px] rounded-[26px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
