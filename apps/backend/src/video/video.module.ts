import { Module } from "@nestjs/common";
import { VideoController } from "./video.controller";
import { VideoService } from "./video.service";

@Module({
  controllers: [VideoController],
  providers: [VideoService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class VideoModule {}
