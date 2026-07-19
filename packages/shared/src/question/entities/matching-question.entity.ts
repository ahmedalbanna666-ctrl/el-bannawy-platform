import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { MatchingQuestionData, MatchPairData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class MatchingQuestion extends BaseQuestion {
  declare protected readonly data: MatchingQuestionData;

  constructor(data: MatchingQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.MATCHING;
  }

  getPairs(): readonly MatchPairData[] {
    return this.data.pairs;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.pairs.length === 0) {
      errors.push({ code: "MTC_001", message: "Matching question requires at least one pair", field: "pairs" });
    }

    const hasEmptyLeft = this.data.pairs.some((pair) => pair.left.trim().length === 0);
    if (hasEmptyLeft) {
      errors.push({ code: "MTC_002", message: "Match pair left item cannot be empty", field: "pairs" });
    }

    const hasEmptyRight = this.data.pairs.some((pair) => pair.right.trim().length === 0);
    if (hasEmptyRight) {
      errors.push({ code: "MTC_003", message: "Match pair right item cannot be empty", field: "pairs" });
    }

    const leftLabels = this.data.pairs.map((p) => p.left);
    const uniqueLeft = new Set(leftLabels);
    if (uniqueLeft.size !== leftLabels.length) {
      warnings.push({ code: "MTC_004", message: "Matching has duplicate left items", field: "pairs" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.MATCHING,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      pairs: this.data.pairs,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
