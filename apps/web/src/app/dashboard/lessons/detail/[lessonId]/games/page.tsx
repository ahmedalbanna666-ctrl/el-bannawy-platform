"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { MemoryGame } from "@/components/games/memory-game";
import {
  ArrowRight,
  ChevronLeft,
  Shuffle,
  Brain,
  Mic,
  Headphones,
  CheckCircle,
  RotateCcw,
  BookOpen,
  Sparkles,
} from "lucide-react";

interface LessonVocabulary {
  id: string;
  word: string;
  translation: string;
}

interface GameWord {
  word: string;
  translation: string;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Matching Game ─────────────────────────────────────────────────────

function MatchingGame({ words }: { words: GameWord[] }): ReactNode {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);

  const shuffledWords = useMemo(() => shuffleArray(words), [words]);
  const shuffledTranslations = useMemo(() => shuffleArray([...words]), [words]);

  const handleWordClick = (word: string): void => {
    if (matched.has(word)) return;
    setSelectedWord(word);
    setWrong(null);
  };

  const handleTranslationClick = (translation: string, word: string): void => {
    if (!selectedWord || matched.has(word)) return;
    if (selectedWord === word) {
      setMatched((prev) => new Set(prev).add(word));
      setSelectedWord(null);
      setWrong(null);
    } else {
      setWrong(word);
      setTimeout(() => { setWrong(null); }, 800);
    }
  };

  const allMatched = matched.size === words.length;

  if (allMatched) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle className="h-16 w-16 text-success-500" />
        <h3 className="text-xl font-bold text-neutral-100">أحسنت! جميع الكلمات متطابقة</h3>
        <Button variant="primary" onClick={(): void => { setMatched(new Set()); setSelectedWord(null); }}>
          <RotateCcw className="ml-2 h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" dir="ltr">
        {shuffledWords.map((w) => (
          <button
            key={w.word}
            onClick={(): void => { handleWordClick(w.word); }}
            disabled={matched.has(w.word)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              matched.has(w.word)
                ? "border-success-500/30 bg-success-500/10 text-success-400 opacity-50"
                : selectedWord === w.word
                  ? "border-primary-500 bg-primary-500/15 text-primary-400 shadow-lg shadow-primary-500/20 scale-105"
                  : "border-neutral-700 bg-neutral-800/50 text-neutral-200 hover:border-primary-500/50 hover:text-primary-400"
            }`}
          >
            {w.word}
          </button>
        ))}
      </div>

      <div className="h-px bg-white/5" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shuffledTranslations.map((t) => {
          const isMatched = matched.has(t.word);
          const isWrong = wrong === t.word;
          return (
            <button
              key={t.word}
              onClick={(): void => { handleTranslationClick(t.translation, t.word); }}
              disabled={isMatched}
              className={`rounded-xl border px-3 py-3 text-sm transition-all ${
                isMatched
                  ? "border-success-500/20 bg-success-500/5 text-success-400 opacity-40"
                  : isWrong
                    ? "border-danger-500 bg-danger-500/10 text-danger-400 animate-shake"
                    : selectedWord
                      ? "border-neutral-600 bg-neutral-800/30 text-neutral-300 hover:border-primary-500/50 hover:text-primary-400 cursor-pointer"
                      : "border-neutral-700 bg-neutral-800/30 text-neutral-500 cursor-default"
              }`}
            >
              {t.translation}
            </button>
          );
        })}
      </div>

      {!selectedWord && (
        <p className="text-center text-sm text-neutral-500">اختر كلمة ثم اختر ترجمتها</p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function LessonGamesPage(): ReactNode {
  const params = useParams();

  const lessonId = params.lessonId as string;

  const { data: lesson, isLoading, isError } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const res = await api.get<{ title: string; unit: { title: string } }>(`/lessons/${lessonId}`);
      return res.data ?? null;
    },
  });

  const { data: vocabData } = useQuery({
    queryKey: ["lesson-vocabulary", lessonId],
    queryFn: async () => {
      const res = await api.get<LessonVocabulary[]>(`/lessons/${lessonId}/vocabulary`);
      return res.data ?? [];
    },
  });

  const { data: games } = useQuery({
    queryKey: ["lesson-games", lessonId],
    queryFn: async () => {
      const res = await api.get<Record<string, { enabled: boolean; wordsPerGame?: number }>>(`/lessons/${lessonId}/games`);
      return res.data ?? {};
    },
  });

  const DEFAULT_WORDS_PER_GAME = 10;
  const firstGame = Object.values(games ?? {})[0];
  const wordsPerGame = firstGame.wordsPerGame ?? DEFAULT_WORDS_PER_GAME;

  const words: GameWord[] = useMemo(() => {
    const all = (vocabData ?? []).map((v) => ({ word: v.word, translation: v.translation }));
    return shuffleArray(all).slice(0, Math.min(wordsPerGame, all.length));
  }, [vocabData, wordsPerGame]);

  const [activeGame, setActiveGame] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !lesson) {
    return <ErrorState title="فشل تحميل الأنشطة" description="حدث خطأ أثناء تحميل الأنشطة التعليمية" />;
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/lessons/detail/${lessonId}`} className="text-neutral-400 hover:text-primary-500 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-neutral-100">الأنشطة التعليمية</h1>
        </div>
        <EmptyState
          title="لا توجد كلمات في هذا الدرس"
          description="يجب إضافة مفردات للدرس أولاً لتشغيل الأنشطة التعليمية"
          icon={<BookOpen className="h-16 w-16" />}
        />
      </div>
    );
  }

