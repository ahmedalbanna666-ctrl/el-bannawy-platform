export function isMultipleChoice(type: string): boolean {
  return type === "MULTIPLE_CHOICE";
}

export function parseOptionLabels(optionsJson: string | null): string[] {
  if (!optionsJson) return [];
  try {
    const parsed: unknown = JSON.parse(optionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((o: unknown) => {
      if (typeof o === "string") return "";
      if (typeof o === "object" && o !== null) {
        const label = (o as { label?: unknown }).label;
        return typeof label === "string" ? label.toLowerCase() : "";
      }
      return "";
    });
  } catch {
    return [];
  }
}

export function normalizeMcqCorrect(
  optionsJson: string | null,
  correctAnswer: string | null,
): string {
  const correct = (correctAnswer ?? "").trim().toLowerCase();
  if (/^[a-z]$/.test(correct)) {
    const labels = parseOptionLabels(optionsJson);
    const idx = labels.indexOf(correct);
    if (idx >= 0) return String(idx);
  }
  return correct;
}

export function isMcqAnswerCorrect(
  optionsJson: string | null,
  correctAnswer: string | null,
  studentAnswer: string,
): boolean {
  return studentAnswer === normalizeMcqCorrect(optionsJson, correctAnswer);
}

export function formatMcqStudentAnswer(
  optionsJson: string | null,
  studentAnswer: string | null,
): string | null {
  if (studentAnswer === null) return null;
  const labels = parseOptionLabels(optionsJson);
  const idx = Number.parseInt(studentAnswer, 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= labels.length || !labels[idx]) {
    return studentAnswer;
  }
  return labels[idx].toUpperCase();
}
