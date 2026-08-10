/**
 * Format MCQ option/answer values as "a) reading" (letter + text).
 *
 * The stored student answer / correct answer for MCQ questions is the option
 * index as a string ("0", "1", "2", ...) or sometimes a single letter ("a").
 * This helper resolves it back to its letter + option text so the UI always
 * shows readable choices like "a) reading" instead of a raw number.
 */

export interface McqOption {
  label?: string;
  text?: string;
}

export function parseMcqOptions(optionsJson: string | null): McqOption[] {
  if (!optionsJson) return [];
  try {
    const parsed: unknown = JSON.parse(optionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((o: unknown) => {
      if (typeof o === "string") return { label: "", text: o };
      if (typeof o === "object" && o !== null) {
        const obj = o as { label?: unknown; text?: unknown };
        return {
          label: typeof obj.label === "string" ? obj.label : "",
          text: typeof obj.text === "string" ? obj.text : "",
        };
      }
      return { label: "", text: "" };
    });
  } catch {
    return [];
  }
}

const optionLetter = (index: number): string => String.fromCharCode(97 + index);

/**
 * Resolve a stored MCQ answer value to `{ letter, text }` if possible.
 * Returns null when the value cannot be resolved to an option.
 */
export function resolveMcqOption(
  optionsJson: string | null,
  value: string | null | undefined,
): { letter: string; text: string } | null {
  const options = parseMcqOptions(optionsJson);
  if (options.length === 0 || value === null || value === undefined) return null;

  const v = value.trim();
  if (v === "") return null;

  // Numeric index ("0", "1", ...)
  if (/^\d+$/.test(v)) {
    const idx = Number.parseInt(v, 10);
    if (idx >= 0 && idx < options.length) {
      const opt = options[idx];
      return { letter: optionLetter(idx), text: opt.text ?? opt.label ?? v };
    }
  }

  // Single letter ("a" .. "z")
  if (/^[a-zA-Z]$/.test(v)) {
    const idx = v.toLowerCase().charCodeAt(0) - 97;
    if (idx >= 0 && idx < options.length) {
      const opt = options[idx];
      return { letter: optionLetter(idx), text: opt.text ?? opt.label ?? v };
    }
  }

  // Match by label or text
  const lower = v.toLowerCase();
  const byLabel = options.findIndex((o) => (o.label ?? "").toLowerCase() === lower);
  if (byLabel >= 0) {
    const opt = options[byLabel];
    return { letter: optionLetter(byLabel), text: opt.text ?? opt.label ?? v };
  }
  const byText = options.findIndex((o) => (o.text ?? "").toLowerCase() === lower);
  if (byText >= 0) {
    const opt = options[byText];
    return { letter: optionLetter(byText), text: opt.text ?? opt.label ?? v };
  }

  return null;
}

/**
 * Format a stored MCQ answer value as "a) reading".
 * Falls back to the raw value when it cannot be resolved.
 */
export function formatMcqAnswer(
  optionsJson: string | null,
  value: string | null | undefined,
): string {
  const resolved = resolveMcqOption(optionsJson, value);
  if (!resolved) return value ?? "";
  return `${resolved.letter}) ${resolved.text}`;
}

/**
 * Format an MCQ answer value as "a) reading" given a plain array of option
 * texts (used by the mistakes API which returns `{ text, isCorrect }[]`).
 */
export function formatMcqAnswerFromTexts(
  optionTexts: string[],
  value: string | null | undefined,
): string {
  if (!Array.isArray(optionTexts) || optionTexts.length === 0 || value === null || value === undefined) {
    return value ?? "";
  }
  const v = value.trim();
  if (v === "") return "";
  if (/^\d+$/.test(v)) {
    const idx = Number.parseInt(v, 10);
    if (idx >= 0 && idx < optionTexts.length) {
      return `${optionLetter(idx)}) ${optionTexts[idx]}`;
    }
  }
  if (/^[a-zA-Z]$/.test(v)) {
    const idx = v.toLowerCase().charCodeAt(0) - 97;
    if (idx >= 0 && idx < optionTexts.length) {
      return `${optionLetter(idx)}) ${optionTexts[idx]}`;
    }
  }
  const byText = optionTexts.findIndex((t) => t.toLowerCase() === v.toLowerCase());
  if (byText >= 0) return `${optionLetter(byText)}) ${optionTexts[byText]}`;
  return v;
}
