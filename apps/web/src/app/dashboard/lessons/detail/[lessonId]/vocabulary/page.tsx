"use client";

import { useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
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
  BookX,
} from "lucide-react";
import { usePronunciation } from "@/lib/use-pronunciation";
import { VocabCell } from "@/components/vocabulary/vocabulary-cell";
import { VocabularyGroupHeader } from "@/components/vocabulary/vocabulary-group-header";
import { VocabularyStats } from "@/components/vocabulary/vocabulary-stats";
import { RelationVocabularyTable } from "@/components/vocabulary/relation-vocabulary-table";

interface VocabWord {
  readonly id: string;
  readonly word: string;
  readonly translation: string;
  readonly definition: string | null;
  readonly example: string | null;
  readonly partOfSpeech: string | null;
  readonly synonym?: string | null;
  readonly synonymTranslation?: string | null;
  readonly antonym?: string | null;
  readonly antonymTranslation?: string | null;
  readonly displayOrder: number;
}

interface VocabGroup {
  readonly id: string | null;
  readonly kind?: string;
  readonly title: string | null;
  readonly displayOrder: number;
  readonly items: readonly VocabWord[];
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

function StandardVocabTable({ items }: { items: readonly VocabWord[] }): ReactNode {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { speak, isSpeaking, isSupported } = usePronunciation();

  const buildPairs = (items: readonly VocabWord[]): (readonly [VocabWord | null, VocabWord | null])[] => {
    const result: (readonly [VocabWord | null, VocabWord | null])[] = [];
    for (let i = 0; i < items.length; i += 2) {
      result.push([items[i] ?? null, items[i + 1] ?? null]);
    }
    return result;
  };

  const toggleExpand = (id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const pairs = buildPairs(items);

  return (
    <>
      <div className="hidden md:block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40">
        <Table dir="ltr">
          <TableHeader>
            <TableRow className="h-11 border-b border-neutral-200 bg-primary-50/60 dark:border-neutral-700 dark:bg-primary-500/5">
              <TableHead className="w-[30%] text-xs font-bold uppercase tracking-wider text-neutral-500">
                الكلمة (English)
              </TableHead>
              <TableHead className="w-[20%] text-xs font-bold uppercase tracking-wider text-neutral-500">
                المعنى (العربية)
              </TableHead>
              <TableHead className="w-[30%] text-xs font-bold uppercase tracking-wider text-neutral-500">
                الكلمة (English)
              </TableHead>
              <TableHead className="w-[20%] text-xs font-bold uppercase tracking-wider text-neutral-500">
                المعنى (العربية)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pairs.map(([left, right], idx) => (
              <TableRow key={idx} className="border-b border-neutral-100 transition-colors last:border-0 hover:bg-primary-50/40 dark:border-neutral-800 dark:hover:bg-primary-500/5">
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

      <div className="md:hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40">
        <Table dir="ltr">
          <TableHeader>
            <TableRow className="h-11 border-b border-neutral-200 bg-primary-50/60 dark:border-neutral-700 dark:bg-primary-500/5">
              <TableHead className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                الكلمة (English)
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                المعنى
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((v) => (
              <TableRow key={v.id} className="border-b border-neutral-100 transition-colors last:border-0 hover:bg-primary-50/40 dark:border-neutral-800 dark:hover:bg-primary-500/5">
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
  );
}

export default function StudentVocabularyPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

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
      const res = await api.get<{ groups: readonly VocabGroup[] }>(`/lessons/${lessonId}/vocabulary`);
      return res.data?.groups ?? [];
    },
  });

  const isLoading = lessonLoading || vocabLoading;
  const isError = lessonError || vocabError;
  const error = lessonErr ?? vocabErr;
  const groups = vocabData ?? [];
  const totalCount = groups.reduce((acc, g) => acc + g.items.length, 0);
  const relationCount = groups
    .filter((g) => g.kind === "SYNONYM_ANTONYM" || g.items.some((i) => i.synonym ?? i.antonym))
    .reduce((acc, g) => acc + g.items.length, 0);

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
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-500/5 shadow-sm">
          <Languages className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            مفردات الدرس
          </h1>
          <p className="text-sm text-neutral-500">كلمات ومفردات الدرس مع المرادفات والمضادات</p>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="mb-6">
          <VocabularyStats
            words={totalCount}
            groups={groups.length}
            relations={relationCount}
          />
        </div>
      )}

      {totalCount === 0 ? (
        <EmptyState
          title="لا توجد مفردات مستوردة بعد"
          description="لم يتم استيراد أو إضافة أي مفردات لهذا الدرس حتى الآن."
          icon={<BookX className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />}
          actionLabel="تصفح الدروس"
          onAction={(): void => {
            router.push("/dashboard/lessons");
          }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => {
            const isRelKind = group.kind === "SYNONYM_ANTONYM";
            const hasRelData = group.items.some((i) => i.synonym ?? i.antonym);
            const isRelation = isRelKind || hasRelData;
            return (
              <div
                key={group.id ?? "__ungrouped__"}
                className="flex animate-[vocab-fade-slide-up_220ms_ease-out] flex-col gap-2"
              >
                {group.title !== null && (
                  <VocabularyGroupHeader
                    title={group.title}
                    count={group.items.length}
                    kind={group.kind}
                  />
                )}
                {isRelation ? (
                  <RelationVocabularyTable items={group.items} />
                ) : (
                  <StandardVocabTable items={group.items} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VocabularySkeleton(): ReactNode {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <div>
          <Skeleton className="mb-2 h-6 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-xl" />
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }, (_, gi) => (
          <div key={gi} className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-3 py-1.5">
              <Skeleton className="h-px w-24" />
              <Skeleton className="h-8 w-56 rounded-full" />
              <Skeleton className="h-px w-24" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
              {Array.from({ length: gi === 2 ? 5 : 8 }, (_, ri) => (
                <div
                  key={ri}
                  className="flex items-center gap-4 border-b border-neutral-100 px-4 py-3.5 last:border-0 dark:border-neutral-800"
                >
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
