import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Body, BadRequestException, UnsupportedMediaTypeException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { successResponse } from "../common/helpers/response.helper";
import { AssessPronunciationDto } from "./dto/assess-pronunciation.dto";
import { PronunciationService } from "./pronunciation.service";

const ALLOWED = new Set(["audio/wav","audio/x-wav","audio/wave","audio/webm","audio/mp4","audio/m4a","audio/mpeg","audio/ogg","audio/flac"]);
const MAX = 10*1024*1024;

@Controller("pronunciation")
@UseGuards(JwtAuthGuard)
export class PronunciationController {
  constructor(private readonly svc: PronunciationService) {}
  @Post("assess")
  @UseInterceptors(FileInterceptor("audio", { limits: { fileSize: MAX } }))
  async assess(@UploadedFile() file: Express.Multer.File, @Body() dto: AssessPronunciationDto, @CurrentUser() userId: string) {
    if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestException("الملف الصوتي مطلوب");
    if (file.size > MAX) throw new BadRequestException("حجم الملف كبير");
    if (!ALLOWED.has(file.mimetype)) throw new UnsupportedMediaTypeException("صيغة غير مدعومة");
    const r = await this.svc.assess(userId, file, dto);
    return successResponse(r, "تم التقييم بنجاح");
  }
}
