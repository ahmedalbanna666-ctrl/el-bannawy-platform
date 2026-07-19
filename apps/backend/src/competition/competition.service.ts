import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "@prisma/client";
import { AcademicContextService } from "../common/services/academic-context.service";
import { AuditService } from "../common/services/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  CompetitionMode,
  CompetitionStatus,
  ParticipantStatus,
  type CreateCompetitionDto,
  type UpdateCompetitionDto,
  type UpdateCompetitionStatusDto,
  type InviteStudentsDto,
  type SubmitCompetitionDto,
} from "./competition.dto";

interface CompetitionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

@Injectable()
export class CompetitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicContext: AcademicContextService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async listTeacherCompetitions(userId: string): Promise<unknown[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const where: Record<string, unknown> =
      user.role === "ADMINISTRATOR" ? {} : { createdById: userId };

    return this.prisma.competition.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });
  }

  async createCompetition(dto: CreateCompetitionDto, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherGradeAccess(userId, dto.gradeId);
    await this.validateAcademicContext(dto.academicYearId, dto.termId);

    if (dto.mode === CompetitionMode.QUIZ && (!dto.questions || dto.questions.length === 0)) {
      throw new BadRequestException("QUIZ competitions require at least one question");
    }

    const questionsJson =
      dto.questions && dto.questions.length > 0
        ? (dto.questions as unknown as Prisma.InputJsonValue)
        : undefined;

    const competition = await this.prisma.competition.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        mode: dto.mode,
        gradeId: dto.gradeId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        xpReward: dto.xpReward ?? 0,
        coinReward: dto.coinReward ?? 0,
        questions: questionsJson,
        status: CompetitionStatus.DRAFT,
        createdById: userId,
      },
    });

    await this.audit.log({
      actorId: userId,
      action: "COMPETITION_CREATED",
      entity: "Competition",
      entityId: competition.id,
    });
    return competition;
  }

  async getCompetitionForTeacher(id: string, userId: string): Promise<unknown> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundException("Competition not found");
    if (competition.createdById !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== "ADMINISTRATOR") throw new ForbiddenException("Not your competition");
    }
    return competition;
  }

  async updateCompetition(id: string, dto: UpdateCompetitionDto, userId: string): Promise<unknown> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundException("Competition not found");
    if (competition.createdById !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== "ADMINISTRATOR") throw new ForbiddenException("Not your competition");
    }
    if (competition.status !== CompetitionStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT competitions can be edited");
    }

    if (dto.gradeId) await this.academicContext.verifyTeacherGradeAccess(userId, dto.gradeId);
    if (dto.academicYearId || dto.termId) {
      await this.validateAcademicContext(dto.academicYearId ?? competition.academicYearId, dto.termId ?? competition.termId);
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.mode !== undefined) data.mode = dto.mode;
    if (dto.gradeId !== undefined) data.gradeId = dto.gradeId;
    if (dto.academicYearId !== undefined) data.academicYearId = dto.academicYearId;
    if (dto.termId !== undefined) data.termId = dto.termId;
    if (dto.xpReward !== undefined) data.xpReward = dto.xpReward;
    if (dto.coinReward !== undefined) data.coinReward = dto.coinReward;
    if (dto.questions !== undefined) data.questions = dto.questions as unknown as Prisma.InputJsonValue;

    const updated = await this.prisma.competition.update({ where: { id }, data });
    await this.audit.log({ actorId: userId, action: "COMPETITION_UPDATED", entity: "Competition", entityId: id });
    return updated;
  }

  async deleteCompetition(id: string, userId: string): Promise<void> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundException("Competition not found");
    if (competition.createdById !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== "ADMINISTRATOR") throw new ForbiddenException("Not your competition");
    }

    await this.prisma.competition.delete({ where: { id } });
    await this.audit.log({ actorId: userId, action: "COMPETITION_DELETED", entity: "Competition", entityId: id });
  }

  async updateStatus(id: string, dto: UpdateCompetitionStatusDto, userId: string): Promise<unknown> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundException("Competition not found");
    if (competition.createdById !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== "ADMINISTRATOR") throw new ForbiddenException("Not your competition");
    }

    this.validateTransition(competition.status, dto.status);

    const updated = await this.prisma.competition.update({
      where: { id },
      data: { status: dto.status },
    });
    await this.audit.log({
      actorId: userId,
      action: "COMPETITION_STATUS_UPDATED",
      entity: "Competition",
      entityId: id,
      details: JSON.stringify({ from: competition.status, to: dto.status }),
    });
    return updated;
  }

  async inviteStudents(id: string, dto: InviteStudentsDto, userId: string): Promise<unknown> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundException("Competition not found");
    if (competition.createdById !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== "ADMINISTRATOR") throw new ForbiddenException("Not your competition");
    }

    const students = await this.prisma.user.findMany({
      where: { id: { in: dto.studentIds }, role: "STUDENT", gradeId: competition.gradeId, deletedAt: null },
      select: { id: true },
    });

    const validIds = students.map((s) => s.id);
    if (validIds.length === 0) {
      throw new BadRequestException("No eligible students found in the competition grade");
    }

    await this.prisma.competitionParticipant.createMany({
      data: validIds.map((studentId) => ({
        competitionId: id,
        studentId,
        status: ParticipantStatus.INVITED,
        invitedBy: userId,
      })),
      skipDuplicates: true,
    });

    for (const studentId of validIds) {
      await this.notifications
        .sendNotification(userId, {
          type: "COMPETITION",
          title: "دعوة مسابقة جديدة",
          message: `تمت دعوتك للمشاركة في مسابقة: ${competition.title}`,
          priority: "NORMAL",
          targetType: "USER",
          targetId: studentId,
        })
        .catch(() => undefined);
    }

    await this.audit.log({
      actorId: userId,
      action: "COMPETITION_STUDENTS_INVITED",
      entity: "Competition",
      entityId: id,
      details: JSON.stringify({ count: validIds.length }),
    });

    return { invited: validIds.length };
  }

  async finalize(id: string, userId: string): Promise<unknown> {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
      include: { participants: true },
    });
    if (!competition) throw new NotFoundException("Competition not found");
    if (competition.createdById !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== "ADMINISTRATOR") throw new ForbiddenException("Not your competition");
    }
    if (competition.status !== CompetitionStatus.CLOSED && competition.status !== CompetitionStatus.OPEN) {
      throw new BadRequestException("Only OPEN or CLOSED competitions can be finalized");
    }

    const ranked = [...competition.participants]
      .filter((p) => p.status === ParticipantStatus.SUBMITTED)
      .sort((a, b) => b.score - a.score);

    await this.prisma.$transaction(async (tx) => {
      for (const participant of ranked) {
        const topScore = Math.max(ranked[0].score, 1);
        const xpGained = competition.xpReward > 0 ? Math.round((competition.xpReward * participant.score) / topScore) : 0;
        const coinsRewarded = competition.coinReward > 0 ? Math.round((competition.coinReward * participant.score) / topScore) : 0;

        await tx.competitionParticipant.update({
          where: { id: participant.id },
          data: { xpGained },
        });

        if (xpGained > 0) {
          await tx.xPTransaction.create({
            data: { userId: participant.studentId, amount: xpGained, reason: "COMPETITION_REWARD", reference: id },
          });
        }
        if (coinsRewarded > 0) {
          await tx.coinWallet.upsert({
            where: { userId: participant.studentId },
            create: { userId: participant.studentId, balance: coinsRewarded },
            update: { balance: { increment: coinsRewarded } },
          });
        }
      }

      await tx.competition.update({
        where: { id },
        data: { status: CompetitionStatus.FINALIZED },
      });
    });

    await this.audit.log({
      actorId: userId,
      action: "COMPETITION_FINALIZED",
      entity: "Competition",
      entityId: id,
      details: JSON.stringify({ participants: ranked.length }),
    });

    return { finalized: true, ranked: ranked.length };
  }

  async listStudentCompetitions(userId: string): Promise<unknown[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, gradeId: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const where: Record<string, unknown> = {
      status: { in: [CompetitionStatus.OPEN, CompetitionStatus.CLOSED, CompetitionStatus.FINALIZED] },
      participants: { some: { studentId: userId } },
    };
    if (user.role !== "ADMINISTRATOR" && user.gradeId) {
      where.gradeId = user.gradeId;
    }

    const competitions = await this.prisma.competition.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        participants: {
          where: { studentId: userId },
          select: {
            status: true,
            score: true,
            correctCount: true,
          },
        },
      },
    });

    return competitions.map((c) => {
      const participant = c.participants[0];
      const { participants, ...rest } = c;
      void participants;
      return {
        ...rest,
        participantStatus: (participant?.status as ParticipantStatus | undefined) ?? null,
        score: participant?.score ?? null,
        correctCount: participant?.correctCount ?? null,
      };
    });
  }

  async getStudentCompetition(id: string, userId: string): Promise<unknown> {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
      include: {
        participants: {
          where: { studentId: userId },
          select: {
            status: true,
            score: true,
            correctCount: true,
            answers: true,
          },
        },
      },
    });
    if (!competition) throw new NotFoundException("Competition not found");

    const participant = competition.participants[0];
    const { participants, ...rest } = competition;
    void participants;

    return {
      ...rest,
      participantStatus: (participant?.status as ParticipantStatus | undefined) ?? null,
      score: participant?.score ?? null,
      correctCount: participant?.correctCount ?? null,
    };
  }

  async acceptCompetition(id: string, userId: string): Promise<unknown> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundException("Competition not found");
    if (competition.status !== CompetitionStatus.OPEN) {
      throw new BadRequestException("Competition is not open for joining");
    }

    const participant = await this.prisma.competitionParticipant.findUnique({
      where: { competitionId_studentId: { competitionId: id, studentId: userId } },
    });
    if (!participant) throw new NotFoundException("You are not invited to this competition");
    if (participant.status !== ParticipantStatus.INVITED) {
      throw new BadRequestException("You have already joined this competition");
    }

    return this.prisma.competitionParticipant.update({
      where: { id: participant.id },
      data: { status: ParticipantStatus.JOINED, joinedAt: new Date() },
    });
  }

  async submitCompetition(id: string, dto: SubmitCompetitionDto, userId: string): Promise<unknown> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundException("Competition not found");
    if (competition.status !== CompetitionStatus.OPEN) {
      throw new BadRequestException("Competition is not open for submissions");
    }

    const participant = await this.prisma.competitionParticipant.findUnique({
      where: { competitionId_studentId: { competitionId: id, studentId: userId } },
    });
    if (!participant) throw new NotFoundException("You are not invited to this competition");
    if (participant.status !== ParticipantStatus.JOINED) {
      throw new BadRequestException("You must join the competition before submitting");
    }

    const questions = (competition.questions as unknown as CompetitionQuestion[]) ?? [];
    if (competition.mode === CompetitionMode.QUIZ) {
      let correct = 0;
      for (const answer of dto.answers) {
        const q = questions[answer.questionIndex];
        if (q && answer.selectedIndex === q.correctIndex) correct += 1;
      }
      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

      return this.prisma.competitionParticipant.update({
        where: { id: participant.id },
        data: {
          status: ParticipantStatus.SUBMITTED,
          submittedAt: new Date(),
          score,
          correctCount: correct,
          durationSeconds: dto.durationSeconds ?? null,
          answers: dto.answers as unknown as Prisma.InputJsonValue,
        },
      });
    }

    const duration = dto.durationSeconds ?? 0;
    const score = duration > 0 ? Math.max(0, 1000 - duration) : 0;

    return this.prisma.competitionParticipant.update({
      where: { id: participant.id },
      data: {
        status: ParticipantStatus.SUBMITTED,
        submittedAt: new Date(),
        score,
        durationSeconds: dto.durationSeconds ?? null,
        answers: dto.answers as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async getLeaderboard(id: string): Promise<unknown[]> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundException("Competition not found");

    const participants = await this.prisma.competitionParticipant.findMany({
      where: { competitionId: id, status: ParticipantStatus.SUBMITTED },
      orderBy: { score: "desc" },
      include: {
        student: {
          select: { id: true, fullName: true },
        },
      },
    });

    return participants.map((p, index) => {
      const student = p.student as { id: string; fullName: string | null };
      const studentName = student.fullName || "طالب";
      return {
        studentId: student.id,
        studentName,
        rank: index + 1,
        score: p.score,
        xpGained: p.xpGained,
        coinsRewarded: 0,
      };
    });
  }

  private validateTransition(from: string, to: string): void {
    const allowed: Record<string, string[]> = {
      [CompetitionStatus.DRAFT]: [CompetitionStatus.OPEN],
      [CompetitionStatus.OPEN]: [CompetitionStatus.CLOSED],
      [CompetitionStatus.CLOSED]: [CompetitionStatus.FINALIZED, CompetitionStatus.OPEN],
      [CompetitionStatus.FINALIZED]: [],
    };

    const permitted = allowed[from] ?? [];
    if (!permitted.includes(to)) {
      throw new BadRequestException(`Cannot transition competition from ${from} to ${to}`);
    }
  }

  private async validateAcademicContext(academicYearId: string, termId: string): Promise<void> {
    const year = await this.prisma.academicYear.findUnique({ where: { id: academicYearId } });
    if (!year) throw new BadRequestException("Academic year not found");

    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) throw new BadRequestException("Term not found");
    if (term.academicYearId !== academicYearId) {
      throw new BadRequestException("Term does not belong to the selected academic year");
    }
  }
}
