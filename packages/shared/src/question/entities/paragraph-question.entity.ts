import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { ParagraphQuestionData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class ParagraphQuestion extends BaseQuestion {
  declare protected readonly data: ParagraphQuestionData;

  constructor(data: ParagraphQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.PARAGRAPH;
  }

  getTopic(): string {
    return this.data.topic;
  }

  getWordLimit(): number | null {
    return this.data.wordLimit;
  }

  getGuidingPoints(): readonly string[] {
    return this.data.guidingPoints;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.topic.trim().length === 0) {
      errors.push({ code: "PRG_001", message: "Paragraph question requires a topic", field: "topic" });
    }

    if (this.data.prompt.trim().length === 0) {
      errors.push({ code: "PRG_002", message: "Paragraph question requires a prompt", field: "prompt" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.PARAGRAPH,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      topic: this.data.topic,
      wordLimit: this.data.wordLimit,
      guidingPoints: this.data.guidingPoints,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
