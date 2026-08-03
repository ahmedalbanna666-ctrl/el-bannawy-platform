import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateSocialLinkDto {
  platform: string;
  label: string;
  url: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateSocialLinkDto {
  platform?: string;
  label?: string;
  url?: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
}

@Injectable()
export class SocialLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<unknown> {
    return this.prisma.socialLink.findMany({
      orderBy: { displayOrder: "asc" },
    });
  }

  async getActive(): Promise<unknown> {
    return this.prisma.socialLink.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  async create(dto: CreateSocialLinkDto): Promise<unknown> {
    return this.prisma.socialLink.create({
      data: {
        platform: dto.platform,
        label: dto.label,
        url: dto.url,
        icon: dto.icon ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateSocialLinkDto): Promise<unknown> {
    const link = await this.prisma.socialLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException("Social link not found");

    return this.prisma.socialLink.update({
      where: { id },
      data: {
        ...(dto.platform !== undefined && { platform: dto.platform }),
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.icon !== undefined && { icon: dto.icon ?? null }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string): Promise<void> {
    const link = await this.prisma.socialLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException("Social link not found");

    await this.prisma.socialLink.delete({ where: { id } });
  }
}
