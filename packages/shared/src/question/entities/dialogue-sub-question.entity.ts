import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { DialogueSubQuestionData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class DialogueSubQuestion extends BaseQuestion {
  declare protected readonly data: DialogueSubQuestionData;

  constructor(data: DialogueSubQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.DIALOGUE_QUESTION;
  }

  getDialogueReferenceId(): string {
    return this.data.dialogueReferenceId;
  }

  getCorrectAnswer(): string {
    return this.data.correctAnswer;
  }

  getAcceptableAnswers(): readonly string[] {
    return this.data.acceptableAnswers;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.correctAnswer.trim().length === 0) {
      errors.push({ code: "DLGQ_001", message: "Dialogue sub-question requires a correct answer", field: "correctAnswer" });
    }

    if (this.data.dialogueReferenceId.trim().length === 0) {
      errors.push({ code: "DLGQ_002", message: "Dialogue sub-question requires a dialogue reference", field: "dialogueReferenceId" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.DIALOGUE_QUESTION,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      dialogueReferenceId: this.data.dialogueReferenceId,
      correctAnswer: this.data.correctAnswer,
      acceptableAnswers: this.data.acceptableAnswers,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
