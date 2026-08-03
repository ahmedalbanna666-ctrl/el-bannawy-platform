import { Controller, Get, Put, Post, Body, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UiSettingsService } from "./ui-settings.service";
import { UpdateUiSettingsDto } from "./dto/update-ui-settings.dto";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";
import { validateUploadedFile, utf8FilenameInterceptorOptions } from "../common/validators/file.validator";

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];

@Controller("ui-settings")
export class UiSettingsController {
  constructor(private readonly uiSettingsService: UiSettingsService) {}

  @Get()
  async getConfig(): Promise<ISuccessResponse<Record<string, unknown>>> {
    const config = await this.uiSettingsService.getConfig();
    return successResponse(config, "UI settings retrieved");
  }

  @Put()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMINISTRATOR")
  async updateConfig(
    @Body() dto: UpdateUiSettingsDto,
  ): Promise<ISuccessResponse<Record<string, unknown>>> {
    const config = await this.uiSettingsService.updateConfig(dto);
    return successResponse(config, "UI settings updated");
  }

  @Post("upload")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMINISTRATOR")
  @UseInterceptors(FileInterceptor("file", utf8FilenameInterceptorOptions))
  async uploadImage(
    @UploadedFile() file: Record<string, unknown>,
    @Body("kind") kind: string,
    @Req() req: Request,
  ): Promise<ISuccessResponse<{ url: string }>> {
    const f = file as { buffer?: Buffer; originalname?: string; mimetype?: string; size?: number };
    validateUploadedFile(f, { allowedMimes: ALLOWED_IMAGE_MIMES, maxSize: 5 * 1024 * 1024 });
    const buffer = f.buffer;
    if (!buffer) {
      throw new BadRequestException("File is required");
    }
    const relativePath = await this.uiSettingsService.saveImage(
      buffer,
      f.originalname ?? "background.png",
      kind === "sidebar" ? "sidebar" : "background",
    );
    const host = req.get("host") ?? `localhost:${process.env.PORT ?? "4000"}`;
    const baseUrl = `${req.protocol}://${host}`;
    return successResponse({ url: `${baseUrl}${relativePath}` }, "Image uploaded");
  }

  @Post("reset")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMINISTRATOR")
  async resetConfig(): Promise<ISuccessResponse<Record<string, unknown>>> {
    const config = await this.uiSettingsService.resetConfig();
    return successResponse(config, "UI settings reset to defaults");
  }
}
