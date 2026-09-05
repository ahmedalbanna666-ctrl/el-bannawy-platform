import { randomUUID } from "node:crypto";
import type { NormalizedDocument, NormalizedTable, NormalizedRow, ContentEntry } from "../types/normalized-document.types";
import type {
  QuestionPreviewStatus,
  QuestionPreviewType,
  QuestionPreviewOption,
  QuestionPreviewItem,
  QuestionPreviewGroup,
  QuestionImportPreview,
} from "../types/question-preview.types";

const MAX_QUESTIONS = 500;

// ── State Machine ────────────────────────────────────────────────────

const enum ParserState {
  NONE = "NONE",
  MCQ = "MCQ",
  TRUE_FALSE = "TRUE_FALSE",
  READING = "READING",
  DIALOGUE = "DIALOGUE",
  WRITING = "WRITING",
  GRAMMAR = "GRAMMAR",
  MATCHING = "MATCHING",
  ORDERING = "ORDERING",
  DRAG_DROP = "DRAG_DROP",
  REWRITE = "REWRITE",
  CORRECT = "CORRECT",
  ANSWER_KEY = "ANSWER_KEY",
}

// Use const object for runtime mapping
const MARKER_TO_STATE: Record<string, ParserState> = {
  MCQ: ParserState.MCQ,
  TRUE_FALSE: ParserState.TRUE_FALSE,
  READING: ParserState.READING,
  DIALOGUE: ParserState.DIALOGUE,
  WRITING: ParserState.WRITING,
  GRAMMAR: ParserState.GRAMMAR,
  MATCHING: ParserState.MATCHING,
  ORDERING: ParserState.ORDERING,
  DRAG_DROP: ParserState.DRAG_DROP,
  REWRITE: ParserState.REWRITE,
  CORRECT: ParserState.CORRECT,
  ANSWER_KEY: ParserState.ANSWER_KEY,
};

const SECTION_TYPE_MAP: Record<string, QuestionPreviewType> = {
  MCQ: "MCQ",
  TRUE_FALSE: "TRUE_FALSE",
  DRAG_DROP: "DRAG_DROP",
  READING: "READING",
  REWRITE: "SHORT_ANSWER",
  CORRECT: "FILL_IN_BLANK",
  DIALOGUE: "DIALOGUE",
  WRITING: "ESSAY",
  GRAMMAR: "GRAMMAR",
  MATCHING: "MATCHING",
  ORDERING: "ORDERING",
};

function generateId(): string {
  return "q_" + randomUUID();
}

// ── Utility ──────────────────────────────────────────────────────────

const QUESTION_NUMBER_PATTERN = /^(?:\((\d+)\)|(\d+)[.)]|\[(\d+)\])\s*/;
const ROMAN_NUMERAL_PATTERN = /^(?:\(([ivxIVX]+)\)|([ivxIVX]+)[.)])\s*/;

function extractQuestionNumber(line: string): string {
  const m = line.match(QUESTION_NUMBER_PATTERN);
  if (m) return m[1] ?? m[2] ?? m[3] ?? "";
  const rm = line.match(ROMAN_NUMERAL_PATTERN);
  if (rm) return (rm[1] ?? rm[2] ?? "").toUpperCase();
  return "";
}

function isQuestionStart(line: string): boolean {
  return QUESTION_NUMBER_PATTERN.test(line.trim());
}

function stripQuestionPrefix(line: string): string {
  return line.replace(QUESTION_NUMBER_PATTERN, "").trim();
}

function splitQuestionBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (isQuestionStart(line) && current.length > 0) {
      blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

// ── Inline Options Parser (Arabic + English) ─────────────────────────

const OPTION_PREFIX_PATTERN = /(?:^|\s)([a-dA-Dأ-ب-ج-د-ه-و])([.)\]:\-])\s*/;

const KNOWN_ABBREVIATIONS = new Set([
  "mr", "dr", "eg", "ie", "vs", "st", "jr", "sr", "dept", "est", "etc",
  "م", "السيد", "الدكتور",
]);

function isAbbreviation(text: string): boolean {
  return KNOWN_ABBREVIATIONS.has(text.toLowerCase().replace(/[^a-zأ-ي]/g, ""));
}

function extractInlineOptions(text: string): QuestionPreviewOption[] {
  const options: QuestionPreviewOption[] = [];
  const labelDisplay = ["a", "b", "c", "d", "e", "f"];

  // Collect all option prefix matches
  const matches: { label: string; rawLabel: string; index: number; length: number }[] = [];
  let optMatch: RegExpExecArray | null;
  const prefixRe = new RegExp(OPTION_PREFIX_PATTERN.source, "g");

  while ((optMatch = prefixRe.exec(text)) !== null) {
    const letter = optMatch[1].toLowerCase();
    const before = text.slice(Math.max(0, optMatch.index - 10), optMatch.index).trim().toLowerCase();
    const prevWord = before.split(/\s+/).pop() ?? "";

    // Skip abbreviations
    if (isAbbreviation(prevWord) || isAbbreviation(letter)) continue;

    // Map Arabic labels to Latin
    const labelMap: Record<string, string> = {
      أ: "a", ب: "b", ج: "c", د: "d", ه: "e", و: "f",
      a: "a", b: "b", c: "c", d: "d", e: "e", f: "f",
    };

    const mapped = labelMap[letter];
    if (!mapped) continue;

    const leadingAdjust = optMatch[0].startsWith(" ") ? 1 : 0;
    const prefixLen = optMatch[1].length + optMatch[2].length; // letter + punct only, excludes trailing \s*
    matches.push({
      label: mapped,
      rawLabel: optMatch[1],
      index: optMatch.index + leadingAdjust,
      length: prefixLen,
    });
  }

  if (matches.length < 2) return options;

  // Extract text between option boundaries
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].length;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const optionText = text.slice(start, end).replace(/[,;]+$/, "").trim();

    if (optionText.length > 0) {
      options.push({
        label: matches[i].label,
        text: optionText,
        isCorrect: false,
      });
    }
  }

  // Validate: must have at least 2 options and they must be sequential (a, b, c...)
  const labelOrder = options.map((o) => o.label);
  const expectedOrder = labelDisplay.slice(0, options.length);
  const isSequential = labelOrder.every((l, i) => l === expectedOrder[i]);

  if (!isSequential || options.length < 2) return [];

  return options;
}

