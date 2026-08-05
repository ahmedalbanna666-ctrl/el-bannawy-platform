import { Module } from "@nestjs/common";
import { ZoomService } from "./zoom.service";
import { ZoomOAuthController } from "./zoom-oauth.controller";

@Module({
  controllers: [ZoomOAuthController],
  providers: [ZoomService],
  exports: [ZoomService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS module container
export class ZoomModule {}
