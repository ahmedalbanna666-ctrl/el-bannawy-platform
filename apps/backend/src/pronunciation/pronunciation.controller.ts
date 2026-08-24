import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse } from "../common/helpers/response.helper";
import { utf8FilenameInterceptorOptions } from "../common/validators/file.validator";
import { AssessPronunciationDto } from "./dto/assess-pronunciation.dto";
import { PronunciationService } from "./pronunciation.service";

const ALLOWED_AUDIO = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/ogg",
  "audio/flac",
]);
const MAX_BYTES = 10 * 1024 * 1024;

@Controller("pronunciation")
@UseGuards(JwtAuthGuard)
export class PronunciationController {
  constructor(private readonly pronunciationService: PronunciationService) {}

  @Post("assess")
  @UseInterceptors(
    FileInterceptor("audio", {
      ...utf8FilenameInterceptorOptions,
      limits: { fileSize: MAX_BYTES },
    }),
  )
  async assess(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AssessPronunciationDto,
    @CurrentUser() userId: string,
  ): Promise<unknown> {
    // file is provided by the FileInterceptor; the runtime guard is intentionally
    // defensive even though the type is non-optional.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException("الملف الصوتي مطلوب");
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException("حجم الملف الصوتي يتجاوز الحد المسموح (10MB)");
    }
    if (!ALLOWED_AUDIO.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException("صيغة الملف الصوتي غير مدعومة");
    }

    const result = await this.pronunciationService.assess(userId, file, dto);
    return successResponse(result, "تم تقييم النطق بنجاح");
  }
}
