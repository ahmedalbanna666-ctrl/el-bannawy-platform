"use client";

import { useCallback, useRef, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TeacherContextBanner } from "@/components/ui/teacher-context-banner";
import { ScrollText, ArrowLeft } from "lucide-react";

interface StoryChapter {
  id: string;
  title: string;
  content: unknown;
  imageUrl: string | null;
  displayOrder: number;
  published: boolean;
}

interface Story {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  displayOrder: number;
  published: boolean;
  chapters: StoryChapter[];
}

type ChapterStatus = "completed" | "current" | "upcoming";

interface ConnectorPoint {
  x: number;
  y: number;
}

function getChapterStatus(index: number): ChapterStatus {
  if (index === 0) return "current";
  return "upcoming";
}

export function StudentStoriesView(): ReactNode {
  const router = useRouter();

  const { data: stories, isLoading, isError, error } = useQuery({
    queryKey: ["stories", "student"],
    queryFn: async () => {
      const res = await api.get<Story[]>("/stories");
      return res.data ?? [];
    },
    staleTime: 300_000,
  });

  const allChapters = (stories ?? []).flatMap((story) => story.chapters);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bgPathRef = useRef<SVGPathElement>(null);
  const dotsPathRef = useRef<SVGPathElement>(null);
  const [nodes, setNodes] = useState<ConnectorPoint[]>([]);

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
    if (!isLoading && allChapters.length > 0) {
      requestAnimationFrame(() => {
        drawPath();
      });
    }
    window.addEventListener("resize", drawPath);
    return (): void => {
      window.removeEventListener("resize", drawPath);
    };
  }, [isLoading, allChapters, drawPath]);

  const reversed = [...allChapters].reverse();

  if (isLoading) return <StorySkeleton />;
  if (isError) return <ErrorState title="فشل تحميل القصة" description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"} />;

  if (reversed.length === 0) {
    return (
      <EmptyState
        title="قصة المنهج غير متاحة"
        description="يتم إعداد قصة المنهج حالياً"
        icon={<ScrollText className="h-16 w-16" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TeacherContextBanner />
      <button
        onClick={(): void => { router.push("/dashboard"); }}
        className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        العودة للرئيسية
      </button>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          قصة المنهج
        </h1>
        <p className="mt-1 text-sm text-neutral-500">تابع قصة المنهج التعليمي</p>
      </div>

      <div ref={wrapperRef} className="relative mx-auto max-w-md pb-4">
        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
          <path
            ref={bgPathRef}
            d=""
            className="fill-none stroke-orange-500/12 stroke-[2] [stroke-linecap:round]"
          />
          <path
            ref={dotsPathRef}
            d=""
            className="fill-none stroke-orange-500/55 stroke-[3] [stroke-dasharray:0_24] [stroke-linecap:round]"
            style={{ filter: "drop-shadow(0 0 3px rgba(249,115,22,0.25))" }}
          />
          {nodes.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="3"
              className="fill-orange-500"
              style={{ filter: "drop-shadow(0 0 2px rgba(249,115,22,0.35))" }}
            />
          ))}
        </svg>

        <div className="relative z-10 flex flex-col items-center gap-4 md:gap-5">
          {reversed.map((chapter, idx) => {
            const status = getChapterStatus(idx);
            const isOdd = idx % 2 === 0;

            const ringColor =
              status === "completed"
                ? "border-orange-500/70 bg-orange-500/5"
                : status === "current"
                  ? "border-success-500 bg-success-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50";

            const hoverColor =
              status === "current"
                ? "hover:border-success-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.22)]"
                : "hover:border-orange-500/60 hover:shadow-[0_0_25px_rgba(249,115,22,0.18)]";

            return (
              <div
                key={chapter.id}
                className={isOdd ? "flex flex-col items-center md:translate-x-14" : "flex flex-col items-center md:-translate-x-14"}
              >
                {status === "current" && (
                  <span className="mb-1.5 rounded-full bg-success-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(16,185,129,0.35)]">
                    أنت هنا 👇
                  </span>
                )}

                <div
                  ref={(el): void => {
                    nodeRefs.current[idx] = el;
                  }}
                  className={`flex h-[100px] w-[100px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[26px] border-2 transition-all duration-200 hover:scale-[1.02] ${ringColor} ${hoverColor}`}
                >
                  <span className="font-cairo text-[8px] font-extrabold uppercase tracking-[0.15em] text-orange-500/60">
                    CHAPTER
                  </span>
                  <span className="font-cairo text-[2.2rem] font-black leading-none text-neutral-900 dark:text-neutral-100">
                    {chapter.displayOrder}
                  </span>
                  <span className="line-clamp-1 max-w-[70px] text-center text-[9px] font-medium text-neutral-400">
                    {chapter.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StorySkeleton(): ReactNode {
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
