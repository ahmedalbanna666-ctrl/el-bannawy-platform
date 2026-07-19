import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { DialogueQuestionData, DialogueLineData, QuestionData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class DialogueQuestion extends BaseQuestion {
  declare protected readonly data: DialogueQuestionData;

  constructor(data: DialogueQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.DIALOGUE;
  }

  getDialogueTitle(): string | null {
    return this.data.dialogueTitle;
  }

  getSpeakers(): readonly string[] {
    return this.data.speakers;
  }

  getLines(): readonly DialogueLineData[] {
    return this.data.lines;
  }

  getSubQuestions(): readonly QuestionData[] {
    return this.data.subQuestions;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.lines.length === 0) {
      errors.push({ code: "DLG_001", message: "Dialogue requires at least one line", field: "lines" });
    }

    if (this.data.speakers.length === 0) {
      errors.push({ code: "DLG_002", message: "Dialogue requires at least one speaker", field: "speakers" });
    }

    const invalidSpeaker = this.data.lines.some(
      (line) => line.speaker.trim().length === 0,
    );
    if (invalidSpeaker) {
      errors.push({ code: "DLG_003", message: "Dialogue line has empty speaker", field: "lines" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.DIALOGUE,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      dialogueTitle: this.data.dialogueTitle,
      speakers: this.data.speakers,
      lines: this.data.lines,
      subQuestions: this.data.subQuestions,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
