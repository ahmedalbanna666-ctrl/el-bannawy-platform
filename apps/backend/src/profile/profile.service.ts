import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

type UserRole = "STUDENT" | "TEACHER" | "STAFF" | "ADMINISTRATOR";

interface RoleProfile {
  stage?: { id: string; name: string } | null;
  grade?: { id: string; name: string } | null;
  currentTerm?: { id: string; name: string } | null;
  assignedGrades?: { id: string; name: string }[];
  totalStudents?: number;
  jobTitle?: string | null;
  permissions?: { key: string; label: string }[];
  administrationType?: string;
  accessScope?: "FULL" | "CUSTOM";
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<unknown> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        englishName: true,
        email: true,
        mobileNumber: true,
        parentMobile: true,
        role: true,
        status: true,
        educationalSystem: true,
        governorate: true,
        school: true,
        avatarUrl: true,
        gradeId: true,
        academicYearId: true,
        termId: true,
        createdAt: true,
        updatedAt: true,
        assignedGrade: { select: { id: true, name: true, stage: { select: { id: true, name: true } } } },
        academicYear: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        jobTitle: true,
      },
    });

    if (!user) throw new NotFoundException("User not found");

    return this.enrichProfile(user);
  }

  private enrichProfile(user: Record<string, unknown>): Record<string, unknown> {
    const role = user.role as UserRole;
    let roleProfile: RoleProfile | null = null;

    switch (role) {
      case "STUDENT": {
        const assignedGrade = user.assignedGrade as { id: string; name: string; stage: { id: string; name: string } } | null;
        const term = user.term as { id: string; name: string } | null;
        roleProfile = {
          stage: assignedGrade?.stage ?? null,
          grade: assignedGrade ? { id: assignedGrade.id, name: assignedGrade.name } : null,
          currentTerm: term ?? null,
        };
        break;
      }
      case "TEACHER":
        roleProfile = {
          assignedGrades: [],
          totalStudents: 0,
        };
        break;
      case "STAFF":
        roleProfile = {
          jobTitle: (user.jobTitle as string) ?? null,
          permissions: [],
        };
        break;
      case "ADMINISTRATOR":
        roleProfile = {
          administrationType: "SCHOOL",
          accessScope: "FULL",
        };
        break;
    }

    const { assignedGrade, academicYear, term, ...rest } = user;
    return { ...rest, roleProfile };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<unknown> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) throw new NotFoundException("User not found");

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.englishName !== undefined ? { englishName: dto.englishName } : {}),
        ...(dto.parentMobile !== undefined ? { parentMobile: dto.parentMobile } : {}),
        ...(dto.educationalSystem !== undefined ? { educationalSystem: dto.educationalSystem } : {}),
        ...(dto.governorate !== undefined ? { governorate: dto.governorate } : {}),
        ...(dto.gradeId !== undefined ? { gradeId: dto.gradeId } : {}),
        ...(dto.academicYearId !== undefined ? { academicYearId: dto.academicYearId } : {}),
        ...(dto.termId !== undefined ? { termId: dto.termId } : {}),
        ...(dto.school !== undefined ? { school: dto.school } : {}),
      },
      select: {
        id: true,
        fullName: true,
        englishName: true,
        email: true,
        mobileNumber: true,
        parentMobile: true,
        role: true,
        status: true,
        educationalSystem: true,
        governorate: true,
        school: true,
        avatarUrl: true,
        gradeId: true,
        academicYearId: true,
        termId: true,
        createdAt: true,
        updatedAt: true,
        assignedGrade: { select: { id: true, name: true, stage: { select: { id: true, name: true } } } },
        academicYear: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        jobTitle: true,
      },
    });

    return this.enrichProfile(updated as Record<string, unknown>);
  }

  async getAchievements(userId: string): Promise<unknown[]> {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
    });
  }
}
