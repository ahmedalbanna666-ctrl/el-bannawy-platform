import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { HomeModule } from "./home/home.module";
import { CurriculumModule } from "./curriculum/curriculum.module";
import { LessonModule } from "./lesson/lesson.module";
import { VideoModule } from "./video/video.module";
import { ActivityModule } from "./activity/activity.module";
import { HomeworkModule } from "./homework/homework.module";
import { QuizModule } from "./quiz/quiz.module";
import { ReportsModule } from "./reports/reports.module";
import { PaymentsModule } from "./payments/payments.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AiModule } from "./ai/ai.module";
import { ProfileModule } from "./profile/profile.module";
import { CommonModule } from "./common/common.module";
import { StoryModule } from "./story/story.module";
import { FinalReviewModule } from "./final-review/final-review.module";
import { DocumentImportModule } from "./document-import/document-import.module";
import { AdminModule } from "./admin/admin.module";
import { TeachersModule } from "./teachers/teachers.module";
import { BootstrapService } from "./common/services/bootstrap.service";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HomeModule,
    CurriculumModule,
    LessonModule,
    VideoModule,
    ActivityModule,
    HomeworkModule,
    QuizModule,
    ReportsModule,
    PaymentsModule,
    NotificationsModule,
    AiModule,
    ProfileModule,
    CommonModule,
    StoryModule,
    FinalReviewModule,
    DocumentImportModule,
    AdminModule,
    TeachersModule,
  ],
  providers: [BootstrapService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
