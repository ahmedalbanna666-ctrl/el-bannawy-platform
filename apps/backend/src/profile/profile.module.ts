import { Module } from "@nestjs/common";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { ProfileRepository } from "./profile.repository";

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, ProfileRepository],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ProfileModule {}

