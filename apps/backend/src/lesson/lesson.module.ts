import { Module } from "@nestjs/common";
import { LessonController } from "./lesson.controller";
import { LessonService } from "./lesson.service";
import { LessonRepository } from "./lesson.repository";
import { DocumentImportModule } from "../document-import/document-import.module";
import { GradeScheduleModule } from "../grade-schedule/grade-schedule.module";
import { StorageModule } from "../common/storage/storage.module";

@Module({
  imports: [DocumentImportModule, GradeScheduleModule, StorageModule],
  controllers: [LessonController],
  providers: [LessonService, LessonRepository],
  exports: [LessonService, LessonRepository],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LessonModule {}
