import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Res,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { SavedDocumentsService } from "./saved-documents.service";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import type { Response } from "express";

@Controller("saved-documents")
@UseGuards(JwtAuthGuard)
export class SavedDocumentsController {
  constructor(private readonly service: SavedDocumentsService) {}

  @Post(":lessonId")
  async save(
    @CurrentUser("id") userId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
  ): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.save(userId, lessonId), "Document saved");
  }

  @Get()
  async findAll(@CurrentUser("id") userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.findAll(userId));
  }

  @Delete(":id")
  async remove(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ISuccessResponse<unknown>> {
    await this.service.remove(userId, id);
    return successResponse(null, "Document removed from saved");
  }

  @Get(":id/download")
  async download(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.service.getFile(userId, id);
    res.setHeader("Content-Type", file.mimeType);
    const encoded = encodeURIComponent(file.fileName);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encoded}`);
    res.setHeader("Content-Length", file.buffer.length);
    res.end(file.buffer);
  }

  @Get(":id/view")
  async view(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.service.getFile(userId, id);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    res.setHeader("Content-Length", file.buffer.length);
    res.end(file.buffer);
  }
}
