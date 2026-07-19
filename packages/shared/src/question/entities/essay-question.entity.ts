import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { EssayQuestionData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class EssayQuestion extends BaseQuestion {
  declare protected readonly data: EssayQuestionData;

  constructor(data: EssayQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.ESSAY;
  }

  getTopic(): string {
    return this.data.topic;
  }

  getWordLimit(): number | null {
    return this.data.wordLimit;
  }

  getMinWords(): number | null {
    return this.data.minWords;
  }

  getMaxWords(): number | null {
    return this.data.maxWords;
  }

  getGuidingPoints(): readonly string[] {
    return this.data.guidingPoints;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.topic.trim().length === 0) {
      errors.push({ code: "ESS_001", message: "Essay requires a topic", field: "topic" });
    }

    if (this.data.prompt.trim().length === 0) {
      errors.push({ code: "ESS_002", message: "Essay requires a prompt", field: "prompt" });
    }

    if (this.data.minWords !== null && this.data.maxWords !== null && this.data.minWords > this.data.maxWords) {
      errors.push({ code: "ESS_003", message: "Min words cannot exceed max words", field: "minWords" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.ESSAY,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      topic: this.data.topic,
      wordLimit: this.data.wordLimit,
      minWords: this.data.minWords,
      maxWords: this.data.maxWords,
      guidingPoints: this.data.guidingPoints,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
