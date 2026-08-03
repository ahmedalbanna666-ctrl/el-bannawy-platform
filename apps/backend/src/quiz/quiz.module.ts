import { Module } from "@nestjs/common";
import { QuizController } from "./quiz.controller";
import { QuizService } from "./quiz.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { QuizRepository } from "./quiz.repository";

@Module({
  controllers: [QuizController],
  providers: [QuizService, RolesGuard, QuizRepository],
  exports: [QuizService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class QuizModule {}

