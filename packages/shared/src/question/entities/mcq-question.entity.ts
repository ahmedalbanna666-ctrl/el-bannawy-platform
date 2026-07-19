import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { McqQuestionData } from "../interfaces/question-data.interface";
import type { QuestionOption } from "../interfaces/question-option.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class McqQuestion extends BaseQuestion {
  declare protected readonly data: McqQuestionData;

  constructor(data: McqQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.MCQ;
  }

  getOptions(): readonly QuestionOption[] {
    return this.data.options;
  }

  getCorrectOptionIndex(): number {
    return this.data.options.findIndex((opt) => opt.isCorrect);
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.options.length === 0) {
      errors.push({ code: "MCQ_001", message: "MCQ requires at least one option", field: "options" });
    }

    if (this.data.options.length < 2) {
      errors.push({ code: "MCQ_002", message: "MCQ requires at least two options", field: "options" });
    }

    const correctCount = this.data.options.filter((opt) => opt.isCorrect).length;
    if (correctCount === 0) {
      errors.push({ code: "MCQ_003", message: "MCQ requires exactly one correct option", field: "options" });
    }
    if (correctCount > 1) {
      warnings.push({ code: "MCQ_004", message: "MCQ has multiple correct options", field: "options" });
    }

    const labels = this.data.options.map((opt) => opt.label);
    const uniqueLabels = new Set(labels);
    if (uniqueLabels.size !== labels.length) {
      errors.push({ code: "MCQ_005", message: "MCQ options have duplicate labels", field: "options" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.MCQ,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      options: this.data.options,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
