import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { DragDropQuestionData, DragDropMappingData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class DragDropQuestion extends BaseQuestion {
  declare protected readonly data: DragDropQuestionData;

  constructor(data: DragDropQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.DRAG_DROP;
  }

  getItems(): readonly string[] {
    return this.data.items;
  }

  getTargetZones(): readonly string[] {
    return this.data.targetZones;
  }

  getCorrectMapping(): readonly DragDropMappingData[] {
    return this.data.correctMapping;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.items.length === 0) {
      errors.push({ code: "DD_001", message: "Drag-drop requires at least one item", field: "items" });
    }

    if (this.data.targetZones.length === 0) {
      errors.push({ code: "DD_002", message: "Drag-drop requires at least one target zone", field: "targetZones" });
    }

    if (this.data.correctMapping.length === 0) {
      errors.push({ code: "DD_003", message: "Drag-drop requires correct mapping", field: "correctMapping" });
    }

    const uniqueItems = new Set(this.data.items);
    if (uniqueItems.size !== this.data.items.length) {
      warnings.push({ code: "DD_004", message: "Drag-drop has duplicate items", field: "items" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.DRAG_DROP,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      items: this.data.items,
      targetZones: this.data.targetZones,
      correctMapping: this.data.correctMapping,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
