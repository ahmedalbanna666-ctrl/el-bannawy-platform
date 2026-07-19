import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { FillInBlankQuestionData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class FillInBlankQuestion extends BaseQuestion {
  declare protected readonly data: FillInBlankQuestionData;

  constructor(data: FillInBlankQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.FILL_IN_BLANK;
  }

  getCorrectAnswer(): readonly string[] {
    return this.data.correctAnswer;
  }

  getAcceptableAnswers(): readonly string[] {
    return this.data.acceptableAnswers;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.correctAnswer.length === 0) {
      errors.push({ code: "FIB_001", message: "Fill-in-blank requires at least one correct answer", field: "correctAnswer" });
    }

    const hasEmptyAnswer = this.data.correctAnswer.some((ans) => ans.trim().length === 0);
    if (hasEmptyAnswer) {
      errors.push({ code: "FIB_002", message: "Fill-in-blank correct answers cannot be empty", field: "correctAnswer" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.FILL_IN_BLANK,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      correctAnswer: this.data.correctAnswer,
      acceptableAnswers: this.data.acceptableAnswers,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
