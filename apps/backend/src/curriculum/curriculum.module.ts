import { Module } from "@nestjs/common";
import { CurriculumController } from "./curriculum.controller";
import { CurriculumService } from "./curriculum.service";

@Module({
  controllers: [CurriculumController],
  providers: [CurriculumService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CurriculumModule {}
