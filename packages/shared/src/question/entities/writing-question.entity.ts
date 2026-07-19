import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { WritingQuestionData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class WritingQuestion extends BaseQuestion {
  declare protected readonly data: WritingQuestionData;

  constructor(data: WritingQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.WRITING;
  }

  getTopic(): string {
    return this.data.topic;
  }

  getWordLimit(): number | null {
    return this.data.wordLimit;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.topic.trim().length === 0) {
      errors.push({ code: "WRT_001", message: "Writing question requires a topic", field: "topic" });
    }

    if (this.data.prompt.trim().length === 0) {
      errors.push({ code: "WRT_002", message: "Writing question requires a prompt", field: "prompt" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.WRITING,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      topic: this.data.topic,
      wordLimit: this.data.wordLimit,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
