"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Languages,
  Volume2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { usePronunciation } from "@/lib/use-pronunciation";
import { parseDisplayWord } from "@/lib/word-display";

const PAGE_SIZE = 16;

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
  const [page, setPage] = useState(0);
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
  const totalPages = Math.max(1, Math.ceil(vocab.length / PAGE_SIZE));

  const pageVocab = useMemo(() => {
    const start = page * PAGE_SIZE;
    return vocab.slice(start, start + PAGE_SIZE);
  }, [vocab, page]);

  const pairs = useMemo(() => {
    const result: (readonly [VocabWord | null, VocabWord | null])[] = [];
    for (let i = 0; i < pageVocab.length; i += 2) {
      result.push([pageVocab[i] ?? null, pageVocab[i + 1] ?? null]);
    }
    return result;
  }, [pageVocab]);

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
          <div className="hidden md:block">
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
                    <TableCell className={`py-3 text-sm text-neutral-900 dark:text-neutral-100 ${left ? "" : "hidden"}`}>
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
                    <TableCell className={`py-3 text-sm text-neutral-900 dark:text-neutral-100 ${right ? "" : "hidden"}`}>
                      {right?.translation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: 1 item per row */}
          <div className="md:hidden">
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
                {pageVocab.map((v) => (
                  <TableRow key={v.id} className="h-auto border-b border-neutral-100 dark:border-neutral-800">
                    <VocabCell
                      vocab={v}
                      isSpeaking={isSpeaking}
                      speak={speak}
                      isSupported={isSupported}
                      expanded={expandedId === v.id}
                      onToggleExpand={(): void => { toggleExpand(v.id); }}
                    />
                    <TableCell className="py-3 text-sm text-neutral-900 dark:text-neutral-100">
                      {v.translation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={(): void => { setPage((p) => p - 1); }}
                aria-label="الصفحة السابقة"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm text-neutral-500">
                {String(page + 1)} من {String(totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={(): void => { setPage((p) => p + 1); }}
                aria-label="الصفحة التالية"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── VocabCell ────────────────────────────────────────────────────────

function VocabCell({
  vocab,
  isSpeaking,
  speak,
  isSupported,
  expanded,
  onToggleExpand,
}: {
  vocab: VocabWord;
  isSpeaking: (id: string) => boolean;
  speak: (text: string, id: string) => void;
  isSupported: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}): ReactNode {
  const { displayWord, pronunciationText, partOfSpeech: legacyPos } = parseDisplayWord(vocab.word);
  const displayPos = vocab.partOfSpeech ?? legacyPos;
  const speaking = isSpeaking(vocab.id);
  const hasDetails = (vocab.definition?.length ?? 0) > 0 || (vocab.example?.length ?? 0) > 0;

  return (
    <TableCell className="py-3">
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          aria-label={`استمع إلى نطق كلمة ${displayWord}`}
          disabled={!isSupported}
          onClick={(): void => {
            if (isSupported) speak(pronunciationText, vocab.id);
          }}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            !isSupported
              ? "cursor-not-allowed text-neutral-300 dark:text-neutral-600"
              : speaking
                ? "bg-primary-500 text-white"
                : "text-primary-400 hover:bg-primary-500/10 hover:text-primary-500"
          }`}
        >
          {speaking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400" dir="ltr">
              {displayWord}
            </span>
            {displayPos && (
              <span className="text-xs text-neutral-400">({displayPos})</span>
            )}
          </div>
          {hasDetails && (
            <div className="mt-1">
              <button
                type="button"
                onClick={onToggleExpand}
                className="flex items-center gap-0.5 text-xs text-neutral-400 hover:text-primary-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                aria-expanded={expanded}
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                <span>{expanded ? "إخفاء التفاصيل" : "تفاصيل"}</span>
              </button>
              {expanded && (
                <div className="mt-1.5 space-y-1 rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800/50">
                  {vocab.definition && (
                    <p className="text-xs text-neutral-500">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">تعريف: </span>
                      {vocab.definition}
                    </p>
                  )}
                  {vocab.example && (
                    <p className="text-xs italic text-neutral-500">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400 not-italic">مثال: </span>
                      &quot;{vocab.example}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TableCell>
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