// ── Table Options Extraction ─────────────────────────────────────────

function extractOptionsFromTable(table: NormalizedTable): QuestionPreviewOption[] {
  const row = table.rows[0];
  if (!row) return [];
  const options: QuestionPreviewOption[] = [];
  const labels = ["a", "b", "c", "d", "e", "f"];

  for (let i = 0; i < row.cells.length && i < labels.length; i++) {
    const cellText = row.cells[i].text.trim();
    if (!cellText) continue;
    const labelMatch = cellText.match(/^([a-fA-Fأ-ب-ج-د-ه-و])[.)\]:\-]?\s*(.*)/);
    if (labelMatch) {
      const labelMap: Record<string, string> = {
        أ: "a", ب: "b", ج: "c", د: "d", ه: "e", و: "f",
      };
      const rawLabel = labelMatch[1].toLowerCase();
      const label = labelMap[rawLabel] ?? rawLabel;
      options.push({ label, text: labelMatch[2].trim() || cellText, isCorrect: false });
    } else {
      options.push({ label: labels[i], text: cellText, isCorrect: false });
    }
  }

  return options.length >= 2 ? options : [];
}

// ── Prompt Cleaner ───────────────────────────────────────────────────

function cleanPromptFromOptions(line: string, options: QuestionPreviewOption[]): string {
  let cleaned = line
    .replace(QUESTION_NUMBER_PATTERN, "")
    .trim();

  // Remove options as a contiguous suffix from the end of the string
  if (options.length >= 2) {
    const combined = options
      .map((o) => `${escapeRegex(o.label)}[.)\\]:-]?\\s*${escapeRegex(o.text)}`)
      .join("\\s+");
    const trailingPattern = new RegExp(`\\s*${combined}\\s*$`);
    cleaned = cleaned.replace(trailingPattern, "").trim();
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Section State Machine ────────────────────────────────────────────

interface RawSection {
  state: ParserState;
  lines: string[];
  paragraphStartIndex: number;
  paragraphEndIndex: number;
  tables: NormalizedTable[];
}

function buildSections(
  paragraphs: ReadonlyArray<{ paragraphIndex: number; text: string }>,
  contentOrder: readonly ContentEntry[] | undefined,
  allTables: readonly NormalizedTable[],
): RawSection[] {
  const sections: RawSection[] = [];
  let currentState = ParserState.NONE;
  let currentLines: string[] = [];
  let currentStart = 0;
  let currentTableStart = 0;

  for (const p of paragraphs) {
    const markerMatch = p.text.match(/@@(\w+)@@/);
    if (markerMatch) {
      // Flush previous section
      if (currentState !== ParserState.NONE && currentLines.length > 0) {
        const sectionTables = assignTablesToSection(
          currentStart,
          p.paragraphIndex,
          contentOrder,
          allTables,
          currentTableStart,
        );
        sections.push({
          state: currentState,
          lines: currentLines,
          paragraphStartIndex: currentStart,
          paragraphEndIndex: p.paragraphIndex,
          tables: sectionTables,
        });
      }

      // Switch to new state
      const marker = markerMatch[1].toUpperCase();
      currentState = MARKER_TO_STATE[marker] ?? ParserState.NONE;
      currentLines = [];
      currentStart = p.paragraphIndex;
      currentTableStart = sections.reduce((max, s) => Math.max(max, s.tables.length), 0);
      // If the marker shares a paragraph with content (e.g. "@@answer_key@@ 1=a"), capture the trailing text
      const markerEnd = (markerMatch.index ?? 0) + markerMatch[0].length;
      const remainder = p.text.slice(markerEnd).trim().replace(/^[:\-–—\s]+/, "").trim();
      if (remainder && currentState !== ParserState.NONE) {
        currentLines.push(remainder);
      }
    } else if (currentState !== ParserState.NONE) {
      currentLines.push(p.text);
    }
  }

  // Flush last section
  if (currentState !== ParserState.NONE && currentLines.length > 0) {
    const sectionTables = assignTablesToSection(
      currentStart,
      Infinity,
      contentOrder,
      allTables,
      currentTableStart,
    );
    sections.push({
      state: currentState,
      lines: currentLines,
      paragraphStartIndex: currentStart,
      paragraphEndIndex: Infinity,
      tables: sectionTables,
    });
  }

  return sections;
}

function assignTablesToSection(
  paraStart: number,
  paraEnd: number,
  contentOrder: readonly ContentEntry[] | undefined,
  allTables: readonly NormalizedTable[],
  tableStartOffset: number,
): NormalizedTable[] {
  if (!contentOrder || contentOrder.length === 0) {
    // Fallback: give all remaining tables from offset
    return allTables.slice(tableStartOffset);
  }

  const tableIndices = new Set<number>();
  let inSection = false;

  for (const entry of contentOrder) {
    if (entry.kind === "paragraph") {
      if (entry.index >= paraStart && entry.index < paraEnd) {
        inSection = true;
      } else if (inSection && entry.index >= paraEnd) {
        break;
      }
    } else if (entry.kind === "table" && inSection) {
      tableIndices.add(entry.index);
    }
  }

  return allTables.filter((t) => tableIndices.has(t.tableIndex));
}

// ── Section Processors ───────────────────────────────────────────────

function processMCQSection(
  lines: string[],
  sectionTables: NormalizedTable[],
  groupId: string,
  startOrder: number,
  answerKey: Map<string, string>,
): { items: QuestionPreviewItem[]; usedTables: number } {
  const items: QuestionPreviewItem[] = [];
  let tableCursor = 0;
  let qNum = 1;

  for (const line of lines) {
    if (items.length + startOrder >= MAX_QUESTIONS) break;
    const hasInlineOptions = extractInlineOptions(line).length >= 2;
    // Skip headings/instructions that are not questions (e.g. "Exercise on Language Level 1")
    // Unnumbered questions with inline options (e.g. "What is 2+2? a. 3 b. 4") have hasInlineOptions true, so they are not skipped
    if (!isQuestionStart(line) && !hasInlineOptions) continue;

    const qn = extractQuestionNumber(line);
    const effectiveNum = qn || String(qNum);

    let options = extractInlineOptions(line);

    // Try table options if inline not found and line looks like a question
    if (options.length === 0 && isQuestionStart(line) && tableCursor < sectionTables.length) {
      options = extractOptionsFromTable(sectionTables[tableCursor++]);
    }

    const prompt = cleanPromptFromOptions(line, options);
    if (!prompt && options.length === 0) continue;

    const answerFromKey = answerKey.get(effectiveNum);
    items.push(createMcqItem(
      prompt || `Question ${String(startOrder + items.length + 1)}`,
      options,
      answerFromKey ?? null,
      groupId,
      startOrder + items.length,
      null,
    ));

    // Increment for next question: numbered questions advance by their number, unnumbered advance sequentially
    if (isQuestionStart(line) || hasInlineOptions) qNum++;
    else qNum++;
  }

  return { items, usedTables: tableCursor };
}

function processReadingSection(
  lines: string[],
  sectionTables: NormalizedTable[],
  groupId: string,
  startOrder: number,
): QuestionPreviewItem[] {
  const items: QuestionPreviewItem[] = [];
  let tableCursor = 0;

  const passageEnd = lines.findIndex(
    (l) => l.includes("Choose the correct answer") || l.includes("Answer the following"),
  );
  const passageText = passageEnd >= 0 ? lines.slice(0, passageEnd).join(" ").trim() : null;
  const qStart = passageEnd >= 0 ? passageEnd + 1 : 0;
  const questionBlocks = splitQuestionBlocks(lines.slice(qStart));

  for (const qBlock of questionBlocks) {
    if (items.length + startOrder >= MAX_QUESTIONS) break;
    const joined = qBlock.join(" ").trim();
    const qNum = extractQuestionNumber(joined);
    const prompt = stripQuestionPrefix(joined);
    if (!prompt) continue;

    let options = extractInlineOptions(prompt);

    if (options.length === 0 && tableCursor < sectionTables.length) {
      options = extractOptionsFromTable(sectionTables[tableCursor++]);
    }

    if (options.length >= 2) {
      items.push(createMcqItem(prompt, options, null, groupId, startOrder + items.length, null, passageText));
    } else {
      items.push(createQuestionItem("READING_QUESTION", prompt, null, groupId, startOrder + items.length, passageText));
    }
  }

  return items;
}

function processTrueFalseSection(
  lines: string[],
  groupId: string,
  startOrder: number,
  answerKey: Map<string, string>,
): QuestionPreviewItem[] {
  const items: QuestionPreviewItem[] = [];
  const questionBlocks = splitQuestionBlocks(lines);

  for (const qBlock of questionBlocks) {
    if (items.length + startOrder >= MAX_QUESTIONS) break;
    const joined = qBlock.join(" ").trim();
    const qNum = extractQuestionNumber(joined);
    const prompt = stripQuestionPrefix(joined).replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (!prompt) continue;

    const answer = answerKey.get(qNum);
    const isTrue = answer?.toLowerCase() === "t" || answer?.toLowerCase() === "true";
    items.push(createTrueFalseItem(prompt, isTrue, groupId, startOrder + items.length));
  }

  return items;
}

function processDialogueSection(
  lines: string[],
  groupId: string,
  startOrder: number,
  answerKey: Map<string, string>,
  sectionTables: NormalizedTable[] = [],
): QuestionPreviewItem[] {
  const items: QuestionPreviewItem[] = [];

  // ── Extract instruction from heading line ──
  const instruction = lines.find((l) => /complete|fill|dialogue|الحوار|أكمل/i.test(l)) ?? "";

  // ── Try table-based dialogue parsing first ──
  const dialogueTable = sectionTables.find((t) => t.rows.length >= 2);
  if (dialogueTable) {
    const rows = dialogueTable.rows;
    // Extract dialogue lines: each row has (speaker, text)
    const dialogueLines: Array<{ speaker: string; text: string }> = [];
    for (const row of rows) {
      const cells = row.cells;
      if (cells.length < 2) continue;
      const speaker = cells[0]?.text?.trim() || "";
      const text = cells[1]?.text?.trim() || "";
      if (!speaker || !text) continue;
      dialogueLines.push({ speaker, text });
    }

    if (dialogueLines.length > 0) {
      // Build a single DIALOGUE question containing all dialogue lines. Every
      // blank line (containing `(N)` followed by dots) is marked hasBlank and
      // normalised to `___` so the student gets an input for each blank.
      const blankPattern = /(?:\(\d+\))\s*\.+/;
      const blankAnswers: string[] = [];
      let blankCount = 0;

      const normalizedLines = dialogueLines.map((dl) => {
        const blankMatch = dl.text.match(/\((\d+)\)/);
        if (!blankMatch) return { speaker: dl.speaker, text: dl.text, hasBlank: false };
        if (!blankPattern.test(dl.text)) return { speaker: dl.speaker, text: dl.text, hasBlank: false };
        blankCount++;
        blankAnswers.push(answerKey.get(blankMatch[1]) ?? "");
        return {
          speaker: dl.speaker,
          text: dl.text.replace(blankPattern, "___"),
          hasBlank: true,
        };
      });

      const dialogueJson = JSON.stringify(normalizedLines);
      const firstAnswer = blankAnswers.find((a) => a.length > 0) ?? null;
      const status: "VALID" | "WARNING" | "INVALID" = blankCount > 0 && blankAnswers.some((a) => a.length > 0)
        ? "VALID"
        : blankCount > 0
          ? "WARNING"
          : "INVALID";

      items.push({
        clientDraftId: generateId(),
        sourceParagraphIndex: 0,
        sourceTableIndex: dialogueTable.tableIndex,
        displayOrder: startOrder + items.length,
        questionType: "DIALOGUE",
        prompt: instruction || "Complete the following dialogue",
        instruction: null,
        explanation: null,
        options: [{
          label: "0",
          text: dialogueJson,
          isCorrect: false,
        }],
        correctAnswer: firstAnswer,
        acceptableAnswers: [],
        passageText: null,
        status,
        warnings: blankCount === 0
          ? ["No blanks detected in dialogue"]
          : blankAnswers.some((a) => a.length === 0)
            ? ["Some blanks have no answer key entry"]
            : [],
        errors: [],
        groupId,
      });

      return items;
    }
  }

  // ── Fallback: line-based dialogue parsing (backward compatibility) ──
  for (const line of lines) {
    if (items.length + startOrder >= MAX_QUESTIONS) break;
    if (!QUESTION_NUMBER_PATTERN.test(line.trim())) continue;

    const qNum = extractQuestionNumber(line);
    const prompt = stripQuestionPrefix(line).replace(/^Student\s+[AB]\s*/i, "").trim();
    if (!prompt) continue;

    const answer = answerKey.get(qNum);
    items.push(createQuestionItem("DIALOGUE", prompt, answer ?? null, groupId, startOrder + items.length));
  }

  return items;
}

function processGrammarSection(
  lines: string[],
  groupId: string,
  startOrder: number,
  answerKey: Map<string, string>,
): QuestionPreviewItem[] {
  const items: QuestionPreviewItem[] = [];
  const questionBlocks = splitQuestionBlocks(lines);

  for (const qBlock of questionBlocks) {
    if (items.length + startOrder >= MAX_QUESTIONS) break;
    const joined = qBlock.join(" ").trim();
    const qNum = extractQuestionNumber(joined);
    const prompt = stripQuestionPrefix(joined);
    if (!prompt) continue;

    const answer = answerKey.get(qNum);
    if (!answer) continue;

    // Grammar must generate valid MCQ with correct + 3 wrong options
    const wrongTexts = generateGrammarWrongOptions(answer);
    const allOptions: QuestionPreviewOption[] = [
      { label: "a", text: answer, isCorrect: true },
      ...wrongTexts.map((w, i) => ({
        label: String.fromCharCode(98 + i),
        text: w,
        isCorrect: false,
      })),
    ];

    items.push(createMcqItem(
      prompt,
      allOptions,
      "a",
      groupId,
      startOrder + items.length,
      null,
      undefined,
      "GRAMMAR",
    ));
  }

  return items;
}

// Grammar wrong-option generator (shared function, not method)
function generateGrammarWrongOptions(correctAnswer: string): string[] {
  const wrongs = new Set<string>();
  wrongs.add(correctAnswer);

  // Common grammar error transformations
  const candidates = [
    correctAnswer.replace(/\s+/g, " "),
    correctAnswer.replace(/n't\b/, " not"),
    correctAnswer.replace(/\b(\w+)\b/g, (w) => w.toUpperCase()),
    correctAnswer.replace(/\b(is|are|was|were|am)\b/gi, (m) =>
      ({ is: "are", are: "is", was: "were", were: "was", am: "is" })[m.toLowerCase()] ?? m,
    ),
    correctAnswer.replace(/\b(have|has|had)\b/gi, (m) =>
      ({ have: "has", has: "have", had: "has" })[m.toLowerCase()] ?? m,
    ),
    correctAnswer.replace(/\b(do|does|did)\b/gi, (m) =>
      ({ do: "does", does: "do", did: "does" })[m.toLowerCase()] ?? m,
    ),
  ];

  for (const c of candidates) {
    if (wrongs.size >= 4) break;
    if (c !== correctAnswer) wrongs.add(c);
  }

  // Pad with generic wrong answers if needed
  const fillers = [
    correctAnswer + " ...",
    "... " + correctAnswer,
    "(" + correctAnswer + ")",
  ];

  for (const f of fillers) {
    if (wrongs.size >= 4) break;
    wrongs.add(f);
  }

  return Array.from(wrongs).slice(1, 4);
}

// ── Shared Item Creators ─────────────────────────────────────────────

function createMcqItem(
  prompt: string,
  options: QuestionPreviewOption[],
  correctAnswer: string | null,
  groupId: string,
  displayOrder: number,
  instruction: string | null,
  passageText?: string | null,
  questionType?: QuestionPreviewType,
): QuestionPreviewItem {
  const markedOptions = options.map((o) => ({
    ...o,
    isCorrect: o.isCorrect || (correctAnswer !== null && o.label.toLowerCase() === correctAnswer.toLowerCase()),
  }));

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!prompt) errors.push("Question prompt is empty");
  if (markedOptions.length < 2) errors.push("Less than 2 options provided");
  if (!markedOptions.some((o) => o.isCorrect)) warnings.push("No correct answer marked");

  return {
    clientDraftId: generateId(),
    sourceParagraphIndex: 0,
    sourceTableIndex: null,
    displayOrder,
    questionType: questionType ?? "MCQ",
    prompt,
    instruction: instruction ?? null,
    explanation: null,
    options: markedOptions,
    correctAnswer: markedOptions.find((o) => o.isCorrect)?.label ?? correctAnswer,
    acceptableAnswers: [],
    passageText: passageText ?? null,
    status: errors.length > 0 ? "INVALID" : warnings.length > 0 ? "WARNING" : "VALID",
    warnings,
    errors,
    groupId,
  };
}

function createTrueFalseItem(
  prompt: string,
  isTrue: boolean,
  groupId: string,
  displayOrder: number,
): QuestionPreviewItem {
  return {
    clientDraftId: generateId(),
    sourceParagraphIndex: 0,
    sourceTableIndex: null,
    displayOrder,
    questionType: "TRUE_FALSE",
    prompt,
    instruction: null,
    explanation: null,
    options: [
      { label: "true", text: "True", isCorrect: isTrue },
      { label: "false", text: "False", isCorrect: !isTrue },
    ],
    correctAnswer: isTrue ? "true" : "false",
    acceptableAnswers: [],
    passageText: null,
    status: prompt ? "VALID" : "INVALID",
    warnings: [],
    errors: prompt ? [] : ["Question prompt is empty"],
    groupId,
  };
}

function createQuestionItem(
  questionType: QuestionPreviewType,
  prompt: string,
  correctAnswer: string | null,
  groupId: string,
  displayOrder: number,
  passageText?: string | null,
): QuestionPreviewItem {
  const warnings: string[] = [];
  if (!prompt) warnings.push("Question prompt is empty");

  return {
    clientDraftId: generateId(),
    sourceParagraphIndex: 0,
    sourceTableIndex: null,
    displayOrder,
    questionType,
    prompt: prompt || "(empty)",
    instruction: null,
    explanation: null,
    options: [],
    correctAnswer,
    acceptableAnswers: [],
    passageText: passageText ?? null,
    status: prompt ? "VALID" : "WARNING",
    warnings,
    errors: [],
    groupId,
  };
}

function createEssayItem(
  prompt: string,
  groupId: string,
  displayOrder: number,
): QuestionPreviewItem {
  return {
    clientDraftId: generateId(),
    sourceParagraphIndex: 0,
    sourceTableIndex: null,
    displayOrder,
    questionType: "ESSAY",
    prompt,
    instruction: null,
    explanation: "REQUIRES_MANUAL_REVIEW",
    options: [],
    correctAnswer: null,
    acceptableAnswers: [],
    passageText: null,
    status: prompt ? "VALID" : "WARNING",
    warnings: prompt ? [] : ["Writing prompt is empty"],
    errors: [],
    groupId,
  };
}

// ── Answer Key Parser ────────────────────────────────────────────────

const ARABIC_TO_LATIN_KEY: Record<string, string> = {
  أ: "a",
  ب: "b",
  ج: "c",
  د: "d",
  ه: "e",
  و: "f",
};

function normalizeAnswerValue(raw: string): string {
  let v = raw.trim().replace(/^[,\s;]+/, "").replace(/[,;\s]+$/, "").replace(/^["'\(\[]+/, "").replace(/["'\)\]]+$/, "").trim();
  if (!v) return v;
  // Map single Arabic letter to Latin for MCQ (so "أ" matches option label "a")
  if (ARABIC_TO_LATIN_KEY[v]) return ARABIC_TO_LATIN_KEY[v];
  // If value is a single MCQ letter with trailing punctuation like "a." or "b," -> normalize to just the letter
  const lettersOnly = v.replace(/[^a-zA-Zأ-ي]/g, "");
  if (lettersOnly.length === 1 && v.trim().length <= 3) {
    const mapped = ARABIC_TO_LATIN_KEY[lettersOnly] ?? lettersOnly.toLowerCase();
    // only normalize if the original value was essentially that single letter (e.g. "a." , "b," , "A" , "أ")
    if (/^[a-fA-Fأ-ه-و][\W]*$/i.test(v.trim())) {
      return mapped;
    }
    // also handle "a" with surrounding punctuation
    if (v.trim().length <= 2) return mapped;
  }
  return v;
}

function parseAnswerKey(lines: string[], tables: readonly NormalizedTable[] = []): Map<string, string> {
  const key = new Map<string, string>();

  // 1) Table-based answer keys (each row = number + answer)
  for (const tbl of tables) {
    for (const row of tbl.rows) {
      if (row.cells.length >= 2) {
        const first = row.cells[0].text.trim();
        const second = row.cells[1].text.trim();
        const numMatch = first.match(/^(\d+)\.?$/);
        if (numMatch && second) {
          key.set(numMatch[1], normalizeAnswerValue(second));
          continue;
        }
      }
      for (const cell of row.cells) {
        const text = cell.text.trim();
        // try to extract all number -> answer pairs inside the cell (strict separators = : to avoid splitting values like 3-2-1)
        const reCell = /(\d+)\s*[:=]+\s*([^\d]+?)(?=\s*\d+\s*[:=]|$)/g;
        let m: RegExpExecArray | null;
        const cellCombined = text;
        while ((m = reCell.exec(cellCombined)) !== null) {
          const num = m[1];
          let val = m[2].trim().replace(/^[,\s;]+/, "").replace(/[,;\s]+$/, "");
          if (val) key.set(num, normalizeAnswerValue(val));
        }
      }
    }
  }

  const combined = lines.join(" ").replace(/\s+/g, " ").trim();
  if (!combined) return key;

  // 2) Text-based answer keys: support multiple entries per line.
  // Use strict separators (= and :) globally so values like "3-2-1" are not split.
  const re = /(\d+)\s*[:=]+\s*/g;
  const matches: Array<{ num: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(combined)) !== null) {
    matches.push({ num: m[1], start: m.index, end: re.lastIndex });
  }

  if (matches.length === 0) {
    // Fallback for other separators (e.g. "1 - a", "1. a", "1) a") when only one entry per line
    for (const line of lines) {
      const mm = line.match(/(\d+)\s*[:=\-.)\]]+\s*(.+)/);
      if (mm) key.set(mm[1], normalizeAnswerValue(mm[2]));
    }
    return key;
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].start : combined.length;
    let value = combined.slice(cur.end, nextStart).trim();
    value = value.replace(/^[,\s;]+/, "").replace(/[,;\s]+$/, "").trim();
    // Remove surrounding quotes/brackets that may have been left
    value = value.replace(/^["'\(\[]+/, "").replace(/["'\)\]]+$/, "").trim();
    if (!value) continue;
    key.set(cur.num, normalizeAnswerValue(value));
  }

  return key;
}

// ── Fallback Table Classifier (Arabic + English) ─────────────────────

interface TableClassification {
  type: QuestionPreviewType;
  headerCols: string[];
  optionsCols: number[];
  answerCol: number;
}

const MCQ_HEADERS_EN = new Set(["a", "b", "c", "d", "e", "f", "option", "choice", "answer", "correct"]);
const MCQ_HEADERS_AR = new Set(["أ", "ب", "ج", "د", "ه", "و", "خيار", "اختيار", "إجابة", "الإجابة"]);
const TF_HEADERS = new Set(["answer", "true/false", "tf", "correct", "إجابة", "صح/خطأ", "صح", "خطأ"]);
const GRAMMAR_KEYWORDS = ["incorrect", "error", "wrong", "mistake", "خطأ", "غلط", "خاطئ"];

function classifyTableType(table: NormalizedTable): TableClassification {
  const rows = table.rows;
  if (rows.length === 0) return { type: "UNKNOWN", headerCols: [], optionsCols: [], answerCol: -1 };

  const firstRow = rows[0];
  const colCount = Math.min(firstRow.cells.length, 7);
  const headers = firstRow.cells.map((c) => c.text.trim().toLowerCase());

  if (colCount === 2) {
    const answerIdx = headers.findIndex((h) =>
      TF_HEADERS.has(h) || h.includes("answer") || h.includes("صح") || h.includes("إجابة"),
    );
    if (answerIdx >= 0) {
      return {
        type: "TRUE_FALSE",
        headerCols: headers,
        optionsCols: [],
        answerCol: answerIdx,
      };
    }
    return { type: "UNKNOWN", headerCols: headers, optionsCols: [], answerCol: -1 };
  }

  if (colCount === 3) {
    const hasGrammar = headers.some((h) => GRAMMAR_KEYWORDS.some((kw) => h.includes(kw)));
    if (hasGrammar) {
      return {
        type: "GRAMMAR",
        headerCols: headers,
        optionsCols: [],
        answerCol: headers.findIndex((h) => h.includes("correct") || h.includes("answer") || h.includes("صحيح") || h.includes("إجابة")),
      };
    }
    return { type: "UNKNOWN", headerCols: headers, optionsCols: [], answerCol: -1 };
  }

  if (colCount >= 4 && colCount <= 7) {
    const optionsCols: number[] = [];
    let answerCol = -1;

    for (let i = 1; i < colCount; i++) {
      const h = headers[i];
      if (h.includes("answer") || h.includes("correct") || h.includes("key") || h.includes("إجابة") || h.includes("صحيح")) {
        answerCol = i;
      } else if (MCQ_HEADERS_EN.has(h) || MCQ_HEADERS_AR.has(h) || h.length <= 2 || h === "") {
        optionsCols.push(i);
      }
    }

    if (optionsCols.length >= 2) {
      return { type: "MCQ", headerCols: headers, optionsCols, answerCol };
    }
  }

  return { type: "UNKNOWN", headerCols: headers, optionsCols: [], answerCol: -1 };
}

function extractOptionsFromRow(
  row: NormalizedRow,
  optionsCols: number[],
  answerCol: number,
): QuestionPreviewOption[] {
  const options: QuestionPreviewOption[] = [];
  const labels = ["a", "b", "c", "d", "e", "f"];

  for (let i = 0; i < optionsCols.length; i++) {
    const cell = row.cells.find((c) => c.columnIndex === optionsCols[i]);
    if (!cell || !cell.text.trim()) continue;

    const answerCell = answerCol >= 0 ? row.cells.find((c) => c.columnIndex === answerCol) : undefined;
    const answer = answerCell?.text.trim().toLowerCase() ?? "";
    const label = labels[i] ?? String(i);

    options.push({
      label,
      text: cell.text.trim(),
      isCorrect: answer !== "" && (answer === label || answer === cell.text.trim().toLowerCase()),
    });
  }

  return options;
}

function processTable(table: NormalizedTable, tableIndex: number, groupId: string, baseDisplayOrder: number): QuestionPreviewItem[] {
  const classification = classifyTableType(table);

  return table.rows.slice(1).map((row, idx) => {
    const displayOrder = baseDisplayOrder + idx;
    const hasData = row.cells.some((c) => c.text.trim().length > 0);

    if (!hasData) {
      return {
        clientDraftId: generateId(),
        sourceParagraphIndex: 0,
        sourceTableIndex: tableIndex,
        displayOrder,
        questionType: "UNKNOWN" as QuestionPreviewType,
        prompt: "(empty row)",
        instruction: null,
        explanation: null,
        options: [],
        correctAnswer: null,
        acceptableAnswers: [],
        passageText: null,
        status: "INVALID" as QuestionPreviewStatus,
        warnings: [],
        errors: ["Empty row"],
        groupId,
      };
    }

    switch (classification.type) {
      case "MCQ":
        return extractMcqRow(row, classification.optionsCols, classification.answerCol, groupId, displayOrder);
      case "TRUE_FALSE":
        return extractTFRow(row, classification.answerCol, groupId, displayOrder);
      case "GRAMMAR":
        return extractGrammarRow(row, groupId, displayOrder);
      default:
        return unknownRow(row, groupId, displayOrder);
    }
  });
}

function extractMcqRow(
  row: NormalizedRow,
  optionsCols: number[],
  answerCol: number,
  groupId: string,
  displayOrder: number,
): QuestionPreviewItem {
  const prompt = row.cells.find((c) => c.columnIndex === 0)?.text?.trim() ?? "";
  const options = extractOptionsFromRow(row, optionsCols, answerCol);
  return createMcqItem(prompt, options, options.find((o) => o.isCorrect)?.label ?? null, groupId, displayOrder, null);
}

function extractTFRow(row: NormalizedRow, answerCol: number, groupId: string, displayOrder: number): QuestionPreviewItem {
  const prompt = row.cells.find((c) => c.columnIndex === 0)?.text?.trim() ?? "";
  const answerCell = answerCol >= 0 ? row.cells.find((c) => c.columnIndex === answerCol) : undefined;
  const answer = answerCell?.text.trim().toLowerCase() ?? "";
  const isTrue = answer === "true" || answer === "t" || answer === "yes" || answer === "صح";
  return createTrueFalseItem(prompt, isTrue, groupId, displayOrder);
}

function extractGrammarRow(row: NormalizedRow, groupId: string, displayOrder: number): QuestionPreviewItem {
  const cells = [...row.cells].sort((a, b) => a.columnIndex - b.columnIndex);
  const prompt = cells[0]?.text?.trim() ?? "";
  const correctText = cells[1]?.text?.trim() ?? "";
  const explanation = cells[2]?.text?.trim() ?? null;

  if (!prompt || !correctText) {
    return {
      clientDraftId: generateId(),
      sourceParagraphIndex: 0,
      sourceTableIndex: null,
      displayOrder,
      questionType: "GRAMMAR",
      prompt,
      instruction: null,
      explanation: explanation ?? undefined,
      options: [],
      correctAnswer: null,
      acceptableAnswers: [],
      passageText: null,
      status: "INVALID",
      warnings: [],
      errors: [!prompt ? "Grammar prompt is empty" : "", !correctText ? "Grammar correct answer is empty" : ""].filter(Boolean),
      groupId,
    } as QuestionPreviewItem;
  }

  const wrongOptions = generateGrammarWrongOptions(correctText);
  const allOptions: QuestionPreviewOption[] = [
    { label: "a", text: correctText, isCorrect: true },
    ...wrongOptions.map((w, i) => ({ label: String.fromCharCode(98 + i), text: w, isCorrect: false })),
  ];

  return {
    clientDraftId: generateId(),
    sourceParagraphIndex: 0,
    sourceTableIndex: null,
    displayOrder,
    questionType: "GRAMMAR",
    prompt,
    instruction: null,
    explanation: explanation ?? undefined,
    options: allOptions,
    correctAnswer: "a",
    acceptableAnswers: [],
    passageText: null,
    status: "VALID",
    warnings: [],
    errors: [],
    groupId,
  };
}

function unknownRow(row: NormalizedRow, groupId: string, displayOrder: number): QuestionPreviewItem {
  const prompt = row.cells.find((c) => c.columnIndex === 0)?.text?.trim() ?? "";
  return {
    clientDraftId: generateId(),
    sourceParagraphIndex: 0,
    sourceTableIndex: null,
    displayOrder,
    questionType: "UNKNOWN",
    prompt: prompt || "(empty row)",
    instruction: null,
    explanation: null,
    options: [],
    correctAnswer: null,
    acceptableAnswers: [],
    passageText: null,
    status: "WARNING",
    warnings: ["Unable to determine question type; please review manually"],
    errors: [],
    groupId,
  };
}

// ── Main Parser ──────────────────────────────────────────────────────

export class QuestionsTableV1Parser {
  parse(document: NormalizedDocument): QuestionImportPreview {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Try markup parser (state machine via @@SECTION@@ markers)
    if (document.paragraphs.length > 0) {
      const sections = buildSections(document.paragraphs, document.contentOrder, document.tables);
      if (sections.length > 0) {
        const result = this.processSections(sections, warnings, errors);
        if (result.groups.length > 0) {
          return result;
        }
      }
    }

    // Fallback: table-based parser
    if (document.tables.length === 0) {
      warnings.push("Document contains no recognizable question format");
      return {
        parserProfile: "QUESTIONS_TABLE_V1",
        groups: [],
        counts: { total: 0, valid: 0, warning: 0, invalid: 0 },
        warnings,
        errors,
      };
    }

    return this.processTableFallback(document.tables, warnings, errors);
  }

  private processSections(
    sections: RawSection[],
    globalWarnings: string[],
    globalErrors: string[],
  ): QuestionImportPreview {
    const groups: QuestionPreviewGroup[] = [];
    let totalQuestions = 0;
    let validCount = 0;
    let warningCount = 0;
    let invalidCount = 0;
    const answerKeys = new Map<string, Map<string, string>>();

    // First pass: collect answer keys
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      if (section.state === ParserState.ANSWER_KEY) {
        const prevSection = sections[si - 1];
        if (prevSection && prevSection.state !== ParserState.ANSWER_KEY) {
          const key = parseAnswerKey(section.lines, section.tables);
          answerKeys.set(prevSection.state, key);
        }
      }
    }

    // Second pass: process sections
    for (const section of sections) {
      if (section.state === ParserState.NONE || section.state === ParserState.ANSWER_KEY) continue;

      const sectionAnswerKey = answerKeys.get(section.state) ?? new Map<string, string>();
      const groupId = generateId();
      const groupTitle = `${section.state} Questions`;
      let groupItems: QuestionPreviewItem[] = [];

      switch (section.state) {
        case ParserState.MCQ: {
          const result = processMCQSection(section.lines, section.tables, groupId, totalQuestions, sectionAnswerKey);
          groupItems = result.items;
          break;
        }
        case ParserState.READING:
          groupItems = processReadingSection(section.lines, section.tables, groupId, totalQuestions);
          break;
        case ParserState.TRUE_FALSE:
          groupItems = processTrueFalseSection(section.lines, groupId, totalQuestions, sectionAnswerKey);
          break;
        case ParserState.DIALOGUE:
          groupItems = processDialogueSection(section.lines, groupId, totalQuestions, sectionAnswerKey, section.tables);
          break;
        case ParserState.GRAMMAR:
          groupItems = processGrammarSection(section.lines, groupId, totalQuestions, sectionAnswerKey);
          break;
        case ParserState.WRITING: {
          const prompt = section.lines[0] ?? "";
          groupItems = [createEssayItem(prompt, groupId, totalQuestions)];
          break;
        }
        case ParserState.REWRITE:
          groupItems = this.processGenericSection(
            section.lines, "SHORT_ANSWER", groupId, totalQuestions, sectionAnswerKey,
          );
          break;
        case ParserState.CORRECT:
          groupItems = this.processGenericSection(
            section.lines, "FILL_IN_BLANK", groupId, totalQuestions, sectionAnswerKey,
          );
          break;
        case ParserState.MATCHING:
          groupItems = this.processGenericSection(
            section.lines, "MATCHING", groupId, totalQuestions, sectionAnswerKey,
          );
          break;
        case ParserState.ORDERING:
          groupItems = this.processGenericSection(
            section.lines, "ORDERING", groupId, totalQuestions, sectionAnswerKey,
          );
          break;
        case ParserState.DRAG_DROP:
          groupItems = this.processGenericSection(
            section.lines, "DRAG_DROP", groupId, totalQuestions, sectionAnswerKey,
          );
          break;
        default:
          groupItems = this.processGenericSection(
            section.lines, "UNKNOWN", groupId, totalQuestions, sectionAnswerKey,
          );
      }

      for (const item of groupItems) {
        if (item.status === "VALID") validCount++;
        else if (item.status === "WARNING") warningCount++;
        else invalidCount++;
      }

      if (groupItems.length > 0) {
        groups.push({ id: groupId, title: groupTitle, displayOrder: groups.length, items: groupItems });
        totalQuestions += groupItems.length;
      }
    }

    return {
      parserProfile: "QUESTIONS_MARKUP_V1",
      groups,
      counts: { total: validCount + warningCount + invalidCount, valid: validCount, warning: warningCount, invalid: invalidCount },
      warnings: globalWarnings,
      errors: globalErrors,
    };
  }

  private processGenericSection(
    lines: string[],
    type: QuestionPreviewType,
    groupId: string,
    startOrder: number,
    answerKey: Map<string, string>,
  ): QuestionPreviewItem[] {
    const items: QuestionPreviewItem[] = [];
    const questionBlocks = splitQuestionBlocks(lines);

    for (const qBlock of questionBlocks) {
      if (items.length + startOrder >= MAX_QUESTIONS) break;
      const joined = qBlock.join(" ").trim();
      const qNum = extractQuestionNumber(joined);
      const prompt = stripQuestionPrefix(joined);
      if (!prompt) continue;

      const answer = answerKey.get(qNum);
      items.push(createQuestionItem(type, prompt, answer ?? null, groupId, startOrder + items.length));
    }

    return items;
  }

  private processTableFallback(
    tables: readonly NormalizedTable[],
    warnings: string[],
    errors: string[],
  ): QuestionImportPreview {
    const groups: QuestionPreviewGroup[] = [];
    let totalQuestions = 0;
    let validCount = 0;
    let warningCount = 0;
    let invalidCount = 0;
    let globalDisplayOrder = 0;

    for (let ti = 0; ti < tables.length; ti++) {
      const table = tables[ti];
      const firstRowText = table.rows[0]?.cells.map((c) => c.text.trim()).join(" | ").slice(0, 60);
      const tableTitle = firstRowText ?? `Table ${String(ti + 1)}`;
      const groupId = generateId();
      const items = processTable(table, ti, groupId, globalDisplayOrder);
      if (items.length === 0) continue;

      const groupItems = items.slice(0, MAX_QUESTIONS - totalQuestions);
      for (const item of groupItems) {
        if (item.status === "VALID") validCount++;
        else if (item.status === "WARNING") warningCount++;
        else invalidCount++;
      }

      groups.push({
        id: groupId,
        title: `Table ${String(ti + 1)}: ${tableTitle}`,
        displayOrder: ti,
        items: groupItems,
      });
      globalDisplayOrder += groupItems.length;
      totalQuestions += groupItems.length;

      if (totalQuestions >= MAX_QUESTIONS) {
        warnings.push(`Reached maximum of ${String(MAX_QUESTIONS)} questions; remaining rows skipped`);
        break;
      }
    }

    return {
      parserProfile: "QUESTIONS_TABLE_V1",
      groups,
      counts: { total: validCount + warningCount + invalidCount, valid: validCount, warning: warningCount, invalid: invalidCount },
      warnings,
      errors,
    };
  }
}
