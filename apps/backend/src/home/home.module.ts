import { Module } from "@nestjs/common";
import { HomeController } from "./home.controller";
import { HomeService } from "./home.service";

@Module({
  controllers: [HomeController],
  providers: [HomeService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HomeModule {}
