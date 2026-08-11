"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { X, Plus, Check, GripVertical, MessageSquare } from "lucide-react";

interface DialogueLine {
  speaker: string;
  text: string;
  hasBlank?: boolean;
}

const QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "اختيار من متعدد" },
  { value: "TRUE_FALSE", label: "صح/خطأ" },
  { value: "FILL_IN_BLANKS", label: "املأ الفراغ" },
  { value: "SHORT_ANSWER", label: "إجابة قصيرة" },
  { value: "ESSAY", label: "مقالي" },
  { value: "MATCHING", label: "توصيل" },
  { value: "ORDERING", label: "ترتيب" },
  { value: "DIALOGUE", label: "حوار" },
  { value: "DRAG_DROP", label: "سحب وإفلات" },
] as const;

export interface QuestionFormData {
  type: string;
  question: string;
  options: string;
  correctAnswer: string;
  explanation: string;
  correctionMode?: string;
}

interface QuestionEditorDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: QuestionFormData) => void;
  readonly initial?: QuestionFormData | null;
}

export function QuestionEditorDialog({
  open,
  onClose,
  onSave,
  initial,
}: QuestionEditorDialogProps): ReactNode {
  const [type, setType] = useState(initial?.type ?? "MULTIPLE_CHOICE");
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [options, setOptions] = useState<string[]>(() => {
    if (initial?.options) {
      try {
        const parsed = JSON.parse(initial.options) as { text: string }[];
        return parsed.map((o) => o.text);
      } catch { /* ignore */ }
    }
    return ["", ""];
  });
  const [correctIndex, setCorrectIndex] = useState(() => {
    if (initial?.options) {
      try {
        const parsed = JSON.parse(initial.options) as { text: string; isCorrect?: boolean }[];
        const idx = parsed.findIndex((o) => o.isCorrect);
        return idx >= 0 ? idx : 0;
      } catch { /* ignore */ }
    }
    return 0;
  });
  const [correctAnswer, setCorrectAnswer] = useState(initial?.correctAnswer ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [correctionMode, setCorrectionMode] = useState(initial?.correctionMode ?? (initial?.type === "DIALOGUE" ? "AI" : "EXACT_MATCH"));
  const [wordBank, setWordBank] = useState<string[]>(() => {
    if (initial?.type === "DRAG_DROP" && initial.options) {
      try { return JSON.parse(initial.options) as string[]; } catch { /* ignore */ }
    }
    return [""];
  });
  const [dialogueLines, setDialogueLines] = useState<DialogueLine[]>(() => {
    if (initial?.type === "DIALOGUE" && initial.options) {
      try { return JSON.parse(initial.options) as DialogueLine[]; } catch { /* ignore */ }
    }
    return [{ speaker: "Student A", text: "", hasBlank: false }, { speaker: "Student B", text: "", hasBlank: true }];
  });

  useEffect(() => {
    if (type === "DIALOGUE") {
      setCorrectionMode("AI");
    }
  }, [type]);

  const resetForm = (): void => {
    setType("MULTIPLE_CHOICE");
    setQuestion("");
    setOptions(["", ""]);
    setCorrectIndex(0);
    setCorrectAnswer("");
    setExplanation("");
    setCorrectionMode("AI");
    setWordBank([""]);
    setDialogueLines([{ speaker: "Student A", text: "", hasBlank: false }, { speaker: "Student B", text: "", hasBlank: true }]);
  };

  const handleSave = (): void => {
    let optionsStr = "";
    if (type === "MULTIPLE_CHOICE") {
      optionsStr = JSON.stringify(
        options.map((text, i) => ({ label: String.fromCharCode(97 + i), text, isCorrect: i === correctIndex })),
      );
    } else if (type === "DRAG_DROP") {
      optionsStr = JSON.stringify(wordBank.filter((w) => w.trim().length > 0));
    } else if (type === "DIALOGUE") {
      optionsStr = JSON.stringify(dialogueLines.filter((l) => l.text.trim().length > 0));
    }
    onSave({
      type,
      question: question.trim(),
      options: optionsStr,
      correctAnswer: type === "TRUE_FALSE" ? (correctIndex === 0 ? "true" : "false") : correctAnswer.trim(),
      explanation: explanation.trim(),
      correctionMode: (type === "ESSAY" || type === "WRITING" || type === "DIALOGUE") ? correctionMode : undefined,
    });
    resetForm();
  };

  const addOption = (): void => { setOptions((prev) => [...prev, ""]); };
  const removeOption = (idx: number): void => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
    if (correctIndex >= idx) setCorrectIndex((prev) => Math.max(0, prev - 1));
  };
  const updateOption = (idx: number, text: string): void => {
    setOptions((prev) => prev.map((t, i) => (i === idx ? text : t)));
  };

  const isValid = type === "DIALOGUE"
    ? dialogueLines.some((l) => l.hasBlank) && correctAnswer.trim().length > 0
    : question.trim().length > 0;

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "تعديل السؤال" : "إضافة سؤال جديد"} className="max-h-[85vh] overflow-y-auto max-w-4xl">
      <DialogContent className="max-w-4xl">
        <div className="flex flex-col gap-4" dir="ltr">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">نوع السؤال</label>
            <select
              value={type}
              onChange={(e): void => { setType(e.target.value); }}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">نص السؤال</label>
            <textarea
              value={question}
              onChange={(e): void => { setQuestion(e.target.value); }}
              className="min-h-[80px] w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              dir="auto"
              placeholder="أدخل نص السؤال..."
            />
          </div>

          {(type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE") && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-500">
                {type === "TRUE_FALSE" ? "الإجابة الصحيحة" : "الخيارات"}
              </label>
              {options.map((text, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct-option"
                    checked={correctIndex === idx}
                    onChange={(): void => { setCorrectIndex(idx); }}
                    className="h-4 w-4 shrink-0 accent-primary-500"
                  />
                  <Input
                    placeholder={type === "TRUE_FALSE" ? (idx === 0 ? "صح" : "خطأ") : `خيار ${String.fromCharCode(97 + idx)}`}
                    value={text}
                    onChange={(e): void => { updateOption(idx, e.target.value); }}
                    readOnly={type === "TRUE_FALSE"}
                    className="flex-1"
                  />
                  {type === "MULTIPLE_CHOICE" && options.length > 2 && (
                    <Button variant="ghost" size="icon-sm" aria-label="حذف" className="text-danger-500"
                      onClick={(): void => { removeOption(idx); }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {type === "MULTIPLE_CHOICE" && (
                <Button variant="outline" size="sm" onClick={addOption} className="self-start">
                  <Plus className="h-4 w-4" /> إضافة خيار
                </Button>
              )}
            </div>
          )}

          {type === "DRAG_DROP" && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-500">بنك الكلمات (الكلمات المتاحة للسحب)</label>
              {wordBank.map((text, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 shrink-0 text-neutral-300" />
                  <Input
                    placeholder={`كلمة ${String(idx + 1)}`}
                    value={text}
                    onChange={(e): void => {
                      setWordBank((prev) => prev.map((t, i) => (i === idx ? e.target.value : t)));
                    }}
                    className="flex-1"
                  />
                  {wordBank.length > 1 && (
                    <Button variant="ghost" size="icon-sm" aria-label="حذف" className="text-danger-500"
                      onClick={(): void => { setWordBank((prev) => prev.filter((_, i) => i !== idx)); }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={(): void => { setWordBank((prev) => [...prev, ""]); }} className="self-start">
                <Plus className="h-4 w-4" /> إضافة كلمة
              </Button>
            </div>
          )}

          {type === "DRAG_DROP" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">الإجابة الصحيحة</label>
              <Input
                placeholder="أدخل الإجابة الصحيحة"
                value={correctAnswer}
                onChange={(e): void => { setCorrectAnswer(e.target.value); }}
                className="flex-1"
              />
            </div>
          )}

          {type === "DIALOGUE" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary-500" />
                <label className="text-xs font-medium text-neutral-500">أسطر الحوار</label>
              </div>
              {dialogueLines.map((line, li) => (
                <div key={li} className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-800">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <select
                        value={line.speaker}
                        onChange={(e): void => {
                          setDialogueLines((prev) => prev.map((l, i) => i === li ? { ...l, speaker: e.target.value } : l));
                        }}
                        className="w-[120px] rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-primary-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-primary-300"
                      >
                        <option value="Student A">Student A</option>
                        <option value="Student B">Student B</option>
                        <option value="Teacher">Teacher</option>
                        <option value="Custom">مُتحدث آخر</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <input type="checkbox" checked={line.hasBlank ?? false}
                          onChange={(e): void => {
                            setDialogueLines((prev) => prev.map((l, i) => i === li ? { ...l, hasBlank: e.target.checked } : l));
                          }}
                          className="h-3.5 w-3.5 accent-primary-500"
                        />
                        فراغ
                      </label>
                      {line.hasBlank && (
                        <Input
                          placeholder="الإجابة الصحيحة"
                          value={correctAnswer}
                          onChange={(e): void => { setCorrectAnswer(e.target.value); }}
                          className="h-7 flex-1 text-xs"
                        />
                      )}
                      {dialogueLines.length > 1 && (
                        <Button variant="ghost" size="icon-sm" aria-label="حذف" className="text-danger-500 shrink-0"
                          onClick={(): void => { setDialogueLines((prev) => prev.filter((_, i) => i !== li)); }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <textarea
                      value={line.text}
                      onChange={(e): void => {
                        setDialogueLines((prev) => prev.map((l, i) => i === li ? { ...l, text: e.target.value } : l));
                      }}
                      className="min-h-[40px] w-full resize-y rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs outline-none focus:border-primary-500 dark:border-neutral-700 dark:bg-neutral-800"
                      dir="auto"
                      placeholder={line.hasBlank ? 'اكتب النص مع ___ مكان الفراغ' : 'نص السطر'}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={(): void => {
                setDialogueLines((prev) => [...prev, { speaker: "Student A", text: "", hasBlank: false }]);
              }} className="self-start">
                <Plus className="h-4 w-4" /> إضافة سطر
              </Button>
              <p className="text-xs text-neutral-400">
                استخدم ___ (ثلاث شرطات) في النص لتحديد مكان الفراغ في السطر المختار
              </p>
            </div>
          )}

          {type !== "MULTIPLE_CHOICE" && type !== "TRUE_FALSE" && type !== "DRAG_DROP" && type !== "DIALOGUE" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">الإجابة الصحيحة</label>
              <Input
                placeholder={type === "ESSAY" ? "(تقييم يدوي)" : "أدخل الإجابة الصحيحة"}
                value={correctAnswer}
                onChange={(e): void => { setCorrectAnswer(e.target.value); }}
                className="flex-1"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">الشرح (اختياري)</label>
            <Input
              placeholder="شرح الإجابة للطالب..."
              value={explanation}
              onChange={(e): void => { setExplanation(e.target.value); }}
            />
          </div>

          {(type === "ESSAY" || type === "WRITING" || type === "DIALOGUE") && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">طريقة التصحيح</label>
              <select
                value={correctionMode}
                onChange={(e): void => { setCorrectionMode(e.target.value); }}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {type === "DIALOGUE" ? (
                  <>
                    <option value="MANUAL">تصحيح يدوي + اقتراحات ذكاء اصطناعي</option>
                    <option value="AI">ذكاء اصطناعي (تقييم تلقائي)</option>
                  </>
                ) : (
                  <>
                    <option value="EXACT_MATCH">مطابقة تامة (نص)</option>
                    <option value="MANUAL">تصحيح يدوي + اقتراحات ذكاء اصطناعي</option>
                    <option value="AI">ذكاء اصطناعي (تقييم تلقائي)</option>
                    <option value="GRAMMAR_CHECK">تدقيق إملائي ونحوي</option>
                  </>
                )}
              </select>
              <p className="mt-1 text-xs text-neutral-400">
                {correctionMode === "MANUAL" && "يُظهر للمدرس اقتراحات الذكاء الاصطناعي ويحدد الدرجة بنفسه"}
                {correctionMode === "AI" && (type === "DIALOGUE" ? "يُصحح تلقائياً بالذكاء الاصطناعي مع تقييم دقة الإجابة" : "يُصحح تلقائياً بالذكاء الاصطناعي حسب معايير كتابة البرجراف")}
                {correctionMode === "GRAMMAR_CHECK" && "يُصحح تلقائياً بالتدقيق الإملائي والنحوي مع تقييم بنسبة مئوية"}
                {correctionMode === "EXACT_MATCH" && "مقارنة النص حرفياً مع الإجابة الصحيحة"}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button variant="primary" disabled={!isValid} leftIcon={<Check className="h-4 w-4" />} onClick={handleSave}>
          {initial ? "حفظ التعديل" : "إضافة السؤال"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
