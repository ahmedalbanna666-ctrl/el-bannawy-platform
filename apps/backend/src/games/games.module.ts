import { Module } from "@nestjs/common";
import { GamesController } from "./games.controller";
import { GamesService } from "./games.service";

@Module({
  controllers: [GamesController],
  providers: [GamesService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GamesModule {}
