import { Module } from "@nestjs/common";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

@Module({
  controllers: [ProfileController],
  providers: [ProfileService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ProfileModule {}
