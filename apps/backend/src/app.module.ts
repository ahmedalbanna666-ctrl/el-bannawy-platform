import * as path from "path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import {
  appConfig,
  authConfig,
  paymentConfig,
  aiConfig,
  validationSchema,
} from "./config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { HomeModule } from "./home/home.module";
import { CurriculumModule } from "./curriculum/curriculum.module";
import { LessonModule } from "./lesson/lesson.module";
import { VideoModule } from "./video/video.module";
import { VideoQuestionModule } from "./video-question/video-question.module";
import { ActivityModule } from "./activity/activity.module";
import { ExecutionModule } from "./execution/execution.module";
import { VideoEventModule } from "./video-event/video-event.module";
import { HomeworkModule } from "./homework/homework.module";
import { QuizModule } from "./quiz/quiz.module";
import { ReportsModule } from "./reports/reports.module";
import { PaymentsModule } from "./payments/payments.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AiModule } from "./ai/ai.module";
import { ProfileModule } from "./profile/profile.module";
import { CommonModule } from "./common/common.module";
import { StoryModule } from "./story/story.module";
import { CompetitionModule } from "./competition/competition.module";
import { FinalReviewModule } from "./final-review/final-review.module";
import { DocumentImportModule } from "./document-import/document-import.module";
import { AdminModule } from "./admin/admin.module";
import { TeachersModule } from "./teachers/teachers.module";
import { SupportModule } from "./support/support.module";
import { MistakesModule } from "./mistakes/mistakes.module";
import { CoinsModule } from "./coins/coins.module";
import { LiveModule } from "./live/live.module";
import { BootstrapService } from "./common/services/bootstrap.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(__dirname, "..", "..", "..", "..", ".env")],
      load: [appConfig, authConfig, paymentConfig, aiConfig],
      validationSchema,
      validationOptions: { abortEarly: true },
    }),
    PrismaModule,
    AuthModule,
    HomeModule,
    CurriculumModule,
    LessonModule,
    VideoModule,
    VideoQuestionModule,
    ActivityModule,
    ExecutionModule,
    VideoEventModule,
    HomeworkModule,
    QuizModule,
    ReportsModule,
    PaymentsModule,
    NotificationsModule,
    AiModule,
    ProfileModule,
    CommonModule,
    StoryModule,
    CompetitionModule,
    FinalReviewModule,
    DocumentImportModule,
    AdminModule,
    TeachersModule,
    SupportModule,
    MistakesModule,
    CoinsModule,
    LiveModule,
  ],
  providers: [BootstrapService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
