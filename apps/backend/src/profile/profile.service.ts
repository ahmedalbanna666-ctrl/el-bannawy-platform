import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

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
        mobileNumber: true,
        parentMobile: true,
        role: true,
        status: true,
        educationalSystem: true,
        educationalStage: true,
        grade: true,
        academicTerm: true,
        governorate: true,
        school: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException("User not found");
    return user;
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
        ...(dto.educationalStage !== undefined ? { educationalStage: dto.educationalStage } : {}),
        ...(dto.grade !== undefined ? { grade: dto.grade } : {}),
        ...(dto.academicTerm !== undefined ? { academicTerm: dto.academicTerm } : {}),
        ...(dto.governorate !== undefined ? { governorate: dto.governorate } : {}),
        ...(dto.school !== undefined ? { school: dto.school } : {}),
      },
      select: {
        id: true,
        fullName: true,
        englishName: true,
        mobileNumber: true,
        parentMobile: true,
        role: true,
        status: true,
        educationalSystem: true,
        educationalStage: true,
        grade: true,
        academicTerm: true,
        governorate: true,
        school: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }
}
