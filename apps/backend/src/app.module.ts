import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { HomeModule } from "./home/home.module";
import { CurriculumModule } from "./curriculum/curriculum.module";
import { LessonModule } from "./lesson/lesson.module";
import { VideoModule } from "./video/video.module";
import { ActivityModule } from "./activity/activity.module";

@Module({
  imports: [PrismaModule, AuthModule, HomeModule, CurriculumModule, LessonModule, VideoModule, ActivityModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
