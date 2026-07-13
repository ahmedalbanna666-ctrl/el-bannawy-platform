"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Languages,
  ChevronLeft,
} from "lucide-react";
import { usePronunciation } from "@/lib/use-pronunciation";
import { VocabCell } from "@/components/vocabulary/vocabulary-cell";

interface VocabWord {
  readonly id: string;
  readonly word: string;
  readonly translation: string;
  readonly definition: string | null;
  readonly example: string | null;
  readonly partOfSpeech: string | null;
  readonly displayOrder: number;
}

interface VocabApiResponse {
  readonly id: string;
  readonly title: string;
  readonly displayOrder: number;
  readonly unit: {
    readonly id: string;
    readonly title: string;
    readonly grade: { readonly id: string; readonly name: string };
  };
}

export default function StudentVocabularyPage(): ReactNode {
  const params = useParams();
  const lessonId = params.lessonId as string;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { speak, isSpeaking, isSupported } = usePronunciation();

  const {
    data: lesson,
    isLoading: lessonLoading,
    isError: lessonError,
    error: lessonErr,
  } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const res = await api.get<VocabApiResponse>(`/lessons/${lessonId}`);
      return res.data ?? null;
    },
  });

  const {
    data: vocabData,
    isLoading: vocabLoading,
    isError: vocabError,
    error: vocabErr,
  } = useQuery({
    queryKey: ["lesson-vocabulary", lessonId],
    queryFn: async () => {
      const res = await api.get<VocabWord[]>(`/lessons/${lessonId}/vocabulary`);
      return res.data ?? [];
    },
  });

  const isLoading = lessonLoading || vocabLoading;
  const isError = lessonError || vocabError;
  const error = lessonErr ?? vocabErr;
  const vocab = vocabData ?? [];

  const pairs = useMemo(() => {
    const result: (readonly [VocabWord | null, VocabWord | null])[] = [];
    for (let i = 0; i < vocab.length; i += 2) {
      result.push([vocab[i] ?? null, vocab[i + 1] ?? null]);
    }
    return result;
  }, [vocab]);

  const toggleExpand = (id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (isLoading) {
    return <VocabularySkeleton />;
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <ErrorState
          title="فشل تحميل المفردات"
          description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/dashboard/lessons" className="hover:text-primary-500 transition-colors">
          الدروس
        </Link>
        {lesson && (
          <>
            <ChevronLeft className="h-3.5 w-3.5" />
            <Link
              href={`/dashboard/lessons/detail/${lessonId}`}
              className="hover:text-primary-500 transition-colors"
            >
              {lesson.title}
            </Link>
          </>
        )}
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="text-neutral-900 dark:text-neutral-100 font-medium">المفردات</span>
      </nav>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
          <Languages className="h-5 w-5 text-primary-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            مفردات الدرس
          </h1>
          <p className="text-sm text-neutral-500">{vocab.length} كلمة</p>
        </div>
      </div>

      {vocab.length === 0 ? (
        <EmptyState
          title="لا توجد مفردات بعد"
          description="لم يتم إضافة كلمات مفردات لهذا الدرس حتى الآن."
          icon={<Languages className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />}
        />
      ) : (
        <>
          {/* Desktop: 2 items per row */}
          <div className="hidden md:block" dir="ltr">
            <Table className="rounded-xl border border-neutral-200 dark:border-neutral-700">
              <TableHeader>
                <TableRow className="h-12 border-b border-neutral-200 dark:border-neutral-700">
                  <TableHead className="w-[30%] text-xs font-semibold uppercase text-neutral-500">
                    الكلمة (English)
                  </TableHead>
                  <TableHead className="w-[20%] text-xs font-semibold uppercase text-neutral-500">
                    المعنى (العربية)
                  </TableHead>
                  <TableHead className="w-[30%] text-xs font-semibold uppercase text-neutral-500">
                    الكلمة (English)
                  </TableHead>
                  <TableHead className="w-[20%] text-xs font-semibold uppercase text-neutral-500">
                    المعنى (العربية)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairs.map(([left, right], idx) => (
                  <TableRow key={idx} className="h-auto border-b border-neutral-100 dark:border-neutral-800">
                    {left ? (
                      <VocabCell
                        vocab={left}
                        isSpeaking={isSpeaking}
                        speak={speak}
                        isSupported={isSupported}
                        expanded={expandedId === left.id}
                        onToggleExpand={(): void => { toggleExpand(left.id); }}
                      />
                    ) : (
                      <TableCell className="py-3" />
                    )}
                    <TableCell className={`py-3 text-sm text-neutral-900 dark:text-neutral-100 ${left ? "" : "hidden"}`} dir="rtl">
                      {left?.translation}
                    </TableCell>
                    {right ? (
                      <VocabCell
                        vocab={right}
                        isSpeaking={isSpeaking}
                        speak={speak}
                        isSupported={isSupported}
                        expanded={expandedId === right.id}
                        onToggleExpand={(): void => { toggleExpand(right.id); }}
                      />
                    ) : (
                      <TableCell className="py-3" />
                    )}
                    <TableCell className={`py-3 text-sm text-neutral-900 dark:text-neutral-100 ${right ? "" : "hidden"}`} dir="rtl">
                      {right?.translation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: 1 item per row */}
          <div className="md:hidden" dir="ltr">
            <Table className="rounded-xl border border-neutral-200 dark:border-neutral-700">
              <TableHeader>
                <TableRow className="h-12 border-b border-neutral-200 dark:border-neutral-700">
                  <TableHead className="text-xs font-semibold uppercase text-neutral-500">
                    الكلمة (English)
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-neutral-500">
                    المعنى
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vocab.map((v) => (
                  <TableRow key={v.id} className="h-auto border-b border-neutral-100 dark:border-neutral-800">
                    <VocabCell
                      vocab={v}
                      isSpeaking={isSpeaking}
                      speak={speak}
                      isSupported={isSupported}
                      expanded={expandedId === v.id}
                      onToggleExpand={(): void => { toggleExpand(v.id); }}
                    />
                    <TableCell className="py-3 text-sm text-neutral-900 dark:text-neutral-100" dir="rtl">
                      {v.translation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────

function VocabularySkeleton(): ReactNode {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div>
          <Skeleton className="mb-1 h-6 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
