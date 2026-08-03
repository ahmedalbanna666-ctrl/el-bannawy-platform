import { Module, Global } from "@nestjs/common";
import { EssayEvaluationService } from "./essay-evaluation.service";

@Global()
@Module({
  providers: [EssayEvaluationService],
  exports: [EssayEvaluationService],
})
export class EssayEvaluationModule {}
