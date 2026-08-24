"use client";

import { useMemo, useState, useCallback, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Move, CheckCircle2 } from "lucide-react";
import type { GameWord } from "@/lib/games/types";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface MemoryCard {
  id: string;
  pairId: number;
  content: string;
  type: "word" | "translation";
}

interface MemoryGameProps {
  words: GameWord[];
}

export function MemoryGame({ words }: MemoryGameProps): ReactNode {
  const cards = useMemo<MemoryCard[]>(() => {
    const pairs = words.flatMap((w, i) => [
      { id: `word-${String(i)}`, pairId: i, content: w.word, type: "word" as const },
      { id: `trans-${String(i)}`, pairId: i, content: w.translation, type: "translation" as const },
    ]);
    return shuffleArray(pairs);
  }, [words]);

  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);

  const handleCardClick = useCallback(
    (cardId: string, pairId: number): void => {
      if (matched.has(pairId) || flipped.has(cardId) || selected.length >= 2) return;
      const newFlipped = new Set(flipped);
      newFlipped.add(cardId);
      setFlipped(newFlipped);
      const newSelected = [...selected, cardId];
      setSelected(newSelected);

      if (newSelected.length === 2) {
        setMoves((prev) => prev + 1);
        const card1 = cards.find((c) => c.id === newSelected[0]);
        const card2 = cards.find((c) => c.id === newSelected[1]);
        if (!card1 || !card2) return;
        if (card1.pairId === card2.pairId && card1.type !== card2.type) {
          setTimeout(() => {
            setMatched((prev) => new Set(prev).add(pairId));
            setFlipped((prev) => {
              const next = new Set(prev);
              next.delete(card1.id);
              next.delete(card2.id);
              return next;
            });
            setSelected([]);
          }, 500);
        } else {
          setWrongIds(new Set([card1.id, card2.id]));
          setTimeout(() => {
            setFlipped((prev) => {
              const next = new Set(prev);
              next.delete(card1.id);
              next.delete(card2.id);
              return next;
            });
            setSelected([]);
            setWrongIds(new Set());
          }, 900);
        }
      }
    },
    [flipped, selected, matched, cards],
  );

  const allMatched = matched.size === words.length;

  const restart = useCallback((): void => {
    setMatched(new Set());
    setFlipped(new Set());
    setSelected([]);
    setWrongIds(new Set());
    setMoves(0);
  }, []);

  if (allMatched) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-500/10 text-success-500">
          <Trophy className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          أحسنت! وجدت جميع الأزواج
        </h3>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Move className="h-4 w-4" />
          {String(moves)} حركة
          <span className="text-neutral-300 dark:text-neutral-600">•</span>
          <CheckCircle2 className="h-4 w-4 text-success-500" />
          {String(words.length)} أزواج
        </div>
        <Button variant="primary" onClick={restart}>
          <RotateCcw className="ms-2 h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary">
          <Move className="h-3.5 w-3.5" />
          {String(moves)} حركة
        </Badge>
        <Badge variant="success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {String(matched.size)} / {String(words.length)} زوج
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {cards.map((card) => {
          const isFlipped = flipped.has(card.id) || matched.has(card.pairId);
          const isWrong = wrongIds.has(card.id);
          return (
            <button
              key={card.id}
              onClick={(): void => { handleCardClick(card.id, card.pairId); }}
              disabled={matched.has(card.pairId)}
              aria-label={isFlipped ? card.content : "بطاقة مخفية"}
              className="group aspect-[4/3] [perspective:1000px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <div
                className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                  isFlipped ? "[transform:rotateY(180deg)]" : ""
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-neutral-200 bg-neutral-50 [backface-visibility:hidden] transition-colors duration-200 group-hover:border-primary-500/30 dark:border-neutral-700 dark:bg-neutral-800/50">
                  <span className="text-2xl font-bold text-neutral-400">?</span>
                </div>
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-xl border-2 [backface-visibility:hidden] [transform:rotateY(180deg)] transition-colors duration-200 ${
                    isWrong
                      ? "border-danger-500 bg-danger-500/10"
                      : "border-primary-500/40 bg-primary-500/10"
                  }`}
                >
                  <span
                    dir="ltr"
                    className={`break-words px-2 text-center text-base font-bold leading-tight sm:text-lg ${
                      isWrong
                        ? "text-danger-400"
                        : "text-neutral-900 dark:text-neutral-100"
                    }`}
                  >
                    {card.content}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
