import { Module } from "@nestjs/common";
import { LessonController } from "./lesson.controller";
import { LessonService } from "./lesson.service";
import { DocumentImportModule } from "../document-import/document-import.module";

@Module({
  imports: [DocumentImportModule],
  controllers: [LessonController],
  providers: [LessonService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LessonModule {}
