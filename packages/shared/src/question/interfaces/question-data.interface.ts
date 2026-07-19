import type { QuestionType } from "../enums/question-type.enum";
import type { QuestionOption } from "./question-option.interface";
import type { QuestionHint } from "./question-hint.interface";
import type { QuestionAttachment } from "./question-attachment.interface";
import type { QuestionMetadata } from "./question-metadata.interface";

export interface QuestionDataBase {
  readonly id: string;
  readonly type: QuestionType;
  readonly prompt: string;
  readonly instruction: string | null;
  readonly explanation: string | null;
  readonly hints: readonly QuestionHint[];
  readonly attachments: readonly QuestionAttachment[];
  readonly metadata: QuestionMetadata | null;
  readonly displayOrder: number;
}

export interface McqQuestionData extends QuestionDataBase {
  readonly type: "MCQ";
  readonly options: readonly QuestionOption[];
}

export interface TrueFalseQuestionData extends QuestionDataBase {
  readonly type: "TRUE_FALSE";
  readonly options: readonly QuestionOption[];
}

export interface FillInBlankQuestionData extends QuestionDataBase {
  readonly type: "FILL_IN_BLANK";
  readonly correctAnswer: string[];
  readonly acceptableAnswers: readonly string[];
}

export interface GrammarQuestionData extends QuestionDataBase {
  readonly type: "GRAMMAR";
  readonly bracketedWord: string;
  readonly correctForm: string;
  readonly contextSentence: string;
}

export interface ReadingQuestionData extends QuestionDataBase {
  readonly type: "READING";
  readonly passageText: string;
  readonly passageTitle: string | null;
  readonly subQuestions: readonly QuestionData[];
}

export interface ReadingSubQuestionData extends QuestionDataBase {
  readonly type: "READING_QUESTION";
  readonly passageReferenceId: string;
  readonly options: readonly QuestionOption[] | null;
  readonly correctAnswer: string | null;
}

export interface DialogueQuestionData extends QuestionDataBase {
  readonly type: "DIALOGUE";
  readonly dialogueTitle: string | null;
  readonly speakers: readonly string[];
  readonly lines: readonly DialogueLineData[];
  readonly subQuestions: readonly QuestionData[];
}

export interface DialogueLineData {
  readonly speaker: string;
  readonly text: string;
  readonly blankIndex: number | null;
}

export interface DialogueSubQuestionData extends QuestionDataBase {
  readonly type: "DIALOGUE_QUESTION";
  readonly dialogueReferenceId: string;
  readonly correctAnswer: string;
  readonly acceptableAnswers: readonly string[];
}

export interface ParagraphQuestionData extends QuestionDataBase {
  readonly type: "PARAGRAPH";
  readonly topic: string;
  readonly wordLimit: number | null;
  readonly guidingPoints: readonly string[];
}

export interface WritingQuestionData extends QuestionDataBase {
  readonly type: "WRITING";
  readonly topic: string;
  readonly wordLimit: number | null;
  readonly prompt: string;
}

export interface MatchingQuestionData extends QuestionDataBase {
  readonly type: "MATCHING";
  readonly pairs: readonly MatchPairData[];
}

export interface MatchPairData {
  readonly left: string;
  readonly right: string;
}

export interface OrderingQuestionData extends QuestionDataBase {
  readonly type: "ORDERING";
  readonly items: readonly string[];
  readonly correctOrder: readonly number[];
}

export interface DragDropQuestionData extends QuestionDataBase {
  readonly type: "DRAG_DROP";
  readonly items: readonly string[];
  readonly targetZones: readonly string[];
  readonly correctMapping: readonly DragDropMappingData[];
}

export interface DragDropMappingData {
  readonly itemIndex: number;
  readonly zoneIndex: number;
}

export interface ShortAnswerQuestionData extends QuestionDataBase {
  readonly type: "SHORT_ANSWER";
  readonly correctAnswer: string;
  readonly acceptableAnswers: readonly string[];
  readonly maxLength: number | null;
}

export interface EssayQuestionData extends QuestionDataBase {
  readonly type: "ESSAY";
  readonly topic: string;
  readonly wordLimit: number | null;
  readonly minWords: number | null;
  readonly maxWords: number | null;
  readonly guidingPoints: readonly string[];
}

export type QuestionData =
  | McqQuestionData
  | TrueFalseQuestionData
  | FillInBlankQuestionData
  | GrammarQuestionData
  | ReadingQuestionData
  | ReadingSubQuestionData
  | DialogueQuestionData
  | DialogueSubQuestionData
  | ParagraphQuestionData
  | WritingQuestionData
  | MatchingQuestionData
  | OrderingQuestionData
  | DragDropQuestionData
  | ShortAnswerQuestionData
  | EssayQuestionData;
