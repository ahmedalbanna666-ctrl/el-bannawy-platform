import { Module } from "@nestjs/common";
import { CurriculumController } from "./curriculum.controller";
import { CurriculumService } from "./curriculum.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  controllers: [CurriculumController],
  providers: [CurriculumService, RolesGuard],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CurriculumModule {}
