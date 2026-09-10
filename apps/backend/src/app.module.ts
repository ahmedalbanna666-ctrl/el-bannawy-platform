import * as path from "path";
import { existsSync } from "fs";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
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
import { AiKnowledgeBaseModule } from "./ai-knowledge-base/ai-knowledge-base.module";
import { AiSettingsModule } from "./ai-settings/ai-settings.module";
import { SavedDocumentsModule } from "./saved-documents/saved-documents.module";
import { ProfileModule } from "./profile/profile.module";
import { CommonModule } from "./common/common.module";
import { CompetitionModule } from "./competition/competition.module";
import { DocumentImportModule } from "./document-import/document-import.module";
import { AdminModule } from "./admin/admin.module";
import { TeachersModule } from "./teachers/teachers.module";
import { SupportModule } from "./support/support.module";
import { MistakesModule } from "./mistakes/mistakes.module";
import { CoinsModule } from "./coins/coins.module";
import { LiveModule } from "./live/live.module";
import { ZoomModule } from "./zoom/zoom.module";
import { HealthModule } from "./health/health.module";
import { ManualPaymentModule } from "./manual-payment/manual-payment.module";
import { EssayEvaluationModule } from "./essay-evaluation/essay-evaluation.module";
import { SocialLinksModule } from "./social-links/social-links.module";
import { UiSettingsModule } from "./ui-settings/ui-settings.module";
import { GradeScheduleModule } from "./grade-schedule/grade-schedule.module";
import { GamesModule } from "./games/games.module";
import { CertificatesModule } from "./certificates/certificates.module";
import { ReferralModule } from "./referral/referral.module";
import { MailModule } from "./mail/mail.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { PageStatusModule } from "./page-status/page-status.module";
import { BootstrapService } from "./common/services/bootstrap.service";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        ...[path.resolve(__dirname, "..", "..", "..", "..", ".env"), path.resolve(__dirname, "..", "..", "..", ".env")].filter((p) => existsSync(p)),
      ],
      load: [appConfig, authConfig, paymentConfig, aiConfig],
      validationSchema,
      validationOptions: { abortEarly: false },
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
    AiKnowledgeBaseModule,
    AiSettingsModule,
    SavedDocumentsModule,
    ProfileModule,
    CommonModule,
    CompetitionModule,
    DocumentImportModule,
    AdminModule,
    TeachersModule,
    SupportModule,
    MistakesModule,
    CoinsModule,
    LiveModule,
    ZoomModule,
    HealthModule,
    ManualPaymentModule,
    EssayEvaluationModule,
    SocialLinksModule,
    UiSettingsModule,
    GradeScheduleModule,
    GamesModule,
    CertificatesModule,
    ReferralModule,
    MailModule,
    SchedulerModule,
    PageStatusModule,
  ],
  providers: [
    BootstrapService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
