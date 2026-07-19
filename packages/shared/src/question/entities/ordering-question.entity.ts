import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { OrderingQuestionData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class OrderingQuestion extends BaseQuestion {
  declare protected readonly data: OrderingQuestionData;

  constructor(data: OrderingQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.ORDERING;
  }

  getItems(): readonly string[] {
    return this.data.items;
  }

  getCorrectOrder(): readonly number[] {
    return this.data.correctOrder;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.items.length === 0) {
      errors.push({ code: "ORD_001", message: "Ordering question requires at least one item", field: "items" });
    }

    if (this.data.items.length < 2) {
      errors.push({ code: "ORD_002", message: "Ordering question requires at least two items", field: "items" });
    }

    if (this.data.correctOrder.length !== this.data.items.length) {
      errors.push({ code: "ORD_003", message: "Correct order must match item count", field: "correctOrder" });
    }

    const sortedOrder = [...this.data.correctOrder].sort((a, b) => a - b);
    const expectedOrder = Array.from({ length: this.data.items.length }, (_, i) => i);
    const orderValid = sortedOrder.every((val, idx) => val === expectedOrder[idx]);
    if (!orderValid) {
      errors.push({ code: "ORD_004", message: "Correct order must contain each index exactly once", field: "correctOrder" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.ORDERING,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      items: this.data.items,
      correctOrder: this.data.correctOrder,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
