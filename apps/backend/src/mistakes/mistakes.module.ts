import { Module } from "@nestjs/common";
import { MistakesController } from "./mistakes.controller";
import { MistakesService } from "./mistakes.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [MistakesController],
  providers: [MistakesService],
  exports: [MistakesService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MistakesModule {}
