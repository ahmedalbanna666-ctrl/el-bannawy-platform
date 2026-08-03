import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { QuestionStructuredDraft, QuestionPersistenceResult } from "../types/question-structured.types";

const MAX_GROUPS = 50;
const MAX_QUESTIONS = 500;

@Injectable()
export class QuestionPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async persistQuestions(
    lessonId: string,
    draft: QuestionStructuredDraft,
  ): Promise<QuestionPersistenceResult> {
    this.validate(lessonId, draft);

    return this.prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({
        where: { lessonId, groupId: { not: null } },
      });

      await tx.questionGroup.deleteMany({
        where: { lessonId },
      });

      const persistedGroups: { id: string; title: string; count: number }[] = [];

      for (const group of draft.groups) {
        const createdGroup = await tx.questionGroup.create({
          data: {
            lessonId,
            title: group.title,
            kind: "GENERAL",
            displayOrder: group.displayOrder,
          },
        });

        const validItems = group.items.filter(
          (item) => item.status !== "INVALID" && item.prompt.trim().length > 0,
        );

        for (const item of validItems) {
          await tx.question.create({
            data: {
              lessonId,
              groupId: createdGroup.id,
              type: item.questionType,
              prompt: item.prompt,
              instruction: item.instruction,
              explanation: item.explanation ?? (item.questionType === "GRAMMAR" ? item.correctAnswer : null),
              displayOrder: item.displayOrder,
              config: item.options.length > 0
                ? { options: item.options.map((o) => ({ label: o.label, text: o.text })) }
                : undefined,
              metadata: {
                correctAnswer: item.correctAnswer,
                acceptableAnswers: item.acceptableAnswers,
                passageText: item.passageText,
                warnings: item.warnings,
              },
              options: {
                create: item.options.map((o, oi) => ({
                  label: o.label,
                  text: o.text,
                  isCorrect: o.isCorrect,
                  displayOrder: oi,
                })),
              },
            },
          });
        }

        persistedGroups.push({
          id: createdGroup.id,
          title: createdGroup.title,
          count: validItems.length,
        });
      }

      const totalQuestions = persistedGroups.reduce((sum, g) => sum + g.count, 0);

      return {
        lessonId,
        groupCount: persistedGroups.length,
        questionCount: totalQuestions,
        groups: persistedGroups,
      };
    });
  }

  private validate(lessonId: string, draft: QuestionStructuredDraft): void {
    if (!lessonId || lessonId.trim().length === 0) {
      throw new BadRequestException("lessonId must be non-empty");
    }
    if (!draft.groups || draft.groups.length === 0) {
      throw new BadRequestException("No question groups to persist");
    }
    if (draft.groups.length > MAX_GROUPS) {
      throw new BadRequestException(`Maximum ${String(MAX_GROUPS)} groups allowed, got ${String(draft.groups.length)}`);
    }
    const total = draft.groups.reduce((sum, g) => sum + g.items.length, 0);
    if (total > MAX_QUESTIONS) {
      throw new BadRequestException(`Maximum ${String(MAX_QUESTIONS)} questions allowed, got ${String(total)}`);
    }
  }
}