  const enabledGames = Object.entries(games ?? {}).filter(([, v]) => v.enabled).map(([k]) => k);

  if (enabledGames.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/lessons/detail/${lessonId}`} className="text-neutral-400 hover:text-primary-500 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-neutral-100">الأنشطة التعليمية</h1>
        </div>
        <EmptyState
          title="لا توجد ألعاب مفعلة"
          description="لم يقم المعلم بتفعيل أي ألعاب لهذا الدرس بعد"
          icon={<Sparkles className="h-16 w-16" />}
        />
      </div>
    );
  }

  const GAME_CONFIG: Record<string, { label: string; icon: ReactNode; color: string; href?: string }> = {
    "listening-challenge": { label: "تحدي الاستماع", icon: <Headphones className="h-5 w-5" />, color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400", href: `/dashboard/games/listening-challenge` },
    "pronunciation-challenge": { label: "تحدي النطق", icon: <Mic className="h-5 w-5" />, color: "border-amber-500/30 bg-amber-500/5 text-amber-400", href: `/dashboard/games/pronunciation-challenge` },
    matching: { label: "المطابقة", icon: <Shuffle className="h-5 w-5" />, color: "border-primary-500/30 bg-primary-500/5 text-primary-400" },
    memory: { label: "اختبار الذاكرة", icon: <Brain className="h-5 w-5" />, color: "border-purple-500/30 bg-purple-500/5 text-purple-400" },
  };

  if (activeGame) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <button onClick={(): void => { setActiveGame(null); }} className="text-neutral-400 hover:text-primary-500 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-neutral-100">{GAME_CONFIG[activeGame].label}</h1>
          <Badge variant="secondary" className="mr-auto">{words.length} كلمة</Badge>
        </div>

        <Card variant="glass" padding="lg">
          <CardContent>
            {activeGame === "matching" && <MatchingGame words={words} />}
            {activeGame === "memory" && <MemoryGame words={words} />}
          </CardContent>
        </Card>

        <Link href={`/dashboard/lessons/detail/${lessonId}`} className="text-sm text-neutral-500 hover:text-primary-500 transition-colors flex items-center gap-1">
          <ArrowRight className="h-4 w-4" />
          العودة للدرس
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Link href={`/dashboard/lessons/detail/${lessonId}`} className="text-neutral-400 hover:text-primary-500 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-neutral-100">الأنشطة التعليمية</h1>
        <Badge variant="secondary" className="mr-auto">{words.length} كلمة</Badge>
      </div>

      <p className="text-sm text-neutral-500">
        اختر أحد الأنشطة التعليمية التالية. جميع الأنشطة تستخدم كلمات هذا الدرس تلقائياً.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {enabledGames.map((gameId) => {
          const config = GAME_CONFIG[gameId] ?? { label: gameId, icon: <Sparkles className="h-5 w-5" />, color: "border-neutral-700" };
          const card = (
            <Card variant="elevated" padding="lg" className="group cursor-pointer transition-all hover:-translate-y-0.5 h-full">
              <CardContent>
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${config.color}`}>
                  {config.icon}
                </div>
                <h3 className="font-semibold text-neutral-100 group-hover:text-primary-400 transition-colors">
                  {config.label}
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  {config.href ? "لعبة منصة كاملة" : `استخدم ${String(words.length)} كلمة من درس "${lesson.title}"`}
                </p>
              </CardContent>
            </Card>
          );
          if (config.href) {
            return <Link key={gameId} href={config.href} className="text-right">{card}</Link>;
          }
          return <button key={gameId} onClick={(): void => { setActiveGame(gameId); }} className="text-right">{card}</button>;
        })}
      </div>
    </div>
  );
}
