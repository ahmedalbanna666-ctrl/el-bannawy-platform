import { Module } from "@nestjs/common";
import { LessonController } from "./lesson.controller";
import { LessonService } from "./lesson.service";
import { DocumentImportModule } from "../document-import/document-import.module";
import { LocalFileStorage } from "../common/storage/local-file.storage";

@Module({
  imports: [DocumentImportModule],
  controllers: [LessonController],
  providers: [LessonService, LocalFileStorage],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LessonModule {}
