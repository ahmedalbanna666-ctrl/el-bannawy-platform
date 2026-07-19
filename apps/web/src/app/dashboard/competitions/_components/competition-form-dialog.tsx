"use client";

import { type ReactNode, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useAcademicContextStore } from "@/lib/academic-context-store";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

interface GradeOption {
  id: string;
  name: string;
}

export interface CompetitionQuestionInput {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface CreateCompetitionPayload {
  title: string;
  description?: string;
  mode: "QUIZ" | "XP_SPRINT";
  gradeId: string;
  academicYearId: string;
  termId: string;
  xpReward?: number;
  coinReward?: number;
  questions?: CompetitionQuestionInput[];
}

interface CompetitionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

const EMPTY_QUESTION: CompetitionQuestionInput = {
  question: "",
  options: ["", "", ""],
  correctIndex: 0,
};

export function CompetitionFormDialog({
  open,
  onClose,
  onCreated,
}: CompetitionFormDialogProps): ReactNode {
  const userId = useAuthStore((s) => s.user?.id);
  const { academicYearId, termId } = useAcademicContextStore();

  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"QUIZ" | "XP_SPRINT">("QUIZ");
  const [gradeId, setGradeId] = useState("");
  const [xpReward, setXpReward] = useState("100");
  const [coinReward, setCoinReward] = useState("50");
  const [questions, setQuestions] = useState<CompetitionQuestionInput[]>([
    { ...EMPTY_QUESTION },
    { ...EMPTY_QUESTION },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect((): (() => void) => {
    let active = true;
    void api
      .get<{ gradeIds: string[]; grades: GradeOption[] }>("/teachers/my-grades")
      .then((res) => {
        if (active && res.data?.grades) setGrades(res.data.grades);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function updateQuestion(index: number, patch: Partial<CompetitionQuestionInput>): void {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function updateOption(qIndex: number, oIndex: number, value: string): void {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const options = q.options.map((o, oi) => (oi === oIndex ? value : o));
        return { ...q, options };
      }),
    );
  }

  function reset(): void {
    setTitle("");
    setDescription("");
    setMode("QUIZ");
    setGradeId("");
    setXpReward("100");
    setCoinReward("50");
    setQuestions([{ ...EMPTY_QUESTION }, { ...EMPTY_QUESTION }]);
    setError(null);
  }

  async function handleSubmit(): Promise<void> {
    if (!userId || !academicYearId || !termId) {
      setError("يرجى تحديد السياق الأكاديمي أولاً");
      return;
    }
    if (!title.trim()) {
      setError("العنوان مطلوب");
      return;
    }
    if (!gradeId) {
      setError("يرجى اختيار الصف");
      return;
    }
    if (mode === "QUIZ") {
      const valid = questions.every(
        (q) =>
          q.question.trim() &&
          q.options.filter((o) => o.trim()).length >= 2 &&
          q.correctIndex >= 0,
      );
      if (!valid) {
        setError("يرجى إكمال جميع الأسئلة والخيارات وتحديد الإجابة الصحيحة");
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateCompetitionPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        mode,
        gradeId,
        academicYearId,
        termId,
        xpReward: Number(xpReward) || 0,
        coinReward: Number(coinReward) || 0,
      };
      if (mode === "QUIZ") {
        payload.questions = questions.map((q) => ({
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
          correctIndex: q.correctIndex,
        }));
      }
      const res = await api.post<{ id: string }>("/competitions", payload);
      if (res.data?.id) {
        reset();
        onClose();
        onCreated(res.data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إنشاء المسابقة");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="إنشاء مسابقة جديدة">
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              العنوان
            </label>
            <Input
              value={title}
              onChange={(e) => { setTitle(e.target.value); }}
              placeholder="مثال: مسابقة الرياضيات الأسبوعية"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              الوصف
            </label>
            <Textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
              placeholder="وصف اختياري للمسابقة"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                نوع المسابقة
              </label>
              <Select
                value={mode}
                onChange={(e) => { setMode(e.target.value as "QUIZ" | "XP_SPRINT"); }}
                options={[
                  { value: "QUIZ", label: "معركة أسئلة (Quiz)" },
                  { value: "XP_SPRINT", label: "سباق النقاط (XP Sprint)" },
                ]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                الصف
              </label>
              <Select
                value={gradeId}
                onChange={(e) => { setGradeId(e.target.value); }}
                placeholder="اختر الصف"
                options={grades.map((g) => ({ value: g.id, label: g.name }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                مكافأة النقاط (XP)
              </label>
              <Input
                type="number"
                value={xpReward}
                onChange={(e) => { setXpReward(e.target.value); }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                مكافأة العملات
              </label>
              <Input
                type="number"
                value={coinReward}
                onChange={(e) => { setCoinReward(e.target.value); }}
              />
            </div>
          </div>

          {mode === "QUIZ" && (
            <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                الأسئلة
              </span>
              {questions.map((q, qi) => (
                <div
                  key={qi}
                  className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900"
                >
                  <Input
                    value={q.question}
                    onChange={(e) => { updateQuestion(qi, { question: e.target.value }); }}
                    placeholder={`السؤال ${String(qi + 1)}`}
                  />
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${String(qi)}`}
                        checked={q.correctIndex === oi}
                        onChange={() => { updateQuestion(qi, { correctIndex: oi }); }}
                      />
                      <Input
                        value={opt}
                        onChange={(e) => { updateOption(qi, oi, e.target.value); }}
                        placeholder={`الخيار ${String(oi + 1)}`}
                      />
                    </div>
                  ))}
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuestions((prev) => [...prev, { ...EMPTY_QUESTION }]);
                }}
              >
                إضافة سؤال
              </Button>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500" dir="rtl">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          إلغاء
        </Button>
        <Button onClick={() => { void handleSubmit(); }} disabled={submitting}>
          {submitting ? "جارٍ الإنشاء..." : "إنشاء المسابقة"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
