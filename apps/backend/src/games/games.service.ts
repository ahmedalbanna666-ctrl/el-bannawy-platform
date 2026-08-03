import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const SETTINGS_KEY = "game_settings";

export interface ListeningChallengeSettings {
  enabled: boolean;
  replayLimit: number;
  questionsPerRound: number;
}

export interface PronunciationChallengeSettings {
  enabled: boolean;
  threshold: number;
  xpReward: number;
  coinReward: number;
  questionsPerRound: number;
}

export interface MemoryGameSettings {
  enabled: boolean;
  wordsPerRound: number;
}

export interface GameSettingsStore {
  listeningChallenge: ListeningChallengeSettings;
  pronunciationChallenge: PronunciationChallengeSettings;
  memoryGame: MemoryGameSettings;
}

export const DEFAULT_GAME_SETTINGS: GameSettingsStore = {
  listeningChallenge: {
    enabled: true,
    replayLimit: 3,
    questionsPerRound: 10,
  },
  pronunciationChallenge: {
    enabled: true,
    threshold: 90,
    xpReward: 5,
    coinReward: 2,
    questionsPerRound: 10,
  },
  memoryGame: {
    enabled: true,
    wordsPerRound: 12,
  },
};

function normalize(raw: unknown): GameSettingsStore {
  const source = (
    typeof raw === "object" && raw !== null ? raw : {}
  ) as Partial<GameSettingsStore>;
  const lc = (source.listeningChallenge ?? {}) as Partial<ListeningChallengeSettings>;
  const pc = (source.pronunciationChallenge ?? {}) as Partial<PronunciationChallengeSettings>;
  const mg = (source.memoryGame ?? {}) as Partial<MemoryGameSettings>;
  const defaults = DEFAULT_GAME_SETTINGS;

  return {
    listeningChallenge: {
      enabled: typeof lc.enabled === "boolean" ? lc.enabled : defaults.listeningChallenge.enabled,
      replayLimit:
        typeof lc.replayLimit === "number" ? lc.replayLimit : defaults.listeningChallenge.replayLimit,
      questionsPerRound:
        typeof lc.questionsPerRound === "number"
          ? lc.questionsPerRound
          : defaults.listeningChallenge.questionsPerRound,
    },
    pronunciationChallenge: {
      enabled:
        typeof pc.enabled === "boolean" ? pc.enabled : defaults.pronunciationChallenge.enabled,
      threshold:
        typeof pc.threshold === "number" ? pc.threshold : defaults.pronunciationChallenge.threshold,
      xpReward:
        typeof pc.xpReward === "number" ? pc.xpReward : defaults.pronunciationChallenge.xpReward,
      coinReward:
        typeof pc.coinReward === "number" ? pc.coinReward : defaults.pronunciationChallenge.coinReward,
      questionsPerRound:
        typeof pc.questionsPerRound === "number"
          ? pc.questionsPerRound
          : defaults.pronunciationChallenge.questionsPerRound,
    },
    memoryGame: {
      enabled: typeof mg.enabled === "boolean" ? mg.enabled : defaults.memoryGame.enabled,
      wordsPerRound:
        typeof mg.wordsPerRound === "number"
          ? mg.wordsPerRound
          : defaults.memoryGame.wordsPerRound,
    },
  };
}

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<GameSettingsStore> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });
    if (!row) return DEFAULT_GAME_SETTINGS;
    try {
      return normalize(JSON.parse(row.value) as unknown);
    } catch {
      return DEFAULT_GAME_SETTINGS;
    }
  }

  async updateSettings(dto: {
    listeningChallenge?: Partial<ListeningChallengeSettings>;
    pronunciationChallenge?: Partial<PronunciationChallengeSettings>;
    memoryGame?: Partial<MemoryGameSettings>;
  }): Promise<GameSettingsStore> {
    const current = await this.getSettings();
    const merged = normalize({
      ...current,
      ...dto,
      listeningChallenge: {
        ...current.listeningChallenge,
        ...(dto.listeningChallenge ?? {}),
      },
      pronunciationChallenge: {
        ...current.pronunciationChallenge,
        ...(dto.pronunciationChallenge ?? {}),
      },
      memoryGame: {
        ...current.memoryGame,
        ...(dto.memoryGame ?? {}),
      },
    });
    const value = JSON.stringify(merged);
    await this.prisma.systemSetting.upsert({
      where: { key: SETTINGS_KEY },
      create: { key: SETTINGS_KEY, value },
      update: { value },
    });
    return merged;
  }
}
