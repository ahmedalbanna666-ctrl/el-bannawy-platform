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

export type QuestionCreator = (data: QuestionData) => BaseQuestion;

export class QuestionFactory {
  private readonly registry: Map<string, QuestionCreator>;

  constructor() {
    this.registry = new Map();
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register("MCQ", (data) => new McqQuestion(data as never));
    this.register("TRUE_FALSE", (data) => new TrueFalseQuestion(data as never));
    this.register("FILL_IN_BLANK", (data) => new FillInBlankQuestion(data as never));
    this.register("GRAMMAR", (data) => new GrammarQuestion(data as never));
    this.register("READING", (data) => new ReadingQuestion(data as never));
    this.register("READING_QUESTION", (data) => new ReadingSubQuestion(data as never));
    this.register("DIALOGUE", (data) => new DialogueQuestion(data as never));
    this.register("DIALOGUE_QUESTION", (data) => new DialogueSubQuestion(data as never));
    this.register("PARAGRAPH", (data) => new ParagraphQuestion(data as never));
    this.register("WRITING", (data) => new WritingQuestion(data as never));
    this.register("MATCHING", (data) => new MatchingQuestion(data as never));
    this.register("ORDERING", (data) => new OrderingQuestion(data as never));
    this.register("DRAG_DROP", (data) => new DragDropQuestion(data as never));
    this.register("SHORT_ANSWER", (data) => new ShortAnswerQuestion(data as never));
    this.register("ESSAY", (data) => new EssayQuestion(data as never));
  }

  register(type: string, creator: QuestionCreator): void {
    this.registry.set(type, creator);
  }

  create(data: QuestionData): BaseQuestion {
    const creator = this.registry.get(data.type);
    if (creator === undefined) {
      throw new Error(`Unknown question type: "${data.type}". Register a creator first.`);
    }
    return creator(data);
  }

  supports(type: string): boolean {
    return this.registry.has(type);
  }

  getRegisteredTypes(): readonly string[] {
    return Array.from(this.registry.keys());
  }
}
