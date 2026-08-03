import { Module } from "@nestjs/common";
import { HomeController } from "./home.controller";
import { HomeService } from "./home.service";
import { HomeRepository } from "./home.repository";

@Module({
  controllers: [HomeController],
  providers: [HomeService, HomeRepository],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HomeModule {}

