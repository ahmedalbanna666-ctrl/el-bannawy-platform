"use client";

import { memo, type ReactNode, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, ArrowUp, ArrowDown, HelpCircle, BookOpen } from "lucide-react";
import { formatMcqAnswer } from "@/lib/mcq-format";

export interface StudentQuestion {
  id: string;
  type: string;
  question: string;
  options: string | null;
  displayOrder: number;
  passageText?: string | null;
}

interface QuestionCardProps {
  readonly question: StudentQuestion;
  readonly index: number;
  readonly selectedAnswer: string;
  readonly isSubmitted: boolean;
  readonly correctAnswer?: string | null;
  readonly explanation?: string | null;
  readonly isAnswerCorrect?: boolean | null;
  readonly showResult?: boolean;
  readonly onAnswerChange: (index: number, value: string) => void;
}

export const QuestionCard = memo(function QuestionCard({
  question, index, selectedAnswer, isSubmitted, correctAnswer, explanation, isAnswerCorrect,
  showResult = false, onAnswerChange,
}: QuestionCardProps): ReactNode {
  const isWrong = isSubmitted && isAnswerCorrect === false;
  const isCorrect = isSubmitted && isAnswerCorrect === true;

  const borderClass =
    isSubmitted && showResult
      ? isWrong
        ? "border-danger-500/40 bg-danger-500/5"
        : isCorrect
          ? "border-success-500/40 bg-success-500/5"
          : "border-neutral-200 dark:border-neutral-700"
      : "border-neutral-200 dark:border-neutral-700";

  const studentAnswerText = isSubmitted && showResult ? selectedAnswer : "";
  const isMcq = question.type === "MULTIPLE_CHOICE";
  const displayStudentAnswer = isMcq ? formatMcqAnswer(question.options, selectedAnswer) : studentAnswerText;
  const displayCorrectAnswer = isMcq ? formatMcqAnswer(question.options, correctAnswer) : correctAnswer;

  return (
    <Card variant="outline" padding="sm" className={borderClass}>
      <CardContent>
        <div className="flex flex-col gap-3" dir="ltr">
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-base font-extrabold text-primary-500 leading-relaxed">
              {index + 1}.
            </span>
            {((): ReactNode => {
              const [prefix] = extractPrefix(question.question);
              return prefix ? (
                <span className="shrink-0 rounded-lg bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[11px] font-bold text-black dark:text-white leading-normal">
                  {prefix}
                </span>
              ) : null;
            })()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-relaxed max-md:text-[clamp(0.8125rem,3.6vw,0.875rem)]" dir="ltr">
                {renderQuestionText(question.question)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              {showResult && isSubmitted && (
                isCorrect
                  ? <CheckCircle className="h-5 w-5 text-emerald-500" />
                  : isWrong
                    ? <XCircle className="h-5 w-5 text-red-500" />
                    : null
              )}
            </div>
          </div>

          <div className="pr-1 sm:pr-10">
            <QuestionRenderer
              question={question}
              index={index}
              selectedAnswer={selectedAnswer}
              isSubmitted={isSubmitted}
              showResult={showResult}
              correctAnswer={correctAnswer}
              isCorrect={isCorrect}
              isWrong={isWrong}
              onAnswerChange={onAnswerChange}
            />
          </div>

          {showResult && isSubmitted && (
            <div className="flex flex-col gap-1.5 pr-10">
              {isWrong && displayStudentAnswer && (
                <p className="text-xs text-red-500">
                  إجابتك: <span className="font-semibold">{displayStudentAnswer}</span>
                </p>
              )}
              {displayCorrectAnswer && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  الإجابة الصحيحة: <span className="font-semibold">{displayCorrectAnswer}</span>
                </p>
              )}
            </div>
          )}

          {showResult && explanation && (
            <div className="pr-10">
              <p className="flex items-start gap-1 text-xs italic text-neutral-400">
                <HelpCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {explanation}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// ── Renderers ─────────────────────────────────────────────────────────

function QuestionRenderer({
  question, index, selectedAnswer, isSubmitted, showResult, correctAnswer, isCorrect, isWrong, onAnswerChange,
}: {
  question: StudentQuestion; index: number; selectedAnswer: string; isSubmitted: boolean;
  showResult: boolean; correctAnswer?: string | null; isCorrect: boolean; isWrong: boolean;
  onAnswerChange: (index: number, value: string) => void;
}): ReactNode {
  const type = question.type;

  if (type === "TRUE_FALSE") return renderTrueFalseInline(index, selectedAnswer, isSubmitted, showResult, correctAnswer, isCorrect, isWrong, onAnswerChange);
  if (type === "MULTIPLE_CHOICE") {
    const options = parseOptions(question.options);
    if (options.length > 0) return renderMCQGrid(options, index, selectedAnswer, isSubmitted, showResult, correctAnswer, isCorrect, isWrong, onAnswerChange);
  }
  if (type === "MATCHING") return renderMatching(question, index, selectedAnswer, isSubmitted, onAnswerChange);
  if (type === "ORDERING") return renderOrdering(question, index, selectedAnswer, isSubmitted, onAnswerChange);
  if (type === "DIALOGUE" || type === "DIALOGUE_QUESTION") return renderDialogue(question, index, selectedAnswer, isSubmitted, onAnswerChange);
  if (type === "DRAG_DROP") return renderDragDrop(question, index, selectedAnswer, isSubmitted, onAnswerChange);
  if (type === "READING" || type === "READING_QUESTION") return renderReading(question, index, selectedAnswer, isSubmitted, onAnswerChange);
  if (type === "ESSAY" || type === "WRITING") return renderEssay(question, index, selectedAnswer, isSubmitted, onAnswerChange);
  if (type === "FILL_IN_BLANKS" || type === "GRAMMAR") return renderTextInput(question, index, selectedAnswer, isSubmitted, onAnswerChange);

  return renderTextInput(question, index, selectedAnswer, isSubmitted, onAnswerChange);
}

function parseOptions(s: string | null): string[] {
  if (!s) return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const p = JSON.parse(s);
    return Array.isArray(p) ? p.map((o: unknown) => (typeof o === "string" ? o : ((o as { text?: string }).text ?? ""))) : [];
  } catch { return []; }
}

function parseWordBank(s: string | null): string[] {
  if (!s) return [];
  try { return JSON.parse(s) as string[]; } catch { return []; }
}

function parseMatchingPairs(s: string | null): { left: string; right: string }[] {
  if (!s) return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const p = JSON.parse(s);
    return Array.isArray(p) ? p as { left: string; right: string }[] : []; }
  catch { return []; }
}

function extractPrefix(text: string): [string | null, string] {
  const match = /^(AB|SB|WB|LM|R[1-3])\s+([\s\S]*)/.exec(text);
  return match ? [match[1], match[2]] : [null, text];
}

export const QUESTION_GROUP_HEADINGS: Record<string, string> = {
  MULTIPLE_CHOICE: "Choose the correct answer from a, b, c, or d",
  TRUE_FALSE: "Read and write (T) True or (F) False",
  FILL_IN_BLANKS: "Complete the sentences with the correct form of the word(s) in brackets",
  SHORT_ANSWER: "Answer the following questions",
  ESSAY: "Write a paragraph",
  WRITING: "Write a paragraph",
  MATCHING: "Match the words with their meanings",
  ORDERING: "Put the words in the correct order",
  DIALOGUE: "Complete the following dialogue",
  DIALOGUE_QUESTION: "Complete the following dialogue",
  DRAG_DROP: "Read and complete the text with the words in the box",
  READING: "Read the following text, then answer the questions",
  READING_QUESTION: "Read the following text, then answer the questions",
  GRAMMAR: "Complete the sentences with the correct form of the word(s) in brackets",
};

export interface QuestionGroup {
  heading: string;
  questions: { question: StudentQuestion; originalIndex: number }[];
}

export function groupQuestions(questions: StudentQuestion[]): QuestionGroup[] {
  const groups = new Map<string, QuestionGroup>();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const key = q.type;
    let group = groups.get(key);
    if (!group) {
      group = { heading: QUESTION_GROUP_HEADINGS[key] ?? key, questions: [] };
      groups.set(key, group);
    }
    group.questions.push({ question: q, originalIndex: i });
  }
  return [...groups.values()];
}

function renderQuestionText(text: string): ReactNode {
  const [, rest] = extractPrefix(text);
  return renderHighlightedText(rest);
}

function renderHighlightedText(text: string): ReactNode {
  const parts = text.split(/(\([^)]*\))/g);
  return parts.map((part, i) =>
    part.startsWith("(") && part.endsWith(")")
      ? <span key={i} className="font-bold">(<span className="text-rose-700 dark:text-rose-400">{part.slice(1, -1)}</span>)</span>
      : part,
  );
}

// ── MCQ Grid ───────────────────────────────────────────────────────

function renderMCQGrid(
  options: string[], index: number, selectedAnswer: string, isSubmitted: boolean,
  showResult: boolean, correctAnswer: string | null | undefined,
  _isCorrect: boolean, _isWrong: boolean,
  onAnswerChange: (index: number, value: string) => void,
): ReactNode {
  // On mobile, show a 2×2 grid when every option is short enough to fit
  // comfortably; fall back to one-per-row automatically when any option is long.
  const longestOptionLength = options.reduce((max, opt) => Math.max(max, opt.length), 0);
  const isCompact = options.length >= 2 && longestOptionLength <= 18;
  return (
    <div className={`grid gap-1.5 sm:gap-2 ${isCompact ? "grid-cols-2" : "grid-cols-1"} sm:grid-cols-2 lg:grid-cols-4`}>
      {options.map((opt, oi) => {
        const val = String(oi);
        const isSelected = selectedAnswer === val;
        const label = String.fromCharCode(65 + oi);
        const isCorrectOpt = showResult && val === correctAnswer;

        const styleClass = isSubmitted && showResult
          ? isCorrectOpt
            ? "border-success-500/70 bg-success-500/10 text-success-700 dark:text-success-300"
            : isSelected
              ? "border-amber-500/70 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              : "border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
          : isSubmitted
            ? "border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
            : isSelected
              ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
              : "border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50";

        const badgeClass = isSubmitted && showResult
          ? isCorrectOpt
            ? "bg-success-500 text-white"
            : isSelected
              ? "bg-amber-500 text-white"
              : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700"
          : isSubmitted
            ? "bg-neutral-200 text-neutral-500 dark:bg-neutral-700"
            : isSelected
              ? "bg-amber-500 text-white"
              : "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300";

        return (
          <button key={oi} type="button"
            onClick={(): void => { if (!isSubmitted) onAnswerChange(index, val); }}
            disabled={isSubmitted}
            className={`flex w-full flex-row items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm text-start transition-colors shadow-sm sm:gap-2 sm:px-3 sm:py-2 ${styleClass}`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${badgeClass}`}>
              {label}
            </span>
            <span className="min-w-0 flex-1 leading-relaxed max-md:text-[clamp(0.8125rem,3.6vw,0.875rem)] [overflow-wrap:anywhere]">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── TRUE/FALSE ────────────────────────────────────────────────────

function renderTrueFalseInline(
  index: number, selectedAnswer: string, isSubmitted: boolean,
  showResult: boolean, correctAnswer: string | null | undefined,
  _isCorrect: boolean, _isWrong: boolean,
  onAnswerChange: (index: number, value: string) => void,
): ReactNode {
  return (
    <div className="grid w-full grid-cols-2 gap-1.5 sm:inline-flex sm:flex sm:w-auto sm:gap-1.5">
      {[["true", "T"], ["false", "F"]].map(([val, label]) => {
        const isSelected = selectedAnswer === val;
        const isCorrectOpt = showResult && val === correctAnswer;
        const styleClass = isSubmitted && showResult
          ? isCorrectOpt
            ? "bg-success-500 text-white"
            : isSelected
              ? "bg-amber-500 text-white"
              : "bg-neutral-200 text-neutral-400 dark:bg-neutral-700"
          : isSubmitted
            ? "bg-neutral-200 text-neutral-400 dark:bg-neutral-700"
            : isSelected
              ? "bg-amber-500 text-white"
              : "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/50";
        return (
          <button key={val} type="button"
            onClick={(): void => { if (!isSubmitted) onAnswerChange(index, val); }}
            disabled={isSubmitted}
            className={`flex h-7 w-full items-center justify-center rounded-md px-2 text-xs font-bold transition-colors sm:w-auto sm:min-w-[32px] ${styleClass}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── MATCHING ──────────────────────────────────────────────────────

function renderMatching(
  question: StudentQuestion, index: number, selectedAnswer: string, isSubmitted: boolean,
  onAnswerChange: (index: number, value: string) => void,
): ReactNode {
  const pairs = parseMatchingPairs(question.options);
  if (pairs.length === 0) return renderTextInput(question, index, selectedAnswer, isSubmitted, onAnswerChange);

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);

  const handleMatch = (rightIdx: number): void => {
    if (isSubmitted || selectedLeft === null) return;
    const current = ((): { left: string; right: string }[] => { try { return JSON.parse(selectedAnswer || "[]") as { left: string; right: string }[]; } catch { return []; } })();
    const updated = [...current.filter((m) => m.left !== pairs[selectedLeft].left), { left: pairs[selectedLeft].left, right: pairs[rightIdx].right }];
    onAnswerChange(index, JSON.stringify(updated));
    setSelectedLeft(null);
  };

  const getMatched = (leftItem: string): string | null => {
    try { return (JSON.parse(selectedAnswer || "[]") as { left: string; right: string }[]).find((m) => m.left === leftItem)?.right ?? null; }
    catch { return null; }
  };

  const col = (items: { left: string; right: string }[], isLeft: boolean): ReactNode =>
    items.map((p, pi) => {
      const matched = isLeft ? getMatched(p.left) : ((): boolean => { try { return (JSON.parse(selectedAnswer || "[]") as { left: string; right: string }[]).some((m) => m.right === p.right); } catch { return false; } })();
      const isMatched = matched !== null && matched !== false;
      return (
        <button key={pi} type="button"
          onClick={(): void => { if (isLeft && !isSubmitted) setSelectedLeft(pi); else if (!isLeft && !isSubmitted) handleMatch(pi); }}
          disabled={isSubmitted || isMatched || (!isLeft && selectedLeft === null)}
          className={`rounded-lg border px-3 py-2 text-sm text-start transition-colors ${
            isMatched
              ? "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
              : isLeft && selectedLeft === pi
                ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50"
          }`}
        >
          {isLeft ? p.left : p.right}
        </button>
      );
    });

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-neutral-500 mb-1">اختر من اليمين ثم اليسار للتوصيل</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">{col(pairs, true)}</div>
        <div className="flex flex-col gap-2">{col(pairs, false)}</div>
      </div>
    </div>
  );
}

// ── ORDERING ──────────────────────────────────────────────────────

function renderOrdering(
  question: StudentQuestion, index: number, selectedAnswer: string, isSubmitted: boolean,
  onAnswerChange: (index: number, value: string) => void,
): ReactNode {
  const items = parseOptions(question.options);
  if (items.length === 0) return renderTextInput(question, index, selectedAnswer, isSubmitted, onAnswerChange);

  const getOrder = (): string[] => {
    if (!selectedAnswer) return [...items];
    try { return JSON.parse(selectedAnswer) as string[]; } catch { return [...items]; }
  };
  const order = getOrder();

  const move = (idx: number, dir: "up" | "down"): void => {
    if (isSubmitted) return;
    const t = dir === "up" ? idx - 1 : idx + 1;
    if (t < 0 || t >= order.length) return;
    const u = [...order]; u[idx] = order[t]; u[t] = order[idx];
    onAnswerChange(index, JSON.stringify(u));
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-neutral-500 mb-1">رتب بالأسهم</p>
      {order.map((item, idx) => (
        <div key={`${item}-${String(idx)}`}
          className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-100 text-xs font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
            {idx + 1}
          </span>
          <span className="flex-1 text-sm text-neutral-800 dark:text-neutral-200">{item}</span>
          {!isSubmitted && (
            <div className="flex gap-1">
              <button type="button" disabled={idx === 0}
                onClick={(): void => { move(idx, "up"); }}
                className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-700">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={idx === order.length - 1}
                onClick={(): void => { move(idx, "down"); }}
                className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-700">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── DIALOGUE ──────────────────────────────────────────────────────

interface DialogueLine {
  speaker: string;
  text: string;
  hasBlank?: boolean;
}

function renderDialogue(
  question: StudentQuestion, index: number, selectedAnswer: string, isSubmitted: boolean,
  onAnswerChange: (index: number, value: string) => void,
): ReactNode {
  const lines = parseDialogueLines(question.options);
  if (lines.length > 0) {
    // Detect blanks by content: any run of dots, any `(N)` between parentheses,
    // or any run of underscores marks an answer place — no matter the hasBlank flag.
    const lineSegments = lines.map((line) => splitDialogueSegments(line.text));
    const blankCount = lineSegments.reduce(
      (sum, segs) => sum + segs.filter((s) => s.type === "blank").length,
      0,
    );
    const values = parseDialogueAnswers(selectedAnswer, blankCount);
    let blankIndex = 0;
    const setValue = (bi: number, value: string): void => {
      const next = [...values];
      next[bi] = value;
      onAnswerChange(index, JSON.stringify(next));
    };

    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-primary-300 bg-primary-50/50 p-4 dark:border-primary-700 dark:bg-primary-900/10">
        {lines.map((line, li) => {
          const segments = lineSegments[li];
          const hasBlank = segments.some((s) => s.type === "blank");
          return (
            <div key={li} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0 rounded-md bg-primary-100 px-2 py-0.5 text-[11px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {line.speaker}
              </span>
              {hasBlank ? (
                <span className="text-neutral-600 dark:text-neutral-400">
                  {segments.map((seg, si) => {
                    if (seg.type === "text") return <span key={si}>{seg.value}</span>;
                    const numMatch = /\((\d+)\)/.exec(seg.value);
                    const bi = blankIndex;
                    blankIndex += 1;
                    return (
                      <span key={si} className="inline-flex items-center gap-1 align-middle">
                        {numMatch && (
                          <span className="text-[11px] font-bold text-primary-500">{numMatch[1]}.</span>
                        )}
                        <input
                          type="text"
                          value={values[bi]}
                          onChange={(e): void => { if (!isSubmitted) setValue(bi, e.target.value); }}
                          disabled={isSubmitted}
                          placeholder="..."
                          style={{ width: `${String(Math.max(6, values[bi].length + 2))}ch`, minWidth: "6rem" }}
                          className={`inline-block rounded border-b-2 px-2 py-0.5 text-sm outline-none transition-[width] duration-100 focus:border-primary-500 ${
                            isSubmitted ? "border-neutral-300 bg-neutral-100 text-neutral-500 dark:bg-neutral-800" : "border-primary-300 bg-white text-neutral-900 dark:border-primary-500 dark:bg-neutral-800 dark:text-neutral-100"
                          }`} dir="auto"
                        />
                      </span>
                    );
                  })}
                </span>
              ) : (
                <span className="text-neutral-700 dark:text-neutral-300">{line.text}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  const parts = extractDialogueParts(question.question);
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-primary-300 bg-primary-50/50 p-3 dark:border-primary-700 dark:bg-primary-900/10">
      {parts.prefix && <span className="mt-2 shrink-0 text-xs font-semibold text-neutral-500">{parts.prefix}</span>}
      <div className="flex-1">
        {parts.before && <span className="text-sm text-neutral-600 dark:text-neutral-400" dir="auto">{parts.before} </span>}
        <input type="text" value={selectedAnswer}
          onChange={(e): void => { if (!isSubmitted) onAnswerChange(index, e.target.value); }}
          disabled={isSubmitted}
          placeholder="..."
          style={{ width: `${String(Math.max(6, selectedAnswer.length + 2))}ch`, minWidth: "6rem" }}
          className={`inline-block rounded border-b-2 px-2 py-1 text-sm outline-none transition-[width] duration-100 focus:border-primary-500 ${
            isSubmitted ? "border-neutral-300 bg-neutral-100 text-neutral-500 dark:bg-neutral-800" : "border-primary-300 bg-white text-neutral-900 dark:border-primary-500 dark:bg-neutral-800 dark:text-neutral-100"
          }`} dir="auto"
        />
        {parts.after && <span className="text-sm text-neutral-600 dark:text-neutral-400" dir="auto"> {parts.after}</span>}
      </div>
    </div>
  );
}

interface DialogueSegment {
  type: "text" | "blank";
  value: string;
}

function splitDialogueSegments(text: string): DialogueSegment[] {
  const segments: DialogueSegment[] = [];
  const regex = /(?:\(\d+\)\s*)?(?:\.{2,}|_{2,})|\(\d+\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "blank", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  if (segments.length === 0) {
    segments.push({ type: "text", value: text });
  }
  return segments;
}

function parseDialogueAnswers(selectedAnswer: string, count: number): string[] {
  const empty = Array.from({ length: count }, () => "");
  if (!selectedAnswer) return empty;
  try {
    const parsed: unknown = JSON.parse(selectedAnswer);
    if (!Array.isArray(parsed)) return empty;
    return Array.from({ length: count }, (_, i) => {
      const v: unknown = parsed[i];
      return typeof v === "string" ? v : "";
    });
  } catch {
    return [selectedAnswer, ...empty.slice(1)];
  }
}

function parseDialogueLines(options: string | null): DialogueLine[] {
  if (!options) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(options);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const first = parsed[0] as Record<string, unknown> | undefined;
  if (first && typeof first === "object" && typeof first.speaker === "string" && typeof first.text === "string") {
    return parsed as DialogueLine[];
  }

  const nestedText = first?.text;
  if (typeof nestedText === "string") {
    try {
      const nested: unknown = JSON.parse(nestedText);
      if (
        Array.isArray(nested) &&
        typeof (nested[0] as Record<string, unknown> | undefined)?.speaker === "string"
      ) {
        return nested as DialogueLine[];
      }
    } catch {
      return [];
    }
  }

  return [];
}

function extractDialogueParts(prompt: string): { prefix: string | null; before: string; after: string } {
  const m = /^(.{0,60}?)(\.{3,}\s*)(.+)$/.exec(prompt);
  if (m) return { prefix: null, before: m[2].trim(), after: m[3].trim() };
  return { prefix: null, before: prompt, after: "" };
}

// ── DRAG_DROP ─────────────────────────────────────────────────────

function renderDragDrop(
  question: StudentQuestion, index: number, selectedAnswer: string, isSubmitted: boolean,
  onAnswerChange: (index: number, value: string) => void,
): ReactNode {
  const bank = parseWordBank(question.options);
  return (
    <div className="flex flex-col gap-3">
      {bank.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-3 dark:border-amber-700 dark:bg-amber-900/10">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">بنك الكلمات:</span>
          {bank.map((w, wi) => (
            <span key={wi} className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-neutral-800 dark:text-amber-300">
              {w}
            </span>
          ))}
        </div>
      )}
      {renderTextInput(question, index, selectedAnswer, isSubmitted, onAnswerChange)}
    </div>
  );
}

// ── READING ───────────────────────────────────────────────────────

function renderReading(
  question: StudentQuestion, index: number, selectedAnswer: string, isSubmitted: boolean,
  onAnswerChange: (index: number, value: string) => void,
): ReactNode {
  return (
    <div className="flex flex-col gap-3">
      {question.passageText && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary-500" />
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">القطعة</span>
          </div>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300" dir="auto">{question.passageText}</p>
        </div>
      )}
      {renderTextInput(question, index, selectedAnswer, isSubmitted, onAnswerChange)}
    </div>
  );
}

// ── ESSAY ─────────────────────────────────────────────────────────

function renderEssay(
  question: StudentQuestion, index: number, selectedAnswer: string, isSubmitted: boolean,
  onAnswerChange: (index: number, value: string) => void,
): ReactNode {
  const wc = selectedAnswer ? selectedAnswer.split(/\s+/).filter(Boolean).length : 0;
  return (
    <div>
      <textarea value={selectedAnswer}
        onChange={(e): void => { if (!isSubmitted) onAnswerChange(index, e.target.value); }}
        disabled={isSubmitted} rows={5}
        className={`w-full resize-y rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 ${
          isSubmitted ? "border-neutral-200 bg-neutral-100 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800" : "border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        }`} dir="auto" placeholder="اكتب إجابتك..."
      />
      {!isSubmitted && <p className="mt-1 text-xs text-neutral-400">عدد الكلمات: {wc}</p>}
    </div>
  );
}

// ── Text Input ────────────────────────────────────────────────────

function renderTextInput(
  question: StudentQuestion, index: number, selectedAnswer: string, isSubmitted: boolean,
  onAnswerChange: (index: number, value: string) => void,
  placeholder?: string,
): ReactNode {
  return (
    <Input value={selectedAnswer}
      onChange={(e): void => { if (!isSubmitted) onAnswerChange(index, e.target.value); }}
      disabled={isSubmitted}
      placeholder={placeholder ?? "اكتب إجابتك..."}
      className={isSubmitted ? "border-neutral-200 bg-neutral-100 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800" : ""}
      dir="auto"
    />
  );
}
