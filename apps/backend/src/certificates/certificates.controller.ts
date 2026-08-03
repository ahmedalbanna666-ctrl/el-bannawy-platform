import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Res,
} from "@nestjs/common";
import { IsString, IsOptional, IsMimeType } from "class-validator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { CertificatesService, type IssueCertificateInput } from "./certificates.service";
import type { Response } from "express";

class IssueCertificateDto implements IssueCertificateInput {
  @IsString()
  fileName!: string;

  @IsOptional()
  @IsMimeType()
  mimeType?: string;

  @IsString()
  data!: string;
}

@Controller("certificates")
@UseGuards(JwtAuthGuard)
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  @Get("config")
  async getConfig(@CurrentUser() _userId: string): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.service.getConfig(), "Certificate config retrieved");
  }

  @Get()
  async list(@CurrentUser() userId: string): Promise<ISuccessResponse<unknown[]>> {
    return successResponse(await this.service.list(userId), "Certificates retrieved");
  }

  @Post(":unitId")
  async issue(
    @CurrentUser() userId: string,
    @Param("unitId", ParseUUIDPipe) unitId: string,
    @Body() dto: IssueCertificateDto,
  ): Promise<ISuccessResponse<unknown>> {
    const data = await this.service.issue(userId, unitId, dto);
    return successResponse(data, "Certificate issued");
  }

  @Get(":id/download")
  async download(
    @CurrentUser() userId: string,
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
    @CurrentUser() userId: string,
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
