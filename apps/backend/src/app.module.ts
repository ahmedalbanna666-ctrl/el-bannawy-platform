import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { HomeModule } from "./home/home.module";

@Module({
  imports: [PrismaModule, AuthModule, HomeModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
