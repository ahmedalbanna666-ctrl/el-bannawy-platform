import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import {
  successResponse,
  type ISuccessResponse,
} from "../common/helpers/response.helper";
import {
  GamesService,
  type GameSettingsStore,
  type ListeningChallengeSettings,
  type MemoryGameSettings,
  type PronunciationChallengeSettings,
} from "./games.service";

@Controller("games")
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get("settings")
  @UseGuards(JwtAuthGuard)
  async getSettings(): Promise<ISuccessResponse<GameSettingsStore>> {
    return successResponse(await this.gamesService.getSettings(), "OK");
  }

  @Patch("settings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMINISTRATOR")
  async updateSettings(
    @Body()
    dto: {
      listeningChallenge?: Partial<ListeningChallengeSettings>;
      pronunciationChallenge?: Partial<PronunciationChallengeSettings>;
      memoryGame?: Partial<MemoryGameSettings>;
    },
  ): Promise<ISuccessResponse<GameSettingsStore>> {
    return successResponse(
      await this.gamesService.updateSettings(dto),
      "Game settings updated",
    );
  }
}
