import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { AiKnowledgeBaseService } from "./ai-knowledge-base.service";
import { CreateKnowledgeSourceDto, UpdateKnowledgeSourceDto, ReindexSourceDto } from "./dto/create-knowledge-source.dto";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { utf8FilenameInterceptorOptions, knowledgeBaseInterceptorOptions } from "../common/validators/file.validator";

@Controller("ai-knowledge-base")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiKnowledgeBaseController {
  constructor(private readonly service: AiKnowledgeBaseService) {}

  @Post("sources")
  @Roles("ADMINISTRATOR", "TEACHER")
  @UseInterceptors(FileInterceptor("file", { ...utf8FilenameInterceptorOptions, ...knowledgeBaseInterceptorOptions }))
  async createSource(@Body() dto: CreateKnowledgeSourceDto, @UploadedFile() file?: Express.Multer.File): Promise<ISuccessResponse<unknown>> {
    const source = await this.service.createSource(dto, file);
    return successResponse(source, "Knowledge source created");
  }

  @Get("sources")
  @Roles("ADMINISTRATOR", "TEACHER")
  async listSources(@Query("gradeId") gradeId?: string, @Query("status") status?: string, @Query("type") type?: string): Promise<ISuccessResponse<unknown[]>> {
    const sources = await this.service.listSources({ gradeId, status, type });
    return successResponse(sources);
  }

  @Get("sources/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async getSource(@Param("id") id: string): Promise<ISuccessResponse<unknown>> {
    const source = await this.service.getSource(id);
    return successResponse(source);
  }

  @Patch("sources/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async updateSource(@Param("id") id: string, @Body() dto: UpdateKnowledgeSourceDto): Promise<ISuccessResponse<unknown>> {
    const source = await this.service.updateSource(id, dto);
    return successResponse(source, "Knowledge source updated");
  }

  @Patch("sources/:id/enable")
  @Roles("ADMINISTRATOR", "TEACHER")
  async setSourceEnabled(@Param("id") id: string, @Body("isEnabled") isEnabled?: boolean): Promise<ISuccessResponse<unknown>> {
    const source = await this.service.setSourceEnabled(id, isEnabled ?? true);
    return successResponse(source, isEnabled === false ? "Knowledge source disabled" : "Knowledge source enabled");
  }

  @Get("stats")
  @Roles("ADMINISTRATOR", "TEACHER")
  async getStats(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getStats());
  }

  @Get("search/preview")
  @Roles("ADMINISTRATOR", "TEACHER")
  async searchPreview(@Query("q") query: string, @Query("gradeId") gradeId?: string, @Query("termId") termId?: string): Promise<ISuccessResponse<unknown[]>> {
    if (!query) return successResponse([]);
    return successResponse(await this.service.searchPreview(query, { gradeId, termId }));
  }

  @Delete("sources/:id")
  @Roles("ADMINISTRATOR", "TEACHER")
  async deleteSource(@Param("id") id: string): Promise<ISuccessResponse<null>> {
    await this.service.deleteSource(id);
    return successResponse(null, "Knowledge source deleted");
  }

  @Post("reindex")
  @Roles("ADMINISTRATOR", "TEACHER")
  async reindexSource(@Body() dto: ReindexSourceDto): Promise<ISuccessResponse<null>> {
    if (!dto.sourceId) {
      const sources = await this.service.listSources();
      for (const source of sources) {
        await this.service.reindexSource(source.id);
      }
      return successResponse(null, "All sources re-indexed");
    }
    await this.service.reindexSource(dto.sourceId);
    return successResponse(null, "Source re-indexed");
  }

  @Get("search")
  async searchKnowledge(@Query("q") query: string, @Query("gradeId") gradeId?: string, @Query("termId") termId?: string): Promise<ISuccessResponse<unknown[]>> {
    if (!query) return successResponse([]);
    const results = await this.service.searchKnowledge(query, { gradeId, termId });
    return successResponse(results);
  }

  @Get("grades")
  async getGrades(): Promise<ISuccessResponse<unknown[]>> {
    return successResponse(await this.service.getGrades());
  }

  @Get("terms")
  async getTerms(): Promise<ISuccessResponse<unknown[]>> {
    return successResponse(await this.service.getTerms());
  }
}
