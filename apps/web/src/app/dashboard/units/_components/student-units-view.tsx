"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { UnitLockOverlay } from "@/components/coins/unit-lock-overlay";
import { CertificateModal } from "@/components/certificates/certificate-modal";
import {
  fetchCertificates,
  fetchCertificateConfig,
  generateCertificatePdf,
  issueCertificate,
  type UnitCertificate,
} from "@/lib/certificates";
import {
  buildZigzagPath,
  computeZigzagOffset,
  type ZigzagPoint,
} from "@/lib/zigzag-path";
import { BookOpen, Check, Lock, Medal } from "lucide-react";

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
  progress: number;
  completed: boolean;
  status: "completed" | "current" | "upcoming";
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

function firstNonEmpty(
  ...values: (string | null | undefined)[]
): string | null {
  for (const value of values) {
    if (value?.trim()) return value;
  }
  return null;
}

export function StudentUnitsView(): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const [certificateModal, setCertificateModal] = useState<UnitCertificate | null>(null);
  const isIssuingRef = useRef(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bgPathRef = useRef<SVGPathElement>(null);
  const dotsPathRef = useRef<SVGPathElement>(null);
  const [nodes, setNodes] = useState<ZigzagPoint[]>([]);
  const [offsetPx, setOffsetPx] = useState<number>(() =>
    typeof window === "undefined" ? 64 : computeZigzagOffset(window.innerWidth),
  );

  const { data: stages, isLoading, isError, error }: UseQueryResult<Stage[]> = useQuery({
    queryKey: ["curriculum"],
    queryFn: async () => {
      const res = await api.get<Stage[]>("/curriculum");
      return res.data ?? [];
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["certificates"],
    queryFn: fetchCertificates,
    staleTime: 60_000,
  });

  const { data: certConfig } = useQuery({
    queryKey: ["certificate-config"],
    queryFn: fetchCertificateConfig,
    staleTime: 60_000,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const res = await api.get<{ englishName?: string | null; fullName?: string }>("/profile");
      return res.data ?? null;
    },
    enabled: Boolean(user?.id),
    staleTime: 300_000,
  });

  useEffect(() => {
    if (isLoading || !stages) return;
    if (isIssuingRef.current) return;
    const threshold = certConfig?.threshold ?? 80;
    const issuedUnitIds = new Set(certificates.map((c) => c.unit.id));
    const flattenedUnits = stages.flatMap((stage) =>
      stage.grades.flatMap((grade) => grade.units),
    );
    const eligible = flattenedUnits.filter(
      (u) => u.progress >= threshold && !issuedUnitIds.has(u.id),
    );
    if (eligible.length === 0) return;

    isIssuingRef.current = true;
    void (async (): Promise<void> => {
      try {
        const studentName = firstNonEmpty(
          profile?.englishName,
          profile?.fullName,
          user?.fullName,
        ) ?? "Student";
        for (const unit of eligible) {
          try {
            const data = await generateCertificatePdf({
              studentName,
              unitNumber: unit.displayOrder,
              unitTitle: unit.title,
              percentage: unit.progress,
            });
            await issueCertificate(
              unit.id,
              `certificate-unit-${String(unit.displayOrder)}.pdf`,
              data,
            );
          } catch {
            // per-unit failure is retried on the next visit
          }
        }
      } finally {
        isIssuingRef.current = false;
        await queryClient.invalidateQueries({ queryKey: ["certificates"] });
      }
    })();
  }, [isLoading, stages, certificates, certConfig, profile, user, queryClient]);

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
    if (!isLoading && stages && stages.length > 0) {
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
  }, [isLoading, stages, drawPath, handleResize]);

  const allUnits = (stages ?? []).flatMap((stage) =>
    stage.grades.flatMap((grade) => grade.units),
  );

  if (isLoading) return <UnitsSkeleton />;
  if (isError) return <ErrorState title="فشل تحميل المنهج" description={error instanceof Error ? error.message : "حدث خطأ"} />;

  if (allUnits.length === 0) {
    return (
      <EmptyState
        title="لا يوجد منهج متاح"
        description="يتم إنشاء محتوى المنهج حالياً"
        icon={<BookOpen className="h-16 w-16" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          الوحدات الدراسية
        </h1>
        <p className="mt-0.5 text-xs text-neutral-500">اختر الوحدة التي تريد دراستها</p>
      </div>

      <div ref={wrapperRef} className="relative mx-auto max-w-md pb-1">
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
          {allUnits.map((unit, idx) => {
            const status = unit.status;
            const isEven = idx % 2 === 0;
            const locked = !unit.unlocked;
            const showProgress = status === "current" || status === "completed" || unit.progress > 0;

            const ringColor =
              status === "completed"
                ? "border-success-500 bg-success-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                : status === "current"
                  ? "border-primary-500 bg-primary-500/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                  : "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50";

            const hoverColor =
              status === "completed"
                ? "hover:border-success-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.22)]"
                : status === "current"
                  ? "hover:border-primary-500 hover:shadow-[0_0_30px_rgba(34,211,238,0.22)]"
                  : "hover:border-neutral-300 dark:hover:border-neutral-600";

            const barColor =
              status === "completed"
                ? "bg-success-500"
                : "bg-primary-500";

            const handleOpen = (): void => {
              if (locked) {
                if (unit.isPremium) {
                  setOpenUnitId(unit.id);
                  return;
                }
                toast.info("أكمل الوحدة السابقة أولاً لتفتح هذه الوحدة");
                return;
              }
              if (unit.lessons.length > 0) {
                router.push(`/dashboard/lessons/${unit.id}`);
              }
            };

            return (
              <div
                key={unit.id}
                className="flex flex-col items-center"
                style={{ transform: `translateX(${String(isEven ? offsetPx : -offsetPx)}px)` }}
              >
                {status === "current" && (
                  <span className="mb-1 rounded-full bg-success-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(16,185,129,0.35)]">
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
                    className={`flex h-[72px] w-[72px] sm:h-[84px] sm:w-[84px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[20px] sm:rounded-[24px] border-2 transition-all duration-200 hover:scale-[1.02] ${ringColor} ${hoverColor} ${locked ? "opacity-70" : ""}`}
                  >
                    <span className="font-cairo text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary-500/60">
                      UNIT
                    </span>
                    <span className={`font-cairo text-3xl font-black leading-none sm:text-4xl ${status === "completed" ? "text-success-600 dark:text-success-400" : "text-neutral-900 dark:text-neutral-100"}`}>
                      {unit.displayOrder}
                    </span>
                    {showProgress ? (
                      <div className="flex w-11 items-center gap-1">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${String(unit.progress)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-neutral-400">
                          {String(unit.progress)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-semibold text-neutral-400">
                        قريباً
                      </span>
                    )}
                  </div>

                  {status === "completed" && (
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-success-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                      <Check className="h-4 w-4" />
                    </span>
                  )}

                  {locked && (
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                {locked && unit.isPremium && (
                  <div className="mt-2">
                    <UnitLockOverlay
                      unitId={unit.id}
                      unitTitle={unit.title}
                      termId={unit.termId ?? undefined}
                      open={openUnitId === unit.id}
                      onOpenChange={(o) => { setOpenUnitId(o ? unit.id : null); }}
                    />
                  </div>
                )}

                {certificates.some((c) => c.unit.id === unit.id) && (
                  <button
                    type="button"
                    onClick={(): void => {
                      const cert = certificates.find((c) => c.unit.id === unit.id);
                      if (cert) setCertificateModal(cert);
                    }}
                    className="mt-1.5 flex items-center gap-1 rounded-full bg-primary-500/10 px-2.5 py-1 text-[10px] font-bold text-primary-500 transition-colors hover:bg-primary-500/20 dark:text-primary-400"
                  >
                    <Medal className="h-3 w-3" />
                    الشهادة
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <CertificateModal
        certificate={certificateModal}
        onClose={(): void => { setCertificateModal(null); }}
      />
    </div>
  );
}

function UnitsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
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
