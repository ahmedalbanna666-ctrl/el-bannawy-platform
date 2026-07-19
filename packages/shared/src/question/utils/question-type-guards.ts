import type { QuestionData } from "../interfaces/question-data.interface";
import type { BaseQuestion } from "../entities/base-question.entity";
import { McqQuestion } from "../entities/mcq-question.entity";
import { TrueFalseQuestion } from "../entities/true-false-question.entity";
import { FillInBlankQuestion } from "../entities/fill-in-blank-question.entity";
import { GrammarQuestion } from "../entities/grammar-question.entity";
import { ReadingQuestion } from "../entities/reading-question.entity";
import { ReadingSubQuestion } from "../entities/reading-sub-question.entity";
import { DialogueQuestion } from "../entities/dialogue-question.entity";
import { DialogueSubQuestion } from "../entities/dialogue-sub-question.entity";
import { ParagraphQuestion } from "../entities/paragraph-question.entity";
import { WritingQuestion } from "../entities/writing-question.entity";
import { MatchingQuestion } from "../entities/matching-question.entity";
import { OrderingQuestion } from "../entities/ordering-question.entity";
import { DragDropQuestion } from "../entities/drag-drop-question.entity";
import { ShortAnswerQuestion } from "../entities/short-answer-question.entity";
import { EssayQuestion } from "../entities/essay-question.entity";
import { type QuestionType, QuestionType as QuestionTypeEnum } from "../enums/question-type.enum";
import type { QuestionOption } from "../interfaces/question-option.interface";
import type { QuestionHint } from "../interfaces/question-hint.interface";
import type { QuestionAttachment } from "../interfaces/question-attachment.interface";
import type { QuestionMetadata } from "../interfaces/question-metadata.interface";

export function isMcqData(data: QuestionData): data is Extract<QuestionData, { type: "MCQ" }> {
  return data.type === "MCQ";
}

export function isTrueFalseData(data: QuestionData): data is Extract<QuestionData, { type: "TRUE_FALSE" }> {
  return data.type === "TRUE_FALSE";
}

export function isFillInBlankData(data: QuestionData): data is Extract<QuestionData, { type: "FILL_IN_BLANK" }> {
  return data.type === "FILL_IN_BLANK";
}

export function isGrammarData(data: QuestionData): data is Extract<QuestionData, { type: "GRAMMAR" }> {
  return data.type === "GRAMMAR";
}

export function isReadingData(data: QuestionData): data is Extract<QuestionData, { type: "READING" }> {
  return data.type === "READING";
}

export function isDialogueData(data: QuestionData): data is Extract<QuestionData, { type: "DIALOGUE" }> {
  return data.type === "DIALOGUE";
}

export function isMatchingData(data: QuestionData): data is Extract<QuestionData, { type: "MATCHING" }> {
  return data.type === "MATCHING";
}

export function isOrderingData(data: QuestionData): data is Extract<QuestionData, { type: "ORDERING" }> {
  return data.type === "ORDERING";
}

export function isDragDropData(data: QuestionData): data is Extract<QuestionData, { type: "DRAG_DROP" }> {
  return data.type === "DRAG_DROP";
}

export function isMcqQuestion(question: BaseQuestion): question is McqQuestion {
  return question.getType() === QuestionTypeEnum.MCQ;
}

export function isTrueFalseQuestion(question: BaseQuestion): question is TrueFalseQuestion {
  return question.getType() === QuestionTypeEnum.TRUE_FALSE;
}

export function isFillInBlankQuestion(question: BaseQuestion): question is FillInBlankQuestion {
  return question.getType() === QuestionTypeEnum.FILL_IN_BLANK;
}

export function isGrammarQuestion(question: BaseQuestion): question is GrammarQuestion {
  return question.getType() === QuestionTypeEnum.GRAMMAR;
}

export function isReadingQuestion(question: BaseQuestion): question is ReadingQuestion {
  return question.getType() === QuestionTypeEnum.READING;
}

export function isReadingSubQuestion(question: BaseQuestion): question is ReadingSubQuestion {
  return question.getType() === QuestionTypeEnum.READING_QUESTION;
}

export function isDialogueQuestion(question: BaseQuestion): question is DialogueQuestion {
  return question.getType() === QuestionTypeEnum.DIALOGUE;
}

export function isDialogueSubQuestion(question: BaseQuestion): question is DialogueSubQuestion {
  return question.getType() === QuestionTypeEnum.DIALOGUE_QUESTION;
}

export function isParagraphQuestion(question: BaseQuestion): question is ParagraphQuestion {
  return question.getType() === QuestionTypeEnum.PARAGRAPH;
}

export function isWritingQuestion(question: BaseQuestion): question is WritingQuestion {
  return question.getType() === QuestionTypeEnum.WRITING;
}

export function isMatchingQuestion(question: BaseQuestion): question is MatchingQuestion {
  return question.getType() === QuestionTypeEnum.MATCHING;
}

export function isOrderingQuestion(question: BaseQuestion): question is OrderingQuestion {
  return question.getType() === QuestionTypeEnum.ORDERING;
}

export function isDragDropQuestion(question: BaseQuestion): question is DragDropQuestion {
  return question.getType() === QuestionTypeEnum.DRAG_DROP;
}

export function isShortAnswerQuestion(question: BaseQuestion): question is ShortAnswerQuestion {
  return question.getType() === QuestionTypeEnum.SHORT_ANSWER;
}

export function isEssayQuestion(question: BaseQuestion): question is EssayQuestion {
  return question.getType() === QuestionTypeEnum.ESSAY;
}

export function isOptionBasedType(type: QuestionType): boolean {
  return type === QuestionTypeEnum.MCQ || type === QuestionTypeEnum.TRUE_FALSE;
}

export function isOpenEndedType(type: QuestionType): boolean {
  return (
    type === QuestionTypeEnum.ESSAY ||
    type === QuestionTypeEnum.WRITING ||
    type === QuestionTypeEnum.PARAGRAPH ||
    type === QuestionTypeEnum.SHORT_ANSWER
  );
}

export function isCompositeType(type: QuestionType): boolean {
  return type === QuestionTypeEnum.READING || type === QuestionTypeEnum.DIALOGUE;
}

export function generateQuestionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `q_${timestamp}_${random}`;
}

export function createDefaultMetadata(): QuestionMetadata {
  return {
    difficulty: null,
    estimatedDurationSeconds: null,
    tags: [],
    category: null,
    source: null,
    language: null,
    aiGenerated: false,
    aiModel: null,
  };
}

export function createDefaultHints(): readonly QuestionHint[] {
  return [];
}

export function createDefaultAttachments(): readonly QuestionAttachment[] {
  return [];
}

export function createDefaultOptions(): readonly QuestionOption[] {
  return [];
}

export function countCorrectOptions(options: readonly QuestionOption[]): number {
  return options.filter((opt) => opt.isCorrect).length;
}
