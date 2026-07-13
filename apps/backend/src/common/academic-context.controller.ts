import { Controller, Get, UseGuards } from "@nestjs/common";
import { AcademicContextService } from "./services/academic-context.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { successResponse, type ISuccessResponse } from "./helpers/response.helper";

interface ContextResponse {
  academicYear: { id: string; name: string } | null;
  term: { id: string; name: string } | null;
  termManagementMode: string | null;
}

@Controller("academic-context")
export class AcademicContextController {
  constructor(
    private readonly academicContextService: AcademicContextService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getActiveContext(): Promise<ISuccessResponse<ContextResponse>> {
    const ctx = await this.academicContextService.getActiveAcademicContext();

    const [year, term, modeSetting] = await Promise.all([
      ctx.academicYearId
        ? this.prisma.academicYear.findUnique({
            where: { id: ctx.academicYearId },
            select: { id: true, name: true },
          })
        : null,
      ctx.termId
        ? this.prisma.term.findUnique({
            where: { id: ctx.termId },
            select: { id: true, name: true },
          })
        : null,
      this.prisma.systemSetting.findUnique({
        where: { key: "term_management_mode" },
        select: { value: true },
      }),
    ]);

    return successResponse({
      academicYear: year ?? null,
      term: term ?? null,
      termManagementMode: modeSetting?.value ?? null,
    });
  }
}
